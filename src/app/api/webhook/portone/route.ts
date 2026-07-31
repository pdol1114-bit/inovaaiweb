import { NextResponse } from "next/server";
import * as PortOneWebhook from "@portone/server-sdk/webhook";

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
        webhook = await PortOneWebhook.verify(
            secret,
            rawBody,
            Object.fromEntries(request.headers)
        );
    } catch (e) {
        if (e instanceof PortOneWebhook.WebhookVerificationError) {
            console.error("[webhook/portone] verification failed", e.reason);
            return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
        }
        throw e;
    }

    console.info("[webhook/portone] received", webhook.type);

    return NextResponse.json({ ok: true });
}
