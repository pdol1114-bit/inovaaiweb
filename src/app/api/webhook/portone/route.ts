import { NextResponse } from "next/server";
import * as PortOneWebhook from "@portone/server-sdk/webhook";
import { createAdminClient } from "@/utils/supabase/admin";
import { HANDLED_WEBHOOK_TYPES, processPaymentWebhook } from "@/lib/billing/webhook";

/**
 * 포트원 V2 웹훅 (버전 2024-04-25). 콘솔 등록 주소: https://inovaai.ai/api/webhook/portone
 *
 * 1) 서명 검증 (raw body)            실패 → 400
 * 2) webhook-id 가 이미 처리됐으면    → 200 (처리 없음)
 * 3) 결제 이벤트가 아니면             → 200 (기록 없음)
 * 4) 결제 조회로 상태 확정 후 반영    → 처리 성공 시 webhook-id 기록 + 200
 *    일시 오류(DB, 포트원 조회)        → 500 (기록하지 않음 → 포트원 재전송)
 *
 * 로그: id·type·paymentId·result 만 남긴다. 시크릿·빌링키는 출력하지 않는다.
 */
export async function POST(request: Request) {
    const secret = process.env.PORTONE_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[webhook/portone] PORTONE_WEBHOOK_SECRET is not set");
        return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
    }

    // Signature must be checked against the raw body, before any JSON parsing.
    const rawBody = await request.text();

    let webhook: Awaited<ReturnType<typeof PortOneWebhook.verify>>;
    try {
        webhook = await PortOneWebhook.verify(secret, rawBody, Object.fromEntries(request.headers));
    } catch (e) {
        if (e instanceof PortOneWebhook.WebhookVerificationError) {
            console.error("[webhook/portone] verification failed", e.reason);
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }
        throw e;
    }

    // verify 가 webhook-id 헤더 존재를 요구하므로 여기서는 항상 값이 있다.
    const webhookId = request.headers.get("webhook-id") ?? "";
    const type = "type" in webhook && typeof webhook.type === "string" ? webhook.type : "UNRECOGNIZED";
    const paymentId =
        "data" in webhook && webhook.data && typeof webhook.data === "object" && "paymentId" in webhook.data
            ? String(webhook.data.paymentId)
            : null;
    const log = (result: string, detail: string, level: "info" | "error" = "info") =>
        console[level](
            `[webhook/portone] id=${webhookId} type=${type} paymentId=${paymentId ?? "-"} result=${result} detail=${detail}`
        );

    if (!(HANDLED_WEBHOOK_TYPES as readonly string[]).includes(type) || !paymentId) {
        log("ignored", "UNHANDLED_TYPE");
        return NextResponse.json({ ok: true });
    }

    try {
        const admin = createAdminClient();

        const { data: seen, error: seenError } = await admin
            .from("web_webhook_events")
            .select("result")
            .eq("webhook_id", webhookId)
            .maybeSingle();
        if (seenError) throw new Error(`failed to read webhook events: ${seenError.message}`);
        if (seen) {
            log("duplicate", `ALREADY_${String(seen.result).toUpperCase()}`);
            return NextResponse.json({ ok: true });
        }

        const outcome = await processPaymentWebhook(admin, paymentId);

        // 처리 "후" 기록. 동시에 같은 ID 가 처리돼도 처리 자체가 멱등이라 충돌은 무시한다.
        const { error: recordError } = await admin.from("web_webhook_events").upsert(
            {
                webhook_id: webhookId,
                event_type: type,
                payment_id: paymentId,
                result: outcome.result,
                detail: outcome.detail.slice(0, 500),
            },
            { onConflict: "webhook_id", ignoreDuplicates: true }
        );
        if (recordError) throw new Error(`failed to record webhook: ${recordError.message}`);

        log(outcome.result, outcome.detail, outcome.result === "needs_review" ? "error" : "info");
        return NextResponse.json({ ok: true });
    } catch (e) {
        log("error", e instanceof Error ? e.message.slice(0, 300) : "UNKNOWN", "error");
        return NextResponse.json({ error: "TEMPORARY_FAILURE" }, { status: 500 });
    }
}
