import "server-only";

/**
 * Sniff Premium 월 구독료 (KRW, 부가세 포함).
 *
 * 실제 청구 금액의 유일한 기준값이다. 결제 요청 금액은 반드시 서버에서 이 상수로
 * 정하고, 클라이언트가 보낸 금액을 쓰지 말 것.
 *
 * 화면 표기 금액은 messages/ko.json · en.json 에 따로 있다. 금액을 바꿀 때는
 * 번역 문구(결제페이지·자동갱신 고지·환불정책·구독관리)와 약관도 함께 고쳐야 한다.
 *
 * Phase 1 에서는 정의만 한다. 결제 호출부 연결은 Phase 2.
 */
export const SNIFF_PREMIUM_MONTHLY_PRICE = 3300;

/** web_subscriptions.plan 값 */
export const SNIFF_PREMIUM_PLAN = "sniff_premium";

/** 포트원·PG 결제 건의 주문명 (카드사 승인 내역에 표시될 수 있다) */
export const SNIFF_PREMIUM_ORDER_NAME = "Sniff Premium 월 구독";
