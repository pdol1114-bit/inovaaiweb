import { PortOneClient } from "@portone/server-sdk";

/**
 * 포트원 서버 API 클라이언트. API Secret이 없으면 null을 반환하므로
 * 호출부에서 미설정 상태를 구분해 처리할 수 있다.
 *
 * 채널 키·API Secret 발급 전이라 실제 호출은 아직 검증되지 않았다.
 */
export function getPortOneClient() {
    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) return null;
    return PortOneClient({ secret });
}

/**
 * 빌링키를 삭제한다.
 *
 * 해지 신청 시점이 아니라 이용 종료일에 호출한다. 포트원 V2에는 예약 삭제가 없어
 * 신청 즉시 삭제하면 해지 취소 시 카드를 다시 등록해야 하기 때문이다.
 */
export async function deleteBillingKey(billingKey: string): Promise<void> {
    const client = getPortOneClient();
    if (!client) {
        console.warn("[portone] PORTONE_API_SECRET not set — skipping billing key deletion");
        return;
    }

    await client.payment.billingKey.deleteBillingKey({
        billingKey,
        reason: "사용자 구독 해지",
    });
}

/** 등록된 카드의 표시용 정보(카드사·마스킹 번호)를 조회한다. */
export async function getBillingKeyCardInfo(
    billingKey: string
): Promise<{ brand: string | null; numberMasked: string | null }> {
    const client = getPortOneClient();
    if (!client) return { brand: null, numberMasked: null };

    try {
        const info = await client.payment.billingKey.getBillingKeyInfo({ billingKey });
        const methods = "methods" in info ? info.methods : undefined;
        const cardMethod = methods?.find((m) => m.type === "BillingKeyPaymentMethodCard");
        const card = cardMethod && "card" in cardMethod ? cardMethod.card : undefined;

        return {
            brand: card?.name ?? card?.brand ?? null,
            numberMasked: card?.number ?? null,
        };
    } catch (e) {
        // 카드 정보는 표시용이라 조회에 실패해도 구독 등록 자체는 진행한다.
        console.error("[portone] failed to fetch billing key card info", e);
        return { brand: null, numberMasked: null };
    }
}
