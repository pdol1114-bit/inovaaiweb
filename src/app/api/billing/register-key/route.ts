import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBillingKeyCardInfo } from "@/lib/portone/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let billingKey: unknown;
    try {
        ({ billing_key: billingKey } = await request.json());
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    if (typeof billingKey !== "string" || billingKey.length === 0) {
        return NextResponse.json({ error: "INVALID_BILLING_KEY" }, { status: 400 });
    }

    const card = await getBillingKeyCardInfo(billingKey);

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const { error } = await supabase.from("subscriptions").upsert(
        {
            user_id: user.id,
            billing_key: billingKey,
            plan: "sniff_premium",
            status: "active",
            started_at: now.toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            // 재구독인 경우 이전 해지 예약 흔적을 지운다.
            canceled_at: null,
            service_end_date: null,
            card_brand: card.brand,
            card_number_masked: card.numberMasked,
            updated_at: now.toISOString(),
        },
        { onConflict: "user_id" }
    );

    if (error) {
        console.error("[billing/register-key] failed to save billing key", error);
        return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
