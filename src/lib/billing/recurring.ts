import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { SNIFF_PREMIUM_MONTHLY_PRICE, SNIFF_PREMIUM_ORDER_NAME } from "@/lib/billing/constants";
import { kstEndOfDay, kstStartOfDay } from "@/lib/billing/period";
import { resolvePendingPayment } from "@/lib/billing/settlement";
import { processPaymentWebhook } from "@/lib/billing/webhook";
import { settleIfExpired, type Subscription } from "@/lib/subscription";
import { deleteBillingKey, findPayment, requestBillingKeyCharge } from "@/lib/portone/server";

/**
 * 일일 정기결제 배치 (POST /api/cron/billing, 매일 KST 10~14시 매시 실행).
 *
 * 순서: a 대사 → b 만료 정리 → c 정기 청구 → d 재시도 → e 최종 실패
 *
 * 이중 청구 방지
 *  1) (subscription_id, period_start) 부분 unique — 같은 회차 pending/paid 는 1건
 *  2) 사용자 pending 잠금 (0007) — register-key 재구독과 배치가 동시에 결제하지 않음
 *  3) 시도별 고정 paymentId ("spr" + hex 32)
 *  4) 잠금 후 구독 재확인 + 구독 갱신 조건(next_billing_date = 회차 결제일, failed_attempts 기대값)
 * 배치가 겹쳐 실행돼도 같은 회차를 두 번 청구하지 않는다.
 *
 * 미납 일정 (D = 회차 결제일의 KST 날짜)
 *  D 실패 → past_due, 재시도 D+1 00:00 / D+1 실패 → 재시도 D+3 00:00 / D+3 실패 → canceled
 *  유예 종료 D+3 23:59:59. 재시도 성공 시 started_at 기준 다음 회차로 (settlement).
 */

const RECONCILE_WINDOW_MS = 35 * 24 * 60 * 60 * 1000;
const STALE_PENDING_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3; // 1차 + 재시도 2회
const BATCH_LIMIT = 200;
const PG_UNIQUE_VIOLATION = "23505";

export function newRecurringPaymentId(): string {
    return `spr${randomUUID().replace(/-/g, "")}`;
}

type Step = "reconcile" | "expire" | "charge" | "retry" | "final";
export type BatchSummary = {
    startedAt: string;
    finishedAt: string;
    truncated: boolean;
    counts: Record<string, number>;
    details: { step: Step; id: string; result: string }[];
};

type SubRow = Pick<
    Subscription,
    "id" | "user_id" | "status" | "next_billing_date" | "failed_attempts" | "billing_key" | "grace_ends_at"
>;
const SUB_COLUMNS = "id, user_id, status, next_billing_date, failed_attempts, billing_key, grace_ends_at";

export async function runBillingBatch(options: { budgetMs: number }): Promise<BatchSummary> {
    const started = Date.now();
    const deadline = started + options.budgetMs;
    const timeUp = () => Date.now() > deadline;
    const admin = createAdminClient();

    const summary: BatchSummary = {
        startedAt: new Date(started).toISOString(),
        finishedAt: "",
        truncated: false,
        counts: {},
        details: [],
    };
    const record = (step: Step, id: string, result: string) => {
        const key = `${step}.${result}`;
        summary.counts[key] = (summary.counts[key] ?? 0) + 1;
        summary.details.push({ step, id, result });
    };

    // a) 대사: 최근 35일 paid + 5분 넘은 pending → 웹훅과 같은 처리기로 반영
    const now = new Date();
    const [paid, pending] = await Promise.all([
        admin
            .from("web_payments")
            .select("payment_id")
            .eq("status", "paid")
            .gte("paid_at", new Date(now.getTime() - RECONCILE_WINDOW_MS).toISOString())
            .order("paid_at", { ascending: true })
            .limit(1000),
        admin
            .from("web_payments")
            .select("payment_id")
            .eq("status", "pending")
            .lt("created_at", new Date(now.getTime() - STALE_PENDING_MS).toISOString())
            .limit(BATCH_LIMIT),
    ]);
    if (paid.error) throw new Error(`[cron/billing] reconcile query failed: ${paid.error.message}`);
    if (pending.error) throw new Error(`[cron/billing] reconcile query failed: ${pending.error.message}`);
    for (const row of [...(pending.data ?? []), ...(paid.data ?? [])]) {
        if (timeUp()) { summary.truncated = true; break; }
        try {
            const outcome = await processPaymentWebhook(admin, row.payment_id as string);
            // 변화 없는 paid 재조회(ALREADY_PAID)는 건수만 센다
            if (outcome.detail === "ALREADY_PAID") {
                summary.counts["reconcile.unchanged"] = (summary.counts["reconcile.unchanged"] ?? 0) + 1;
            } else {
                record("reconcile", row.payment_id as string, `${outcome.result}:${outcome.detail}`);
            }
        } catch (e) {
            console.error("[cron/billing] reconcile failed", row.payment_id, e);
            record("reconcile", row.payment_id as string, "error");
        }
    }

    // b) 만료 정리: 종료일 지난 해지 예약 → canceled + 빌링키 삭제
    if (!timeUp()) {
        const { data, error } = await admin
            .from("web_subscriptions")
            .select(
                "id, user_id, billing_key, plan, status, next_billing_date, service_end_date, canceled_at, started_at, card_brand, card_number_masked, failed_attempts, next_retry_at, grace_ends_at"
            )
            .eq("status", "cancel_scheduled")
            .lt("service_end_date", new Date().toISOString())
            .limit(BATCH_LIMIT);
        if (error) throw new Error(`[cron/billing] expire query failed: ${error.message}`);
        for (const sub of (data ?? []) as Subscription[]) {
            if (timeUp()) { summary.truncated = true; break; }
            const settled = await settleIfExpired(sub, sub.user_id);
            record("expire", sub.id, settled.status);
        }
    }

    // c) 정기 청구: 결제일의 KST 날짜가 오늘 이하인 active 구독
    if (!timeUp()) {
        const cutoff = kstStartOfDay(new Date(), 1).toISOString();
        const { data, error } = await admin
            .from("web_subscriptions")
            .select(SUB_COLUMNS)
            .eq("status", "active")
            .lt("next_billing_date", cutoff)
            .order("next_billing_date", { ascending: true })
            .limit(BATCH_LIMIT);
        if (error) throw new Error(`[cron/billing] charge query failed: ${error.message}`);
        for (const sub of (data ?? []) as SubRow[]) {
            if (timeUp()) { summary.truncated = true; break; }
            record("charge", sub.id, await chargeCycle(admin, sub));
        }
    }

    // d) 재시도: 재시도 시각이 됐고 유예가 남은 past_due
    if (!timeUp()) {
        const nowIso = new Date().toISOString();
        const { data, error } = await admin
            .from("web_subscriptions")
            .select(SUB_COLUMNS)
            .eq("status", "past_due")
            .lte("next_retry_at", nowIso)
            .gt("grace_ends_at", nowIso)
            .order("next_retry_at", { ascending: true })
            .limit(BATCH_LIMIT);
        if (error) throw new Error(`[cron/billing] retry query failed: ${error.message}`);
        for (const sub of (data ?? []) as SubRow[]) {
            if (timeUp()) { summary.truncated = true; break; }
            record("retry", sub.id, await chargeCycle(admin, sub));
        }
    }

    // e) 최종 실패: 유예가 끝난 past_due (재시도를 놓친 경우 포함)
    if (!timeUp()) {
        const { data, error } = await admin
            .from("web_subscriptions")
            .select(SUB_COLUMNS)
            .eq("status", "past_due")
            .lte("grace_ends_at", new Date().toISOString())
            .limit(BATCH_LIMIT);
        if (error) throw new Error(`[cron/billing] final query failed: ${error.message}`);
        for (const sub of (data ?? []) as SubRow[]) {
            if (timeUp()) { summary.truncated = true; break; }
            record("final", sub.id, await cancelForNonPayment(admin, sub, "GRACE_EXPIRED"));
        }
    }

    summary.finishedAt = new Date().toISOString();
    return summary;
}

// ---------------------------------------------------------------------------

/** 한 회차 청구 (정기 청구·재시도 공통). 반환값은 결과 라벨. */
async function chargeCycle(admin: SupabaseClient, sub: SubRow): Promise<string> {
    const due = sub.next_billing_date;
    if (!due) return "skipped_no_due_date";

    if (!sub.billing_key) {
        // 빌링키 없는 청구 대상은 결제할 수 없으므로 실패로 처리해 미납 일정을 탄다.
        console.error("[cron/billing] subscription has no billing key", sub.id);
        return applyChargeFailure(admin, sub);
    }

    // 1) 청구 전 재조회: 직전 paid 결제가 포트원에서 취소됐으면 청구하지 않고 구독 정리
    try {
        const { data: last, error } = await admin
            .from("web_payments")
            .select("payment_id")
            .eq("subscription_id", sub.id)
            .in("status", ["paid", "partial_cancelled"])
            .order("period_start", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (last) {
            const payment = await findPayment(last.payment_id as string);
            if (payment?.status === "CANCELLED") {
                const outcome = await processPaymentWebhook(admin, last.payment_id as string);
                return `skipped_last_payment_cancelled:${outcome.detail}`;
            }
        }
    } catch (e) {
        console.error("[cron/billing] pre-charge recheck failed; skipping", sub.id, e);
        return "error_precheck";
    }

    // 2) 회차 잠금 (pending 행)
    const paymentId = newRecurringPaymentId();
    const { error: lockError } = await admin.from("web_payments").insert({
        payment_id: paymentId,
        user_id: sub.user_id,
        subscription_id: sub.id,
        kind: "recurring",
        amount: SNIFF_PREMIUM_MONTHLY_PRICE,
        currency: "KRW",
        status: "pending",
        period_start: due,
    });
    if (lockError) {
        if (lockError.code === PG_UNIQUE_VIOLATION) return "skipped_locked";
        console.error("[cron/billing] failed to create pending payment", sub.id, lockError.message);
        return "error_lock";
    }

    // 3) 잠금 후 재확인: 그 사이 재구독·해지·다른 배치가 구독을 바꿨으면 중단
    const { data: current, error: recheckError } = await admin
        .from("web_subscriptions")
        .select(SUB_COLUMNS)
        .eq("id", sub.id)
        .maybeSingle();
    const unchanged =
        !recheckError &&
        current &&
        current.status === sub.status &&
        current.failed_attempts === sub.failed_attempts &&
        current.billing_key === sub.billing_key &&
        !!current.next_billing_date &&
        new Date(current.next_billing_date as string).getTime() === new Date(due).getTime();
    if (!unchanged) {
        await admin.from("web_payments").delete().eq("payment_id", paymentId).eq("status", "pending");
        return recheckError ? "error_recheck" : "skipped_changed";
    }

    // 4) 청구
    let email: string | undefined;
    try {
        email = (await admin.auth.admin.getUserById(sub.user_id)).data.user?.email ?? undefined;
    } catch {
        email = undefined;
    }
    const requestResult = await requestBillingKeyCharge({
        paymentId,
        billingKey: sub.billing_key,
        orderName: SNIFF_PREMIUM_ORDER_NAME,
        amount: SNIFF_PREMIUM_MONTHLY_PRICE,
        customer: { id: sub.user_id, email },
    });

    // 5) 결제 조회로 확정
    let outcome;
    try {
        outcome = await resolvePendingPayment(admin, {
            userId: sub.user_id,
            paymentId,
            billingKey: sub.billing_key,
            requestResult,
            isStale: false,
            recurring: { subscriptionId: sub.id, periodStart: due },
        });
    } catch (e) {
        // pending 으로 남는다 → 다음 실행의 대사가 확정한다.
        console.error("[cron/billing] settle failed; left pending", paymentId, e);
        return "pending";
    }

    if (outcome.kind === "paid") return "paid";
    if (outcome.kind === "failed") return applyChargeFailure(admin, sub);
    return outcome.kind === "needs_review" ? "needs_review" : "pending";
}

/** 청구 실패 반영: past_due 로 전환하고 다음 재시도를 잡거나, 마지막이면 종료. */
async function applyChargeFailure(admin: SupabaseClient, sub: SubRow): Promise<string> {
    const attempts = sub.failed_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) return cancelForNonPayment(admin, sub, "PAYMENT_FAILED_FINAL");

    const due = new Date(sub.next_billing_date!);
    const scheduled = kstStartOfDay(due, attempts === 1 ? 1 : 3);
    // 배치가 늦게 돈 경우에도 재시도는 최소 다음 날로 (같은 날 반복 청구 방지)
    const notBefore = kstStartOfDay(new Date(), 1);
    const nextRetryAt = new Date(Math.max(scheduled.getTime(), notBefore.getTime())).toISOString();
    const graceEndsAt = kstEndOfDay(due, 3).toISOString();

    const { data, error } = await admin
        .from("web_subscriptions")
        .update({
            status: "past_due",
            failed_attempts: attempts,
            next_retry_at: nextRetryAt,
            grace_ends_at: graceEndsAt,
            updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id)
        .eq("user_id", sub.user_id)
        .eq("failed_attempts", sub.failed_attempts)
        .eq("next_billing_date", sub.next_billing_date!)
        .in("status", ["active", "past_due"])
        .select("id");
    if (error) {
        console.error("[cron/billing] failed to mark past_due", sub.id, error.message);
        return "error_past_due";
    }
    if (!data || data.length === 0) return "skipped_changed";
    return `past_due_${attempts}`;
}

/** 미납 최종 종료: 빌링키 삭제 → canceled → 안내 대기열 기록 (메일 실패가 처리를 막지 않음). */
async function cancelForNonPayment(admin: SupabaseClient, sub: SubRow, reason: string): Promise<string> {
    if (sub.billing_key) {
        try {
            await deleteBillingKey(sub.billing_key, "미납 구독 종료");
        } catch (e) {
            // 상태를 바꾸지 않는다 → 다음 실행에서 다시 시도
            console.error("[cron/billing] billing key deletion failed; will retry", sub.id, e);
            return "error_key_delete";
        }
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
        .from("web_subscriptions")
        .update({
            status: "canceled",
            canceled_at: now,
            service_end_date: now,
            next_billing_date: null,
            next_retry_at: null,
            billing_key: null,
            updated_at: now,
        })
        .eq("id", sub.id)
        .eq("user_id", sub.user_id)
        .in("status", ["active", "past_due"])
        .select("id");
    if (error) {
        console.error("[cron/billing] failed to cancel for non-payment", sub.id, error.message);
        return "error_cancel";
    }
    if (!data || data.length === 0) return "skipped_changed";

    try {
        const { error: notifyError } = await admin.from("web_notifications").insert({
            user_id: sub.user_id,
            kind: "subscription_canceled_nonpayment",
            payload: { subscription_id: sub.id, reason, due_date: sub.next_billing_date },
        });
        if (notifyError) console.error("[cron/billing] failed to queue notification", sub.id, notifyError.message);
    } catch (e) {
        console.error("[cron/billing] failed to queue notification", sub.id, e);
    }

    return `canceled_${reason}`;
}
