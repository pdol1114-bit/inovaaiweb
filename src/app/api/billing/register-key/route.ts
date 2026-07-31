import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    const { error } = await supabase.from("subscriptions").upsert(
        {
            user_id: user.id,
            billing_key: billingKey,
            plan: "sniff_premium",
            status: "active",
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
    );

    if (error) {
        console.error("[billing/register-key] failed to save billing key", error);
        return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
