import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSubscriptionForUser } from "@/lib/subscription";

/**
 * 정기결제 해지 예약.
 *
 * 해지 정책상 이미 결제한 기간은 그대로 이용할 수 있으므로 즉시 종료시키지 않고
 * service_end_date(= 다음 결제 예정일)까지 유지한 뒤 종료시킨다.
 * 빌링키 삭제도 그 시점으로 미룬다 — 지금 지우면 해지 취소 시 카드 재등록이 필요해진다.
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

    const serviceEndDate = subscription.next_billing_date;
    if (!serviceEndDate) {
        console.error("[billing/cancel] subscription has no next_billing_date", subscription.id);
        return NextResponse.json({ error: "NO_END_DATE" }, { status: 500 });
    }

    const { data, error } = await supabase
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
