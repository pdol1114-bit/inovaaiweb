import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteBillingKey } from "@/lib/portone/server";

export type SubscriptionStatus = "active" | "cancel_scheduled" | "canceled";

export type Subscription = {
    id: string;
    user_id: string;
    billing_key: string | null;
    plan: string;
    status: SubscriptionStatus;
    next_billing_date: string | null;
    service_end_date: string | null;
    canceled_at: string | null;
    started_at: string | null;
    card_brand: string | null;
    card_number_masked: string | null;
};

const COLUMNS =
    "id, user_id, billing_key, plan, status, next_billing_date, service_end_date, canceled_at, started_at, card_brand, card_number_masked";

/**
 * 이용 종료일이 지난 해지 예약 건을 'canceled'로 전환한다.
 *
 * 이 프로젝트에는 크론·스케줄러 인프라가 없으므로 접근 시점(구독 조회 시)에 확인한다.
 * 종료일까지 미뤄둔 빌링키 삭제도 이 시점에 수행한다.
 */
async function settleIfExpired(
    supabase: SupabaseClient,
    subscription: Subscription
): Promise<Subscription> {
    if (subscription.status !== "cancel_scheduled") return subscription;
    if (!subscription.service_end_date) return subscription;
    if (new Date(subscription.service_end_date) > new Date()) return subscription;

    if (subscription.billing_key) {
        try {
            await deleteBillingKey(subscription.billing_key);
        } catch (e) {
            // 빌링키 삭제가 실패해도 구독은 종료시킨다. 다음 접근에서 다시 시도된다.
            console.error("[subscription] billing key deletion failed on expiry", e);
        }
    }

    const { data, error } = await supabase
        .from("subscriptions")
        .update({
            status: "canceled",
            billing_key: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("status", "cancel_scheduled")
        .select(COLUMNS)
        .maybeSingle();

    if (error || !data) return { ...subscription, status: "canceled", billing_key: null };
    return data as Subscription;
}

/** 로그인한 사용자의 구독을 조회한다. 종료일이 지났으면 먼저 정리한다. */
export async function getSubscriptionForUser(
    supabase: SupabaseClient,
    userId: string
): Promise<Subscription | null> {
    const { data, error } = await supabase
        .from("subscriptions")
        .select(COLUMNS)
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return null;
    return settleIfExpired(supabase, data as Subscription);
}
