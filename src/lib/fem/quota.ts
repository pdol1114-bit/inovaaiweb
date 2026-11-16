import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEM_PRO_MONTHLY_QUOTA } from "@/lib/billing/constants";

export type FemQuotaSummary = {
    used: number;
    limit: number;
    remaining: number;
};

/** KST 기준 이번 달 1일 00:00:00 UTC ISO 문자열 */
export function currentKstMonthStartIso(): string {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth();
    const utcMs = Date.UTC(year, month, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
    return new Date(utcMs).toISOString();
}

/**
 * 이번 달 이용 횟수. 조회에 실패하면 **null** 을 돌려준다 — 잔여 횟수를 추정하지 않는다.
 * 호출부는 null이면 "확인 불가"로 표시하고 실행을 막아야 한다.
 * 세는 기준은 `counts_toward_quota`(마이그레이션 0012)이며 규칙은 job-service.ts에 있다.
 */
export async function getFemMonthlyUsage(
    admin: SupabaseClient,
    userId: string
): Promise<FemQuotaSummary | null> {
    const monthStart = currentKstMonthStartIso();
    const { count, error } = await admin
        .from("fem_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("counts_toward_quota", true)
        .gte("created_at", monthStart);

    if (error || count === null) {
        console.warn("[fem/quota] failed to count fem_jobs:", error?.code ?? "no count");
        return null;
    }

    return {
        used: count,
        limit: FEM_PRO_MONTHLY_QUOTA,
        remaining: Math.max(0, FEM_PRO_MONTHLY_QUOTA - count),
    };
}
