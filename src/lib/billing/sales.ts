/**
 * 신규 판매 가능 여부. 순수 모듈(서버·브라우저·시험 공용, 서버 전용 상수를 import 하지 않는다).
 *
 * FEM AI Pro 는 신규 판매를 멈춘 상태다: 이 저장소의 결제
 * (카드 등록 → 첫 결제 → 구독 활성화)는 기본(Sniff) 계정에 구독을 만든다. FEM 용 결제 연결이 준비되기 전에
 * 이 경로로 FEM 을 팔면 결제한 계정과 FEM 을 쓰는 계정이 어긋난다.
 *
 * 여기서 막는 것은 **신규 구매**뿐이다. 이미 있는 구독의 해지·해지 취소·정기결제 처리는 이 판정을 쓰지 않는다.
 *
 * 규칙
 *  - 플랜 값이 없으면(undefined·null) Sniff Premium: `/payment` 와 기존 Sniff 클라이언트의 기본 동작이다.
 *  - 값이 있으면 정확히 일치해야 한다. `fem_pro` 는 "판매 중지", 그 밖의 값은 "알 수 없음"이다.
 *    어느 쪽도 Sniff 플랜으로 바꿔 처리하지 않는다.
 */
export const SALE_PLAN_SNIFF = "sniff_premium";
export const SALE_PLAN_FEM = "fem_pro";

export type NewSaleDecision =
    | { kind: "on_sale"; plan: typeof SALE_PLAN_SNIFF }
    | { kind: "not_on_sale"; plan: typeof SALE_PLAN_FEM }
    | { kind: "unknown" };

export function decideNewSale(rawPlan: unknown): NewSaleDecision {
    if (rawPlan === undefined || rawPlan === null) return { kind: "on_sale", plan: SALE_PLAN_SNIFF };
    if (rawPlan === SALE_PLAN_SNIFF) return { kind: "on_sale", plan: SALE_PLAN_SNIFF };
    if (rawPlan === SALE_PLAN_FEM) return { kind: "not_on_sale", plan: SALE_PLAN_FEM };
    return { kind: "unknown" };
}
