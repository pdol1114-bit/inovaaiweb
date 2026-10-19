import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSubscriptionForUser } from "@/lib/subscription";
import { deleteBillingKey } from "@/lib/portone/server";

/**
 * 정기결제 해지 예약.
 *
 * 해지 정책상 이미 결제한 기간은 그대로 이용할 수 있으므로 즉시 종료시키지 않고
 * service_end_date(= 다음 결제 예정일)까지 유지한 뒤 종료시킨다.
 * 빌링키 삭제도 그 시점으로 미룬다 — 지금 지우면 해지 취소 시 카드 재등록이 필요해진다.
 *
 * 미납(past_due) 구독은 즉시 해지한다: canceled, service_end_date = 지금, 빌링키 삭제.
 * 결제가 진행 중(pending)이면 409 로 막는다 — 배치 재시도와 겹쳐 해지 후 출금되는 것을 방지.
 */
export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // user_id는 세션에서만 가져온다. 요청 본문으로 받으면 타인의 구독을 해지할 수 있다.
    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const subscription = await getSubscriptionForUser(supabase, user.id);

    if (!subscription || subscription.status === "canceled") {
        return NextResponse.json({ error: "NO_ACTIVE_SUBSCRIPTION" }, { status: 404 });
    }

    if (subscription.status === "cancel_scheduled") {
        return NextResponse.json({ error: "ALREADY_SCHEDULED" }, { status: 409 });
    }

    if (subscription.status === "past_due") {
        return cancelPastDueImmediately(user.id, subscription.id, subscription.billing_key);
    }

    const serviceEndDate = subscription.next_billing_date;
    if (!serviceEndDate) {
        console.error("[billing/cancel] subscription has no next_billing_date", subscription.id);
        return NextResponse.json({ error: "NO_END_DATE" }, { status: 500 });
    }

    // 쓰기는 서버 권한 클라이언트로만 한다. RLS 를 우회하므로 아래 user_id 조건이 대상 한정의 전부다.
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("web_subscriptions")
        .update({
            status: "cancel_scheduled",
            canceled_at: new Date().toISOString(),
            service_end_date: serviceEndDate,
            updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .select("id, status, service_end_date")
        .maybeSingle();

    if (error || !data) {
        console.error("[billing/cancel] failed to schedule cancellation", error);
        return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, service_end_date: data.service_end_date });
}

async function cancelPastDueImmediately(userId: string, subscriptionId: string, billingKey: string | null) {
    const admin = createAdminClient();

    const { data: inFlight, error: lockError } = await admin
        .from("web_payments")
        .select("payment_id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1);
    if (lockError) {
        console.error("[billing/cancel] failed to check in-flight payment", lockError);
        return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 500 });
    }
    if (inFlight && inFlight.length > 0) {
        return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
    }

    // 빌링키를 먼저 지운다. 실패하면 상태를 바꾸지 않고 500 (다시 시도 가능).
    if (billingKey) {
        try {
            await deleteBillingKey(billingKey, "미납 구독 해지");
        } catch (e) {
            console.error("[billing/cancel] billing key deletion failed", e);
            return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 500 });
        }
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
        .from("web_subscriptions")
        .update({
            status: "canceled",
            canceled_at: now,
            service_end_date: now,
            next_billing_date: null,
            next_retry_at: null,
            billing_key: null,
            updated_at: now,
        })
        .eq("id", subscriptionId)
        .eq("user_id", userId)
        .eq("status", "past_due")
        .select("id, service_end_date")
        .maybeSingle();

    if (error || !data) {
        console.error("[billing/cancel] failed to cancel past_due subscription", error);
        return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, immediate: true, service_end_date: data.service_end_date });
}
