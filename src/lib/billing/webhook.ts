import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteBillingKey, findPayment, type Payment } from "@/lib/portone/server";
import { resolvePendingPayment } from "@/lib/billing/settlement";

/**
 * 포트원 결제 웹훅 처리.
 *
 * 웹훅 본문은 "이 결제를 다시 확인하라"는 신호로만 쓴다. 상태는 항상 포트원 결제
 * 조회 결과와 우리 DB 행 상태의 조합으로 정한다 (이벤트 종류를 그대로 믿지 않음).
 *
 * 일시 오류(DB, 포트원 조회)는 throw 한다 → 라우트가 500 으로 응답해 재전송을 유도한다.
 */

export const HANDLED_WEBHOOK_TYPES = [
    "Transaction.Paid",
    "Transaction.Failed",
    "Transaction.Cancelled",
    "Transaction.PartialCancelled",
] as const;

export type WebhookOutcome = {
    result: "processed" | "ignored" | "needs_review";
    detail: string;
};

type PaymentRow = {
    payment_id: string;
    kind: "initial" | "recurring";
    user_id: string;
    subscription_id: string | null;
    status: "pending" | "paid" | "failed" | "cancelled" | "partial_cancelled";
    period_start: string | null;
    period_end: string | null;
};

export async function processPaymentWebhook(
    admin: SupabaseClient,
    paymentId: string
): Promise<WebhookOutcome> {
    const { data: row, error } = await admin
        .from("web_payments")
        .select("payment_id, kind, user_id, subscription_id, status, period_start, period_end")
        .eq("payment_id", paymentId)
        .maybeSingle();
    if (error) throw new Error(`[webhook] failed to read payment row: ${error.message}`);
    if (!row) return { result: "ignored", detail: "UNKNOWN_PAYMENT" };

    const payment = await findPayment(paymentId);
    if (payment === null) return { result: "ignored", detail: "NOT_FOUND_AT_PORTONE" };

    return applyPaymentState(admin, row as PaymentRow, payment);
}

async function applyPaymentState(
    admin: SupabaseClient,
    row: PaymentRow,
    payment: Payment
): Promise<WebhookOutcome> {
    const status = payment.status;

    // 아직 확정 전인 결제(첫 결제 202 처리 중 등)는 공통 확정 로직으로 마무리한다.
    if (row.status === "pending") {
        if (status !== "PAID" && status !== "FAILED" && status !== "CANCELLED" && status !== "PARTIAL_CANCELLED") {
            return { result: "ignored", detail: `NOT_FINAL_${String(status)}` };
        }
        const outcome = await resolvePendingPayment(admin, {
            userId: row.user_id,
            paymentId: row.payment_id,
            isStale: false,
            payment,
            recurring:
                row.kind === "recurring" && row.subscription_id && row.period_start
                    ? { subscriptionId: row.subscription_id, periodStart: row.period_start }
                    : undefined,
        });
        if (outcome.kind === "needs_review") return { result: "needs_review", detail: outcome.reason };
        if (outcome.kind === "pending") return { result: "ignored", detail: "STILL_PENDING" };
        return { result: "processed", detail: outcome.kind === "paid" ? "PENDING_TO_PAID" : `PENDING_TO_${status}` };
    }

    switch (status) {
        case "PAID":
            if (row.status === "paid") return { result: "processed", detail: "ALREADY_PAID" };
            // 실패·취소로 정리한 뒤 늦게 승인된 경우. 빌링키를 이미 지웠을 수 있어 자동 처리하지 않는다.
            console.error("[webhook] PAID at PortOne but row is", row.status, row.payment_id);
            return { result: "needs_review", detail: `PAID_BUT_ROW_${row.status.toUpperCase()}` };

        case "FAILED":
            return { result: "processed", detail: `FAILED_NOOP_ROW_${row.status.toUpperCase()}` };

        case "CANCELLED":
            if (row.status === "cancelled") return { result: "processed", detail: "ALREADY_CANCELLED" };
            if (row.status === "paid" || row.status === "partial_cancelled") {
                return applyFullCancellation(admin, row, payment.cancelledAt);
            }
            return { result: "processed", detail: `CANCELLED_NOOP_ROW_${row.status.toUpperCase()}` };

        case "PARTIAL_CANCELLED":
            if (row.status === "partial_cancelled") return { result: "processed", detail: "ALREADY_PARTIAL_CANCELLED" };
            if (row.status === "paid") {
                const { error } = await admin
                    .from("web_payments")
                    .update({ status: "partial_cancelled", failure_reason: "PAYMENT_PARTIAL_CANCELLED" })
                    .eq("payment_id", row.payment_id)
                    .eq("status", "paid");
                if (error) throw new Error(`[webhook] failed to mark partial_cancelled: ${error.message}`);
                // 구독은 변경하지 않는다.
                return { result: "processed", detail: "PAID_TO_PARTIAL_CANCELLED" };
            }
            return { result: "processed", detail: `PARTIAL_CANCELLED_NOOP_ROW_${row.status.toUpperCase()}` };

        default:
            return { result: "ignored", detail: `UNHANDLED_STATUS_${String(status)}` };
    }
}

/**
 * 전액 취소.
 * - 결제 행 → cancelled
 * - 이 결제가 해당 구독의 최신 paid 결제이고 기간(period_end)이 아직 남았으면 구독을
 *   즉시 종료한다: status=canceled, service_end_date=canceled_at=취소 시각,
 *   next_billing_date=null, 빌링키 삭제.
 * - 과거 회차 취소는 결제 행만 기록한다.
 */
async function applyFullCancellation(
    admin: SupabaseClient,
    row: PaymentRow,
    cancelledAtRaw: string
): Promise<WebhookOutcome> {
    const cancelledAt = new Date(cancelledAtRaw);
    const cancelledAtIso = Number.isNaN(cancelledAt.getTime()) ? new Date().toISOString() : cancelledAt.toISOString();

    // 갱신 전에 "최신 paid 결제" 여부를 판단한다 (갱신 후에는 이 행이 빠진다).
    let endsSubscription = false;
    if (row.subscription_id && row.period_end && new Date(row.period_end).getTime() > Date.now()) {
        const { data: latest, error } = await admin
            .from("web_payments")
            .select("payment_id")
            .eq("subscription_id", row.subscription_id)
            .in("status", ["paid", "partial_cancelled"])
            .order("period_start", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw new Error(`[webhook] failed to read latest payment: ${error.message}`);
        endsSubscription = latest?.payment_id === row.payment_id;
    }

    if (endsSubscription) {
        const { data: sub, error: subError } = await admin
            .from("web_subscriptions")
            .select("id, status, billing_key")
            .eq("id", row.subscription_id!)
            .eq("user_id", row.user_id)
            .maybeSingle();
        if (subError) throw new Error(`[webhook] failed to read subscription: ${subError.message}`);

        if (sub && (sub.status === "active" || sub.status === "cancel_scheduled" || sub.status === "past_due")) {
            // 빌링키를 먼저 지운다. 실패하면 throw → 500 → 재전송 때 다시 시도한다
            // (구독을 먼저 바꾸면 billing_key 가 비어 재시도에서 지울 키를 잃는다).
            if (sub.billing_key) await deleteBillingKey(sub.billing_key as string, "결제 전액 취소");

            const { error: updateError } = await admin
                .from("web_subscriptions")
                .update({
                    status: "canceled",
                    canceled_at: cancelledAtIso,
                    service_end_date: cancelledAtIso,
                    next_billing_date: null,
                    billing_key: null,
                    next_retry_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", sub.id)
                .eq("user_id", row.user_id)
                .in("status", ["active", "cancel_scheduled", "past_due"]);
            if (updateError) throw new Error(`[webhook] failed to cancel subscription: ${updateError.message}`);
        }
    }

    const { error: paymentError } = await admin
        .from("web_payments")
        .update({ status: "cancelled", failure_reason: "PAYMENT_CANCELLED" })
        .eq("payment_id", row.payment_id)
        .in("status", ["paid", "partial_cancelled"]);
    if (paymentError) throw new Error(`[webhook] failed to mark cancelled: ${paymentError.message}`);

    return {
        result: "processed",
        detail: endsSubscription ? "CANCELLED_SUBSCRIPTION_ENDED" : "CANCELLED_PAST_PERIOD_RECORD_ONLY",
    };
}

