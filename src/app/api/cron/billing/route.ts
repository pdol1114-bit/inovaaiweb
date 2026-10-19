import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { runBillingBatch } from "@/lib/billing/recurring";

/**
 * 일일 정기결제 배치. Cloud Scheduler 가 매일 KST 10~14시 매시 정각에 호출한다.
 *
 *   POST /api/cron/billing
 *   Authorization: Bearer <billing-cron-secret>
 *
 * 인증: 공유 시크릿 헤더 (BILLING_CRON_SECRET, RUNTIME 전용). 해시 후 timing-safe 비교.
 * 겹쳐 실행돼도 이중 청구가 없다 (src/lib/billing/recurring.ts 의 4겹 방지).
 * 실행 예산 240초 — Cloud Run 요청 타임아웃(300초) 안에서 끝내고, 남은 건은 다음 실행이 처리한다.
 * 응답·로그에는 건수와 구독/결제 ID·결과만 남긴다 (시크릿·빌링키 미출력).
 */
export const dynamic = "force-dynamic";

const BUDGET_MS = 240 * 1000;
const MIN_SECRET_LENGTH = 32;

function isAuthorized(header: string | null, secret: string): boolean {
    const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    const a = createHash("sha256").update(provided).digest();
    const b = createHash("sha256").update(secret).digest();
    return provided.length > 0 && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    const secret = process.env.BILLING_CRON_SECRET;
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
        console.error("[cron/billing] BILLING_CRON_SECRET is not set or too short");
        return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
    }
    if (!isAuthorized(request.headers.get("authorization"), secret)) {
        console.warn("[cron/billing] unauthorized request");
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    try {
        const summary = await runBillingBatch({ budgetMs: BUDGET_MS });
        console.info(
            "[cron/billing] summary",
            JSON.stringify({
                startedAt: summary.startedAt,
                finishedAt: summary.finishedAt,
                truncated: summary.truncated,
                counts: summary.counts,
            })
        );
        for (const d of summary.details.slice(0, 200)) {
            console.info(`[cron/billing] step=${d.step} id=${d.id} result=${d.result}`);
        }
        return NextResponse.json(
            { ok: true, truncated: summary.truncated, counts: summary.counts },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (e) {
        console.error("[cron/billing] batch failed", e);
        return NextResponse.json({ error: "BATCH_FAILED" }, { status: 500 });
    }
}
