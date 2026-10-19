import "server-only";

/**
 * Resend 발송 (REST, fetch). 패키지 미사용.
 *
 * Idempotency-Key = notification id. Resend 는 키를 24시간 보관하고, 같은 키·같은 본문이면
 * 원래 응답을 돌려주며 다시 보내지 않는다 → 결과 기록 전에 죽은 시도를 재시도해도 안전.
 *
 * 응답 분기 (https://resend.com/docs/api-reference/errors, …/idempotency-keys)
 *  2xx                                 → sent
 *  409 concurrent_idempotent_requests  → 재시도 (같은 키 요청이 진행 중)
 *  409 resource_locked                 → 재시도
 *  409 invalid_idempotent_request      → 재시도, 단 최소 25시간 뒤 (키 보관 24h 가 지나야
 *                                         통과. 결정적 렌더링이라 본문이 바뀐 경우는 배포로
 *                                         템플릿·설정이 바뀐 때뿐) — 영구 실패로 두지 않음
 *  429 (rate/일·월 할당량)               → 재시도
 *  5xx · 네트워크 · 타임아웃            → 재시도 (멱등 키로 중복 방지)
 *  401 · 403 (키 무효·도메인 미인증 등)  → 설정 오류 (발송 횟수 미소모, 1시간 대기)
 *  404 · 405                           → 재시도 (엔드포인트 문제, 재시도 한도로 종료)
 *  400 · 422 (형식 오류)                → 영구 실패
 */

const ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;
const IDEMPOTENCY_MISMATCH_MIN_DELAY_MS = 25 * 60 * 60 * 1000;

export type SendResult =
    | { ok: true; id: string | null }
    | { ok: false; retryable: boolean; code: string; configurationError?: boolean; minDelayMs?: number };

export async function sendViaResend(params: {
    apiKey: string;
    idempotencyKey: string;
    from: string;
    to: string;
    replyTo: string | null;
    subject: string;
    html: string;
    text: string;
}): Promise<SendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${params.apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": params.idempotencyKey,
            },
            body: JSON.stringify({
                from: params.from,
                to: [params.to],
                ...(params.replyTo ? { reply_to: params.replyTo } : {}),
                subject: params.subject,
                html: params.html,
                text: params.text,
            }),
            signal: controller.signal,
        });
    } catch (e) {
        const aborted = e instanceof Error && e.name === "AbortError";
        return { ok: false, retryable: true, code: aborted ? "TIMEOUT" : "NETWORK_ERROR" };
    } finally {
        clearTimeout(timer);
    }

    // 설정 오류에는 공급자 응답 본문을 읽거나 기록하지 않는다.
    if (res.status === 401 || res.status === 403) {
        return { ok: false, retryable: true, configurationError: true, code: `MAIL_CONFIG_HTTP_${res.status}` };
    }

    const body: { id?: unknown; name?: unknown } = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, id: typeof body.id === "string" ? body.id : null };

    const name = typeof body.name === "string" ? body.name.slice(0, 60) : "unknown";
    const code = `HTTP_${res.status}:${name}`;

    if (res.status === 409) {
        if (name === "invalid_idempotent_request") {
            return { ok: false, retryable: true, code, minDelayMs: IDEMPOTENCY_MISMATCH_MIN_DELAY_MS };
        }
        return { ok: false, retryable: true, code };
    }
    if (res.status === 400 || res.status === 422) return { ok: false, retryable: false, code };
    return { ok: false, retryable: true, code };
}
