import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { findPayment, getPortOneClient } from "@/lib/portone/server";
import { parseMailMode, type MailMode } from "@/lib/notifications/config";

/**
 * 결제 경로 설정 점검. 배포 직후 시크릿이 실제로 유효한지 확인하는 용도.
 *
 *   curl -s https://inovaai.ai/api/health/billing
 *   → 200 {"ok":true,"checks":{...}}  /  하나라도 실패하면 503
 *
 * 공개 엔드포인트이므로 ok/fail boolean 만 돌려주고 오류 원문은 서버 로그로만 남긴다.
 * 외부 API 호출이 반복되지 않도록 인스턴스별로 결과를 60초 캐시한다.
 * 쓰기·결제는 하지 않는다 (0건 조회, 존재하지 않는 결제 ID 조회만).
 */
export const dynamic = "force-dynamic";

type Checks = {
    /** service role 키로 web_subscriptions 조회 가능 (키 유효성) */
    supabaseAdmin: boolean;
    /** web_payments 테이블 존재 (0006 적용) */
    paymentsTable: boolean;
    /** 포트원 API Secret 로드 + 인증 통과 */
    portoneApi: boolean;
    /** 포트원 웹훅 시크릿 로드 + base64 디코딩 가능 (SDK verify 가 요구) */
    portoneWebhookSecret: boolean;
    /** 정기결제 배치 시크릿 로드 (32자 이상) */
    billingCronSecret: boolean;
    /** Resend API 키: 값 존재, "re_" 접두어, 앞뒤 공백·개행 없음 */
    resendApiKey: boolean;
};

const CACHE_MS = 60 * 1000;
// 영숫자만 쓰는 존재하지 않는 결제 ID. 포트원이 PAYMENT_NOT_FOUND 를 주면 인증이 정상이다.
const PROBE_PAYMENT_ID = "healthcheckprobe0000000000000000";

type HealthResult = {
    checks: Checks;
    /** 401·403 설정 오류로 재시도 대기 중인 메일 수. 조회 실패 시 null (0으로 숨기지 않음). */
    mailConfigBlocked: number | null;
};

let cached: HealthResult & { at: number; mailMode: MailMode } | null = null;

function isValidResendKey(key: string | undefined): boolean {
    return !!key && key.startsWith("re_") && key === key.trim() && key.length > 3;
}

/** SDK 와 같은 규칙: "whsec_" 접두 제거 후 base64 디코딩이 되고 비어 있지 않아야 한다. */
function isDecodableWebhookSecret(secret: string | undefined): boolean {
    if (!secret) return false;
    const body = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
    try {
        return atob(body).length > 0;
    } catch {
        return false;
    }
}

async function runChecks(): Promise<HealthResult> {
    const checks: Checks = {
        supabaseAdmin: false,
        paymentsTable: false,
        portoneApi: false,
        portoneWebhookSecret: isDecodableWebhookSecret(process.env.PORTONE_WEBHOOK_SECRET),
        billingCronSecret: (process.env.BILLING_CRON_SECRET?.length ?? 0) >= 32,
        resendApiKey: isValidResendKey(process.env.RESEND_API_KEY),
    };

    let mailConfigBlocked: number | null = null;
    try {
        const admin = createAdminClient();
        const countBlockedMail = async (): Promise<number | null> => {
            try {
                const result = await admin
                    .from("web_notifications")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "failed")
                    .not("next_attempt_at", "is", null)
                    .or("last_error.like.HTTP_401:%,last_error.like.HTTP_403:%");
                if (!result.error) return result.count;
            } catch {
                // 표시에만 쓰는 집계 오류가 기존 boolean 검사에 영향을 주지 않게 한다.
            }
            console.error("[health/billing] mail queue count unavailable");
            return null;
        };
        const [subs, payments, blockedCount] = await Promise.all([
            admin.from("web_subscriptions").select("id").limit(0),
            admin.from("web_payments").select("id").limit(0),
            countBlockedMail(),
        ]);
        checks.supabaseAdmin = !subs.error;
        checks.paymentsTable = !payments.error;
        if (subs.error) console.error("[health/billing] supabaseAdmin failed", subs.error.message);
        if (payments.error) console.error("[health/billing] paymentsTable failed", payments.error.message);
        mailConfigBlocked = blockedCount;
    } catch (e) {
        console.error("[health/billing] supabase admin client unavailable", e);
    }

    if (getPortOneClient()) {
        try {
            // null(PAYMENT_NOT_FOUND) 이면 정상. 인증 실패 등은 throw 된다.
            await findPayment(PROBE_PAYMENT_ID);
            checks.portoneApi = true;
        } catch (e) {
            console.error("[health/billing] portoneApi failed", e);
        }
    }

    return { checks, mailConfigBlocked };
}

export async function GET() {
    if (!cached || Date.now() - cached.at > CACHE_MS) {
        cached = { at: Date.now(), ...(await runChecks()), mailMode: parseMailMode(process.env.MAIL_MODE) };
    }
    const ok = Object.values(cached.checks).every(Boolean);
    // mailMode·mailConfigBlocked 는 표시만 한다 (ok 판정·항목 수에 포함하지 않음).
    return NextResponse.json(
        { ok, checks: cached.checks, mailMode: cached.mailMode, mailConfigBlocked: cached.mailConfigBlocked },
        { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
}
