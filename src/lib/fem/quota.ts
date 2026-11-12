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

export async function getFemMonthlyUsage(
    admin: SupabaseClient,
    userId: string
): Promise<FemQuotaSummary> {
    const monthStart = currentKstMonthStartIso();
    const { count, error } = await admin
        .from("fem_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "canceled")
        .gte("created_at", monthStart);

    if (error) {
        // 마이그레이션 적용 전이거나 일시 오류 시 안전하게 0건 처리 (요청 제출 시엔 다시 검증)
        console.warn("[fem/quota] failed to count fem_jobs:", error.message);
        return {
            used: 0,
            limit: FEM_PRO_MONTHLY_QUOTA,
            remaining: FEM_PRO_MONTHLY_QUOTA,
        };
    }

    const used = count ?? 0;
    return {
        used,
        limit: FEM_PRO_MONTHLY_QUOTA,
        remaining: Math.max(0, FEM_PRO_MONTHLY_QUOTA - used),
    };
}

