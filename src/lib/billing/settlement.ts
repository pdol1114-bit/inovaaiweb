import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SNIFF_PREMIUM_MONTHLY_PRICE, SNIFF_PREMIUM_PLAN } from "@/lib/billing/constants";
import { addBillingMonths, nextBillingDateAfter } from "@/lib/billing/period";
import {
    deleteBillingKey,
    findPayment,
    getBillingKeyCardInfo,
    type CardInfo,
    type ChargeRequestResult,
    type Payment,
} from "@/lib/portone/server";

/**
 * pending 결제 확정 공통 로직. 첫 결제 요청 경로(register-key)와 웹훅 경로가 함께 쓴다.
 *
 * - 결제 상태는 항상 포트원 결제 조회 결과로 정한다 (요청 응답·웹훅 본문을 믿지 않음).
 * - 일시 오류(포트원 조회 실패, DB 쓰기 실패)는 throw 한다. 요청 경로는 이를 잡아
 *   '확인 중'(202)으로, 웹훅 경로는 500 으로 바꿔 포트원 재전송을 유도한다.
 * - 모든 갱신은 기존 상태 조건(.eq("status", "pending") 등)을 걸어 멱등이다. 요청 경로와
 *   웹훅이 같은 결제를 동시에 확정해도 결과가 같다.
 */

export type SettleOutcome =
    | { kind: "paid"; nextBillingDate: string }
    | { kind: "failed" }
    | { kind: "pending" }
    | { kind: "needs_review"; reason: string };

export type SettleContext = {
    userId: string;
    paymentId: string;
    /** 이번 요청이 결제에 쓴 빌링키. 없으면 결제 조회 결과에서 얻는다. */
    billingKey?: string;
    card?: CardInfo;
    requestResult?: ChargeRequestResult;
    /** 결제 건이 포트원에 없을 때 실패로 확정해도 되는지 (5분 넘은 pending 정리). */
    isStale: boolean;
    /** 이미 조회한 결제가 있으면 다시 조회하지 않는다 (웹훅 경로). */
    payment?: Payment | null;
    /**
     * 정기 청구(kind=recurring) 건. 확정 시 기준일(started_at)은 유지하고 next_billing_date 만
     * 다음 회차로 넘긴다. 없으면 첫 결제로 보고 구독을 새로 활성화한다.
     */
    recurring?: { subscriptionId: string; periodStart: string };
};

export async function resolvePendingPayment(
    admin: SupabaseClient,
    ctx: SettleContext
): Promise<SettleOutcome> {
    const payment = ctx.payment !== undefined ? ctx.payment : await findPayment(ctx.paymentId);

    if (payment === null) {
        // 포트원에 결제 건이 없다. 요청이 명시적으로 거절됐거나, 5분이 지났다면 실패로 확정.
        // 방금 보낸 요청의 결과가 불명이면 아직 처리 중일 수 있어 pending 으로 둔다.
        if (ctx.requestResult?.kind === "rejected" || ctx.isStale) {
            const reason =
                ctx.requestResult && ctx.requestResult.kind !== "accepted"
                    ? ctx.requestResult.reason
                    : "PAYMENT_NOT_FOUND";
            await markFinished(admin, ctx, "failed", reason);
            if (ctx.billingKey && !ctx.recurring) await deleteOrphanKey(admin, ctx.userId, ctx.billingKey);
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
                const reason = `PAID_VERIFICATION_MISMATCH amount=${amountOk} currency=${currencyOk} key=${keyOk} customer=${customerOk}`;
                console.error("[billing/settle] manual review needed", ctx.paymentId, reason);
                return { kind: "needs_review", reason };
            }
            const nextBillingDate = ctx.recurring
                ? await advanceRecurringSubscription(admin, {
                      userId: ctx.userId,
                      paymentId: ctx.paymentId,
                      subscriptionId: ctx.recurring.subscriptionId,
                      periodStart: ctx.recurring.periodStart,
                      paidAt: new Date(payment.paidAt),
                  })
                : await activateSubscription(admin, {
                      userId: ctx.userId,
                      paymentId: ctx.paymentId,
                      billingKey: billingKey!,
                      paidAt: new Date(payment.paidAt),
                      card: ctx.card,
                  });
            return { kind: "paid", nextBillingDate };
        }
        case "FAILED": {
            const f = payment.failure;
            const reason =
                [f?.pgCode, f?.pgMessage ?? f?.reason].filter(Boolean).join(": ").slice(0, 500) ||
                "PAYMENT_FAILED";
            await markFinished(admin, ctx, "failed", reason);
            // 정기 청구 실패는 구독의 현재 빌링키로 재시도하므로 지우지 않는다.
            if (billingKey && !ctx.recurring) await deleteOrphanKey(admin, ctx.userId, billingKey);
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
            if (billingKey && !ctx.recurring) await deleteOrphanKey(admin, ctx.userId, billingKey);
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
 * 정리 경로·웹훅 재전송이 이 함수를 다시 호출한다. 반대 순서면 paid 인데 구독이 없는
 * 상태가 복구되지 않는다.
 */
async function activateSubscription(
    admin: SupabaseClient,
    p: { userId: string; paymentId: string; billingKey: string; paidAt: Date; card?: CardInfo }
): Promise<string> {
    const { data: previous, error: previousError } = await admin
        .from("web_subscriptions")
        .select("billing_key")
        .eq("user_id", p.userId)
        .maybeSingle();
    if (previousError) throw new Error(`[billing/settle] failed to read subscription: ${previousError.message}`);
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
                // 미납(past_due) 중 재구독한 경우 재시도 상태를 지운다. 미납 회차는 청구하지 않는다.
                failed_attempts: 0,
                next_retry_at: null,
                grace_ends_at: null,
                card_brand: card.brand,
                card_number_masked: card.numberMasked,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        )
        .select("id")
        .single();
    if (upsertError || !subscription) {
        throw new Error(`[billing/settle] failed to activate subscription: ${upsertError?.message}`);
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
        // 구독은 이미 활성. 결제 행이 pending 으로 남으면 재시도 경로가 같은 값으로 다시 반영한다.
        throw new Error(`[billing/settle] subscription active but payment row not marked paid: ${paymentError.message}`);
    }

    if (previousKey && previousKey !== p.billingKey) {
        await deleteKeySafely(previousKey, "결제수단 교체");
    }

    return nextBillingDate;
}

/**
 * 정기 청구 확정. 기준일(started_at)은 유지하고 next_billing_date 를 다음 회차로 넘긴다.
 * 재시도(past_due) 중 성공해도 재시도한 날이 아니라 기준일 기준으로 계산한다.
 *
 * 구독 갱신 조건: next_billing_date = 이번 회차 결제일(periodStart), status ∈ (active, past_due).
 * 같은 결제로 다시 호출되면 이미 넘어간 구독은 조건에 걸리지 않아 회차가 두 번 넘어가지 않는다.
 * 순서: 구독 → 결제 행 (activateSubscription 과 같은 이유).
 */
async function advanceRecurringSubscription(
    admin: SupabaseClient,
    p: { userId: string; paymentId: string; subscriptionId: string; periodStart: string; paidAt: Date }
): Promise<string> {
    const { data: sub, error: readError } = await admin
        .from("web_subscriptions")
        .select("started_at")
        .eq("id", p.subscriptionId)
        .eq("user_id", p.userId)
        .maybeSingle();
    if (readError) throw new Error(`[billing/settle] failed to read subscription: ${readError.message}`);
    if (!sub?.started_at) throw new Error("[billing/settle] recurring payment without subscription anchor");

    const nextBillingDate = nextBillingDateAfter(
        new Date(sub.started_at as string),
        new Date(p.periodStart)
    ).toISOString();

    const { data: advanced, error: subError } = await admin
        .from("web_subscriptions")
        .update({
            status: "active",
            next_billing_date: nextBillingDate,
            failed_attempts: 0,
            next_retry_at: null,
            grace_ends_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", p.subscriptionId)
        .eq("user_id", p.userId)
        .eq("next_billing_date", p.periodStart)
        .in("status", ["active", "past_due"])
        .select("id");
    if (subError) throw new Error(`[billing/settle] failed to advance subscription: ${subError.message}`);
    if (!advanced || advanced.length === 0) {
        // 이미 같은 값으로 넘어간 재호출이면 정상. 그 밖(해지·재구독과 경합)은 출금됐는데 구독이
        // 넘어가지 않은 상태라 수동 확인이 필요하다.
        const { data: current } = await admin
            .from("web_subscriptions")
            .select("status, next_billing_date")
            .eq("id", p.subscriptionId)
            .maybeSingle();
        const alreadyAdvanced =
            current?.status === "active" &&
            current.next_billing_date &&
            new Date(current.next_billing_date as string).getTime() === new Date(nextBillingDate).getTime();
        if (!alreadyAdvanced) {
            console.error("[billing/settle] needs_review: recurring PAID but subscription not advanceable", {
                paymentId: p.paymentId,
                subscriptionId: p.subscriptionId,
                status: current?.status ?? null,
            });
        }
    }

    const { error: paymentError } = await admin
        .from("web_payments")
        .update({
            status: "paid",
            paid_at: p.paidAt.toISOString(),
            period_end: nextBillingDate,
            failure_reason: null,
        })
        .eq("payment_id", p.paymentId)
        .eq("user_id", p.userId)
        .eq("status", "pending");
    if (paymentError) throw new Error(`[billing/settle] recurring payment row not marked paid: ${paymentError.message}`);

    return nextBillingDate;
}

async function markFinished(
    admin: SupabaseClient,
    ctx: { userId: string; paymentId: string },
    status: "failed" | "cancelled" | "partial_cancelled",
    reason: string
) {
    const { error } = await admin
        .from("web_payments")
        .update({ status, failure_reason: reason.slice(0, 500) })
        .eq("payment_id", ctx.paymentId)
        .eq("user_id", ctx.userId)
        .eq("status", "pending");
    if (error) throw new Error(`[billing/settle] failed to mark payment ${status}: ${error.message}`);
}

/** 실패한 결제의 새 빌링키 삭제. 현재 구독이 쓰는 키면 지우지 않는다. */
export async function deleteOrphanKey(admin: SupabaseClient, userId: string, billingKey: string) {
    const { data, error } = await admin
        .from("web_subscriptions")
        .select("billing_key")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        console.error("[billing/settle] could not check subscription key; skipping deletion", error.message);
        return;
    }
    if (data?.billing_key === billingKey) return;
    await deleteKeySafely(billingKey, "첫 결제 실패");
}

export async function deleteKeySafely(billingKey: string, reason: string) {
    try {
        await deleteBillingKey(billingKey, reason);
    } catch (e) {
        console.error("[billing/settle] billing key deletion failed", reason, e);
    }
}
