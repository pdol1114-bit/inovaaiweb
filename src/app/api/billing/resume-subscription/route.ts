import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSubscriptionForUser } from "@/lib/subscription";

/**
 * 해지 취소. 이용 종료일이 지나기 전, 해지 예약 상태에서만 동작한다.
 *
 * 빌링키를 종료일까지 보관하므로 카드를 다시 등록할 필요가 없다.
 */
export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 종료일이 이미 지났다면 이 조회 안에서 'canceled'로 정리되어 아래 분기에 걸린다.
    const subscription = await getSubscriptionForUser(supabase, user.id);

    if (!subscription) {
        return NextResponse.json({ error: "NO_SUBSCRIPTION" }, { status: 404 });
    }

    if (subscription.status !== "cancel_scheduled") {
        return NextResponse.json({ error: "NOT_CANCEL_SCHEDULED" }, { status: 409 });
    }

    const { data, error } = await supabase
        .from("subscriptions")
        .update({
            status: "active",
            canceled_at: null,
            service_end_date: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("user_id", user.id)
        .eq("status", "cancel_scheduled")
        .select("id, status, next_billing_date")
        .maybeSingle();

    if (error || !data) {
        console.error("[billing/resume] failed to resume subscription", error);
        return NextResponse.json({ error: "RESUME_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, next_billing_date: data.next_billing_date });
}
