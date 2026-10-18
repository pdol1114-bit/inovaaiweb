import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    SNIFF_PREMIUM_MONTHLY_PRICE,
    SNIFF_PREMIUM_ORDER_NAME,
    SNIFF_PREMIUM_PLAN,
} from "@/lib/billing/constants";
import { addBillingMonths } from "@/lib/billing/period";
import {
    deleteBillingKey,
    findPayment,
    getBillingKeyCardInfo,
    requestBillingKeyCharge,
    verifyIssuedBillingKey,
    type CardInfo,
    type ChargeRequestResult,
    type Payment,
} from "@/lib/portone/server";

/**
 * 카드 등록 직후 첫 결제(즉시 청구).
 *
 * 흐름: 빌링키 검증 → pending 행 insert(사용자 잠금) → 구독 상태 재확인 →
 *       빌링키 결제 → 결제 조회로 확정 → paid 면 구독 활성화 / failed 면 정리.
 *
 * 이중 청구 방지 (3겹)
 *  1) 0007 의 부분 unique(user_id where status='pending') — 동시 요청 중 하나만 진행
 *  2) 잠금을 잡은 뒤 구독 상태를 재확인 — 먼저 끝난 요청이 이미 활성화했으면 중단
 *  3) 시도별 고정 paymentId — 같은 ID 재요청은 포트원이 ALREADY_PAID 로 거절
 *
 * 쓰기는 모두 서버 권한 클라이언트로 하며 user_id 는 세션에서 얻은 값만 쓴다.
 */

const STALE_PENDING_MS = 5 * 60 * 1000;
const PG_UNIQUE_VIOLATION = "23505";

/**
 * 첫 결제 paymentId: "spi" + 하이픈 없는 UUID v4 (35자, 영숫자만).
 * KCP 는 paymentId 최대 40자, 한글·특수문자 미지원이라 밑줄·하이픈을 쓰지 않는다.
 * 시도마다 새로 만들고 결제 호출 전에 DB 에 먼저 저장한다.
 */
export function newInitialPaymentId(): string {
    return `spi${randomUUID().replace(/-/g, "")}`;
}

export type InitialChargeResult =
    | { status: "paid"; nextBillingDate: string }
    | { status: "processing" }
    | { status: "failed" }
    | { status: "invalid_billing_key"; reason: "NOT_FOUND" | "NOT_ISSUED" | "CUSTOMER_MISMATCH" }
    | { status: "conflict"; reason: "ALREADY_SUBSCRIBED" | "CANCEL_SCHEDULED" | "IN_PROGRESS" };

type Outcome =
    | { kind: "paid"; nextBillingDate: string }
    | { kind: "failed" }
    | { kind: "pending" };

type SettleContext = {
    userId: string;
    paymentId: string;
    /** 이번 요청이 결제에 쓴 빌링키. 오래된 pending 정리 시에는 결제 조회 결과에서 얻는다. */
    billingKey?: string;
    card?: CardInfo;
    requestResult?: ChargeRequestResult;
    /** 5분 넘은 pending 정리인지. 결제 건이 없으면 실패로 확정할 수 있다. */
    isStale: boolean;
};

export async function chargeInitialSubscription(params: {
    user: User;
    billingKey: string;
}): Promise<InitialChargeResult> {
    const { user, billingKey } = params;

    // 1) 빌링키 검증: 발급 완료 + 고객 ID = 세션 사용자
    const verification = await verifyIssuedBillingKey(billingKey, user.id);
    if (!verification.ok) {
        return { status: "invalid_billing_key", reason: verification.reason };
    }

    // 2~3) 결제 호출 전 단계. 여기서 예외가 나면 결제는 일어나지 않았으므로
    //      잡은 잠금을 풀고, 검증까지 끝난 새 빌링키를 삭제한 뒤 다시 던진다.
    //      (IN_PROGRESS 는 예외가 아니라 반환값이라 삭제하지 않는다 — 먼저 진행 중인
    //       요청이 같은 빌링키로 결제하고 있을 수 있다.)
    let admin: SupabaseClient | null = null;
    let paymentId: string | null = null;
    try {
        admin = createAdminClient();

        // 2) 사용자 잠금 (pending 행)
        const lock = await acquirePendingLock(admin, user.id);
        if (!lock.ok) return { status: "conflict", reason: "IN_PROGRESS" };
        paymentId = lock.paymentId;

        // 3) 잠금 후 구독 상태 재확인
        const blocking = await findBlockingSubscription(admin, user.id);
        if (blocking) {
            await releaseUnusedLock(admin, user.id, paymentId);
            // 이미 구독 중인 카드와 다른 새 빌링키는 쓸 곳이 없으므로 정리한다.
            if (blocking.billingKey !== billingKey) {
                await deleteKeySafely(billingKey, "중복 카드 등록");
            }
            return { status: "conflict", reason: blocking.reason };
        }
    } catch (e) {
        if (admin && paymentId) await releaseUnusedLock(admin, user.id, paymentId);
        await deleteKeySafely(billingKey, "결제 전 단계 실패");
        throw e;
    }

    // 4) 빌링키 결제
    const requestResult = await requestBillingKeyCharge({
        paymentId,
        billingKey,
        orderName: SNIFF_PREMIUM_ORDER_NAME,
        amount: SNIFF_PREMIUM_MONTHLY_PRICE,
        customer: {
            id: user.id,
            email: user.email ?? undefined,
            fullName: displayName(user),
        },
    });
    if (requestResult.kind !== "accepted") {
        console.warn("[billing/initial] charge request not accepted", {
            paymentId,
            kind: requestResult.kind,
            reason: requestResult.reason,
        });
    }

    // 5) 결제 조회로 확정하고 결과 반영
    const outcome = await settleAttempt(admin, {
        userId: user.id,
        paymentId,
        billingKey,
        card: verification.card,
        requestResult,
        isStale: false,
    });

    if (outcome.kind === "paid") return { status: "paid", nextBillingDate: outcome.nextBillingDate };
    if (outcome.kind === "failed") return { status: "failed" };
    return { status: "processing" };
}

// ---------------------------------------------------------------------------

async function acquirePendingLock(
    admin: SupabaseClient,
    userId: string
): Promise<{ ok: true; paymentId: string } | { ok: false }> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const paymentId = newInitialPaymentId();
        const { error } = await admin.from("web_payments").insert({
            payment_id: paymentId,
            user_id: userId,
            amount: SNIFF_PREMIUM_MONTHLY_PRICE,
            currency: "KRW",
            status: "pending",
        });

        if (!error) return { ok: true, paymentId };
        if (error.code !== PG_UNIQUE_VIOLATION) {
            throw new Error(`[billing/initial] failed to create pending payment: ${error.message}`);
        }

        // 다른 pending 이 있다. 5분이 넘었으면 포트원 조회로 정리한 뒤 한 번 더 시도한다.
        if (attempt > 0) break;
        const { data: existing, error: readError } = await admin
            .from("web_payments")
            .select("payment_id, created_at")
            .eq("user_id", userId)
            .eq("status", "pending")
            .maybeSingle();
        if (readError) throw new Error(`[billing/initial] failed to read pending payment: ${readError.message}`);
        if (!existing) continue; // 그 사이 정리됨

        const age = Date.now() - new Date(existing.created_at as string).getTime();
        if (age < STALE_PENDING_MS) break;

        const outcome = await settleAttempt(admin, {
            userId,
            paymentId: existing.payment_id as string,
            isStale: true,
        });
        if (outcome.kind === "pending") break;
    }
    return { ok: false };
}

/**
 * 결제를 진행하면 안 되는 구독 상태인지.
 * - active
 * - cancel_scheduled 이면서 이용 종료일이 아직 안 지남 (해지취소로 안내)
 * cancel_scheduled 이면서 종료일이 지났으면 만료로 보고 결제를 진행한다.
 */
async function findBlockingSubscription(
    admin: SupabaseClient,
    userId: string
): Promise<{ reason: "ALREADY_SUBSCRIBED" | "CANCEL_SCHEDULED"; billingKey: string | null } | null> {
    const { data, error } = await admin
        .from("web_subscriptions")
        .select("status, service_end_date, billing_key")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw new Error(`[billing/initial] failed to read subscription: ${error.message}`);
    if (!data) return null;

    const billingKey = (data.billing_key as string | null) ?? null;
    if (data.status === "active") return { reason: "ALREADY_SUBSCRIBED", billingKey };
    if (data.status === "cancel_scheduled") {
        const end = data.service_end_date ? new Date(data.service_end_date as string) : null;
        // 종료일이 없으면 판단할 수 없으므로 보수적으로 막는다.
        if (!end || end.getTime() > Date.now()) return { reason: "CANCEL_SCHEDULED", billingKey };
    }
    return null;
}

/** 결제를 호출하지 않은 잠금 행은 결제 기록이 아니므로 지운다. */
async function releaseUnusedLock(admin: SupabaseClient, userId: string, paymentId: string) {
    const { error } = await admin
        .from("web_payments")
        .delete()
        .eq("payment_id", paymentId)
        .eq("user_id", userId)
        .eq("status", "pending");
    if (error) console.error("[billing/initial] failed to release unused lock", paymentId, error);
}

// ---------------------------------------------------------------------------

async function settleAttempt(admin: SupabaseClient, ctx: SettleContext): Promise<Outcome> {
    let payment: Payment | null;
    try {
        payment = await findPayment(ctx.paymentId);
    } catch (e) {
        console.error("[billing/initial] payment lookup failed; leaving pending", ctx.paymentId, e);
        return { kind: "pending" };
    }

    if (payment === null) {
        // 포트원에 결제 건이 없다. 요청이 명시적으로 거절됐거나, 5분이 지났다면 실패로 확정.
        // 방금 보낸 요청의 결과가 불명이면 아직 처리 중일 수 있어 pending 으로 둔다.
        if (ctx.requestResult?.kind === "rejected" || ctx.isStale) {
            const reason =
                ctx.requestResult && ctx.requestResult.kind !== "accepted"
                    ? ctx.requestResult.reason
                    : "PAYMENT_NOT_FOUND";
            await markFinished(admin, ctx, "failed", reason);
            if (ctx.billingKey) await deleteOrphanKey(admin, ctx.userId, ctx.billingKey);
            return { kind: "failed" };
        }
        return { kind: "pending" };
    }

    const billingKey = ctx.billingKey ?? ("billingKey" in payment ? payment.billingKey : undefined);

    switch (payment.status) {
        case "PAID": {
            const amountOk = payment.amount.total === SNIFF_PREMIUM_MONTHLY_PRICE;
            const currencyOk = payment.currency === "KRW";
            const keyOk = !!billingKey && payment.billingKey === billingKey;
            const customerOk = payment.customer?.id === ctx.userId;
            if (!amountOk || !currencyOk || !keyOk || !customerOk) {
                // 출금은 됐는데 기대와 다르다. 자동으로 활성화·실패 처리하지 않고 수동 확인 대상으로 남긴다.
                console.error("[billing/initial] PAID payment failed verification; manual review needed", {
                    paymentId: ctx.paymentId,
                    amountOk,
                    currencyOk,
                    keyOk,
                    customerOk,
                });
                return { kind: "pending" };
            }
            try {
                const nextBillingDate = await activateSubscription(admin, {
                    userId: ctx.userId,
                    paymentId: ctx.paymentId,
                    billingKey: billingKey!,
                    paidAt: new Date(payment.paidAt),
                    card: ctx.card,
                });
                return { kind: "paid", nextBillingDate };
            } catch (e) {
                // 출금은 확정됐는데 DB 반영이 실패했다. 사용자에게 오류 대신 '확인 중'을 보여주고,
                // pending 으로 남은 결제 행은 5분 뒤 정리 경로에서 활성화를 다시 시도한다.
                console.error("[billing/initial] PAID but activation failed; will retry on stale settle", ctx.paymentId, e);
                return { kind: "pending" };
            }
        }
        case "FAILED": {
            const f = payment.failure;
            const reason =
                [f?.pgCode, f?.pgMessage ?? f?.reason].filter(Boolean).join(": ").slice(0, 500) ||
                "PAYMENT_FAILED";
            await markFinished(admin, ctx, "failed", reason);
            if (billingKey) await deleteOrphanKey(admin, ctx.userId, billingKey);
            return { kind: "failed" };
        }
        case "CANCELLED":
        case "PARTIAL_CANCELLED": {
            await markFinished(
                admin,
                ctx,
                payment.status === "CANCELLED" ? "cancelled" : "partial_cancelled",
                `PAYMENT_${payment.status}`
            );
            if (billingKey) await deleteOrphanKey(admin, ctx.userId, billingKey);
            return { kind: "failed" };
        }
        default:
            // READY / PAY_PENDING / 알 수 없는 상태: 아직 확정되지 않음
            return { kind: "pending" };
    }
}

/**
 * 결제 확정 후 구독 활성화. 같은 결제로 다시 호출돼도 결과가 같다(멱등).
 *
 * 순서: 구독 upsert → 결제 행 paid. 중간에 실패하면 결제 행이 pending 으로 남아
 * 5분 뒤 정리 경로가 이 함수를 다시 호출한다. 반대 순서면 paid 인데 구독이 없는
 * 상태가 복구되지 않는다.
 */
async function activateSubscription(
    admin: SupabaseClient,
    p: { userId: string; paymentId: string; billingKey: string; paidAt: Date; card?: CardInfo }
): Promise<string> {
    const { data: previous } = await admin
        .from("web_subscriptions")
        .select("billing_key")
        .eq("user_id", p.userId)
        .maybeSingle();
    const previousKey = (previous?.billing_key as string | null | undefined) ?? null;

    const card = p.card ?? (await getBillingKeyCardInfo(p.billingKey));
    const startedAt = p.paidAt.toISOString();
    const nextBillingDate = addBillingMonths(p.paidAt, 1).toISOString();

    // 재구독 시 이전 구독의 기간 정보가 남지 않도록 생애주기 컬럼을 전부 명시한다.
    const { data: subscription, error: upsertError } = await admin
        .from("web_subscriptions")
        .upsert(
            {
                user_id: p.userId,
                billing_key: p.billingKey,
                plan: SNIFF_PREMIUM_PLAN,
                status: "active",
                started_at: startedAt,
                next_billing_date: nextBillingDate,
                canceled_at: null,
                service_end_date: null,
                card_brand: card.brand,
                card_number_masked: card.numberMasked,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        )
        .select("id")
        .single();
    if (upsertError || !subscription) {
        // 결제 행은 pending 으로 남고 다음 요청의 정리 경로에서 재시도된다.
        throw new Error(`[billing/initial] failed to activate subscription: ${upsertError?.message}`);
    }

    const { error: paymentError } = await admin
        .from("web_payments")
        .update({
            status: "paid",
            paid_at: startedAt,
            period_start: startedAt,
            period_end: nextBillingDate,
            subscription_id: subscription.id,
            failure_reason: null,
        })
        .eq("payment_id", p.paymentId)
        .eq("user_id", p.userId)
        .eq("status", "pending");
    if (paymentError) {
        console.error("[billing/initial] subscription active but payment row not marked paid", p.paymentId, paymentError);
    }

    if (previousKey && previousKey !== p.billingKey) {
        await deleteKeySafely(previousKey, "결제수단 교체");
    }

    return nextBillingDate;
}

async function markFinished(
    admin: SupabaseClient,
    ctx: SettleContext,
    status: "failed" | "cancelled" | "partial_cancelled",
    reason: string
) {
    const { error } = await admin
        .from("web_payments")
        .update({ status, failure_reason: reason.slice(0, 500) })
        .eq("payment_id", ctx.paymentId)
        .eq("user_id", ctx.userId)
        .eq("status", "pending");
    if (error) console.error("[billing/initial] failed to mark payment", status, ctx.paymentId, error);
}

/** 실패한 결제의 새 빌링키 삭제. 현재 구독이 쓰는 키면 지우지 않는다. */
async function deleteOrphanKey(admin: SupabaseClient, userId: string, billingKey: string) {
    const { data } = await admin
        .from("web_subscriptions")
        .select("billing_key")
        .eq("user_id", userId)
        .maybeSingle();
    if (data?.billing_key === billingKey) return;
    await deleteKeySafely(billingKey, "첫 결제 실패");
}

async function deleteKeySafely(billingKey: string, reason: string) {
    try {
        await deleteBillingKey(billingKey, reason);
    } catch (e) {
        console.error("[billing/initial] billing key deletion failed", reason, e);
    }
}

function displayName(user: User): string | undefined {
    const meta = user.user_metadata ?? {};
    const name = meta.full_name ?? meta.name;
    return typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined;
}
