import "server-only";

/**
 * 서비스별 월 구독 플랜 및 실제 청구 금액(KRW, 부가세 포함) 정의.
 *
 * 실제 청구 금액의 유일한 기준값이다. 결제 요청 금액은 반드시 서버에서 이 상수로
 * 정하고, 클라이언트가 보낸 금액을 쓰지 말 것.
 */
export const SNIFF_PREMIUM_MONTHLY_PRICE = 3300;
export const SNIFF_PREMIUM_PLAN = "sniff_premium";
export const SNIFF_PREMIUM_ORDER_NAME = "Sniff Premium 월 구독";

/**
 * FEM AI Pro: 공급가 50,000원 (부가세 별도) → 실제 결제 금액 55,000원 (VAT 10% 포함).
 * 월 실행 한도: 40회.
 */
export const FEM_PRO_PLAN = "fem_pro";
export const FEM_PRO_SUPPLY_PRICE = 50000;
export const FEM_PRO_MONTHLY_PRICE = 55000;
export const FEM_PRO_MONTHLY_QUOTA = 40;
export const FEM_PRO_ORDER_NAME = "FEM AI Pro 월 구독";

export type PlanId = typeof SNIFF_PREMIUM_PLAN | typeof FEM_PRO_PLAN;

export type PlanConfig = {
    plan: PlanId;
    supplyPrice: number;
    monthlyPrice: number;
    orderName: string;
    monthlyQuota: number | null;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
    [SNIFF_PREMIUM_PLAN]: {
        plan: SNIFF_PREMIUM_PLAN,
        supplyPrice: 3000,
        monthlyPrice: SNIFF_PREMIUM_MONTHLY_PRICE,
        orderName: SNIFF_PREMIUM_ORDER_NAME,
        monthlyQuota: null,
    },
    [FEM_PRO_PLAN]: {
        plan: FEM_PRO_PLAN,
        supplyPrice: FEM_PRO_SUPPLY_PRICE,
        monthlyPrice: FEM_PRO_MONTHLY_PRICE,
        orderName: FEM_PRO_ORDER_NAME,
        monthlyQuota: FEM_PRO_MONTHLY_QUOTA,
    },
};

export function isValidPlan(value: unknown): value is PlanId {
    return typeof value === "string" && value in PLAN_CONFIGS;
}

export function getPlanConfig(plan?: string | null): PlanConfig {
    if (plan && isValidPlan(plan)) return PLAN_CONFIGS[plan];
    return PLAN_CONFIGS[SNIFF_PREMIUM_PLAN];
}
