import "server-only";
import { PortOneClient, PortOneError } from "@portone/server-sdk";
import type { Payment as PortOnePayment } from "@portone/server-sdk";

type BillingKeyInfo = PortOnePayment.BillingKey.BillingKeyInfo;
export type Payment = PortOnePayment.Payment;

/**
 * 포트원 서버 API 클라이언트. API Secret이 없으면 null을 반환하므로
 * 호출부에서 미설정 상태를 구분해 처리할 수 있다.
 */
export function getPortOneClient() {
    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) return null;
    return PortOneClient({ secret });
}

function requireClient() {
    const client = getPortOneClient();
    if (!client) throw new Error("[portone] PORTONE_API_SECRET is not set");
    return client;
}

/** PortOne SDK 에러의 data.type (예: "PG_PROVIDER"). SDK 에러가 아니면 null. */
function portOneErrorType(e: unknown): string | null {
    if (!(e instanceof PortOneError)) return null;
    const data = (e as PortOneError & { data?: { type?: unknown } }).data;
    return typeof data?.type === "string" ? data.type : null;
}

function portOneErrorSummary(e: unknown): string {
    if (e instanceof PortOneError) {
        const data = (e as PortOneError & { data?: Record<string, unknown> }).data ?? {};
        const parts = [data.type, data.pgCode, data.pgMessage ?? data.message].filter(
            (v): v is string => typeof v === "string" && v.length > 0
        );
        if (parts.length > 0) return parts.join(": ").slice(0, 500);
    }
    return e instanceof Error ? e.message.slice(0, 500) : "UNKNOWN_ERROR";
}

/**
 * 빌링키를 삭제한다.
 *
 * 해지 신청 시점이 아니라 이용 종료일에 호출한다. 포트원 V2에는 예약 삭제가 없어
 * 신청 즉시 삭제하면 해지 취소 시 카드를 다시 등록해야 하기 때문이다.
 */
export async function deleteBillingKey(billingKey: string, reason = "사용자 구독 해지"): Promise<void> {
    const client = getPortOneClient();
    if (!client) {
        console.warn("[portone] PORTONE_API_SECRET not set — skipping billing key deletion");
        return;
    }

    try {
        await client.payment.billingKey.deleteBillingKey({ billingKey, reason });
    } catch (e) {
        const type = portOneErrorType(e);
        // 이미 지워졌거나 없는 키는 목적이 달성된 것으로 본다.
        if (type === "BILLING_KEY_ALREADY_DELETED" || type === "BILLING_KEY_NOT_FOUND") return;
        throw e;
    }
}

export type CardInfo = { brand: string | null; numberMasked: string | null };

function extractCardInfo(info: BillingKeyInfo): CardInfo {
    const methods = "methods" in info ? info.methods : undefined;
    const cardMethod = methods?.find((m) => m.type === "BillingKeyPaymentMethodCard");
    const card = cardMethod && "card" in cardMethod ? cardMethod.card : undefined;
    return {
        brand: card?.name ?? card?.brand ?? null,
        numberMasked: card?.number ?? null,
    };
}

export type BillingKeyVerification =
    | { ok: true; card: CardInfo }
    | { ok: false; reason: "NOT_FOUND" | "NOT_ISSUED" | "CUSTOMER_MISMATCH" };

/**
 * 빌링키가 발급 완료(ISSUED) 상태이고 고객 ID가 세션 사용자와 일치하는지 확인한다.
 * 브라우저가 보낸 빌링키(쿼리·본문)는 신뢰하지 않으므로 결제 전에 반드시 거친다.
 * 포트원 통신 오류는 그대로 throw 한다 (호출부에서 500 처리).
 */
export async function verifyIssuedBillingKey(
    billingKey: string,
    userId: string
): Promise<BillingKeyVerification> {
    const client = requireClient();

    let info: BillingKeyInfo;
    try {
        info = await client.payment.billingKey.getBillingKeyInfo({ billingKey });
    } catch (e) {
        if (portOneErrorType(e) === "BILLING_KEY_NOT_FOUND") return { ok: false, reason: "NOT_FOUND" };
        throw e;
    }

    if (info.status !== "ISSUED") return { ok: false, reason: "NOT_ISSUED" };
    if (!("customer" in info) || info.customer?.id !== userId) {
        return { ok: false, reason: "CUSTOMER_MISMATCH" };
    }
    return { ok: true, card: extractCardInfo(info) };
}

/** 표시용 카드 정보. 실패해도 결제 흐름을 막지 않도록 null 로 돌려준다. */
export async function getBillingKeyCardInfo(billingKey: string): Promise<CardInfo> {
    const client = getPortOneClient();
    if (!client) return { brand: null, numberMasked: null };
    try {
        return extractCardInfo(await client.payment.billingKey.getBillingKeyInfo({ billingKey }));
    } catch (e) {
        console.error("[portone] failed to fetch billing key card info", e);
        return { brand: null, numberMasked: null };
    }
}

/**
 * 빌링키 결제 요청 결과.
 * - accepted: 포트원이 승인 응답을 줬다 (최종 확정은 getPayment 로 한다)
 * - rejected: 요청이 거절돼 결제가 일어나지 않았음이 확실하다
 * - unknown : 네트워크 오류 등으로 결과를 알 수 없다 (출금됐을 수도 있음)
 */
export type ChargeRequestResult =
    | { kind: "accepted" }
    | { kind: "rejected"; reason: string }
    | { kind: "unknown"; reason: string };

export async function requestBillingKeyCharge(params: {
    paymentId: string;
    billingKey: string;
    orderName: string;
    amount: number;
    customer: { id: string; email?: string; fullName?: string };
}): Promise<ChargeRequestResult> {
    const client = requireClient();
    try {
        await client.payment.payWithBillingKey({
            paymentId: params.paymentId,
            billingKey: params.billingKey,
            orderName: params.orderName,
            amount: { total: params.amount },
            currency: "KRW",
            customer: {
                id: params.customer.id,
                ...(params.customer.email ? { email: params.customer.email } : {}),
                ...(params.customer.fullName ? { name: { full: params.customer.fullName } } : {}),
            },
        });
        return { kind: "accepted" };
    } catch (e) {
        const type = portOneErrorType(e);
        const reason = portOneErrorSummary(e);
        // 이미 같은 paymentId 로 결제됨 → 결제 조회로 확정한다.
        if (type === "ALREADY_PAID") return { kind: "unknown", reason };
        // 포트원이 명시적으로 거절한 경우: 결제가 일어나지 않았다.
        if (type !== null) return { kind: "rejected", reason };
        // SDK 가 모르는 에러 타입(Unrecognized 심볼)이거나 네트워크 오류: 결과 불명.
        return { kind: "unknown", reason };
    }
}

/**
 * 결제 조회 결과. null 이면 포트원에 결제 건이 없다(PAYMENT_NOT_FOUND).
 * 그 외 통신 오류는 throw 한다.
 */
export async function findPayment(paymentId: string): Promise<Payment | null> {
    const client = requireClient();
    try {
        return await client.payment.getPayment({ paymentId });
    } catch (e) {
        if (portOneErrorType(e) === "PAYMENT_NOT_FOUND") return null;
        throw e;
    }
}
