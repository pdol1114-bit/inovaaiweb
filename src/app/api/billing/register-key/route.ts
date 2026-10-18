import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPortOneClient } from "@/lib/portone/server";
import { chargeInitialSubscription } from "@/lib/billing/initial-charge";

/**
 * 카드 등록(빌링키 발급) 직후 호출. 빌링키를 검증하고 첫 달 요금을 즉시 청구한 뒤,
 * 결제가 확정된 경우에만 구독을 활성화한다.
 *
 * 응답
 *  200 { status: "paid", next_billing_date }
 *  202 { status: "processing" }         결과 확인 중 (출금 여부 불명 — 빌링키 유지)
 *  400 INVALID_JSON | INVALID_BILLING_KEY | BILLING_KEY_NOT_ISSUED
 *  401 UNAUTHORIZED
 *  402 PAYMENT_FAILED                    결제 실패 (새 빌링키는 삭제됨)
 *  403 BILLING_KEY_OWNER_MISMATCH
 *  409 ALREADY_SUBSCRIBED | CANCEL_SCHEDULED | IN_PROGRESS
 *  500 NOT_CONFIGURED | SERVER_ERROR
 */
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // user_id 는 세션에서만 가져온다. 본문으로 받으면 타인 명의로 결제·활성화할 수 있다.
    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let billingKey: unknown;
    try {
        ({ billing_key: billingKey } = await request.json());
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    if (typeof billingKey !== "string" || billingKey.length === 0 || billingKey.length > 200) {
        return NextResponse.json({ error: "INVALID_BILLING_KEY" }, { status: 400 });
    }

    if (!getPortOneClient()) {
        console.error("[billing/register-key] PORTONE_API_SECRET is not set");
        return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
    }

    try {
        const result = await chargeInitialSubscription({ user, billingKey });

        switch (result.status) {
            case "paid":
                return NextResponse.json({ status: "paid", next_billing_date: result.nextBillingDate });
            case "processing":
                return NextResponse.json({ status: "processing" }, { status: 202 });
            case "failed":
                return NextResponse.json({ error: "PAYMENT_FAILED" }, { status: 402 });
            case "invalid_billing_key":
                if (result.reason === "CUSTOMER_MISMATCH") {
                    return NextResponse.json({ error: "BILLING_KEY_OWNER_MISMATCH" }, { status: 403 });
                }
                return NextResponse.json(
                    { error: result.reason === "NOT_ISSUED" ? "BILLING_KEY_NOT_ISSUED" : "INVALID_BILLING_KEY" },
                    { status: 400 }
                );
            case "conflict":
                return NextResponse.json({ error: result.reason }, { status: 409 });
        }
    } catch (e) {
        console.error("[billing/register-key] unexpected error", e);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}
