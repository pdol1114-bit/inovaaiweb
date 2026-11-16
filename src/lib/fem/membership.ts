/**
 * FEM 회원의 구독 판정. 순수 모듈(서버·시험 공용).
 *
 * FEM 회원과 구독은 FEM 전용 Supabase 프로젝트에 있다(`fem_subscriptions`).
 * 기본(Sniff) 프로젝트의 `web_subscriptions`는 보지 않는다 — 그쪽 계정·구독은 FEM 권한이 아니다.
 */
export type FemSubscriptionRow = { plan: string; status: string; service_end_date: string | null };

export const FEM_MEMBER_PLAN = "fem_pro";

/** 이용 가능: active, 또는 해지 예약 상태이면서 종료일이 아직 지나지 않은 경우. 그 밖은 전부 불가. */
export function isFemSubscriptionActive(row: FemSubscriptionRow | null | undefined, now: Date = new Date()): boolean {
    if (!row || row.plan !== FEM_MEMBER_PLAN) return false;
    if (row.status === "active") return true;
    if (row.status !== "cancel_scheduled") return false;
    if (!row.service_end_date) return false;
    const end = new Date(row.service_end_date);
    return !Number.isNaN(end.getTime()) && end > now;
}

type Query = {
    select(columns: string): {
        eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> };
    };
};
type Reader = { from(table: string): unknown };

/** 조회 실패는 "구독 없음"으로 본다(실행을 막는 쪽). */
export async function getFemSubscription(admin: Reader, userId: string): Promise<FemSubscriptionRow | null> {
    const query = admin.from("fem_subscriptions") as Query;
    const { data, error } = await query.select("plan, status, service_end_date").eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    return data as FemSubscriptionRow;
}

/** Free beta is an explicit server-side launch setting; no paid subscription is created. */
export function femAccessMode(value: string | undefined = process.env.FEM_ACCESS_MODE): 'free_beta' | 'subscription' {
    return value === 'free_beta' ? 'free_beta' : 'subscription';
}

export function hasFemAccess(row: FemSubscriptionRow | null, mode: 'free_beta' | 'subscription'): boolean {
    return mode === 'free_beta' || isFemSubscriptionActive(row);
}
