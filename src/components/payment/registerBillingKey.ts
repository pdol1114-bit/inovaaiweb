/**
 * 빌링키 등록(+첫 결제) 클라이언트 헬퍼.
 *
 * 데스크톱(결제창 iframe 응답)과 모바일(redirectUrl 복귀 쿼리) 양쪽이 이 함수 하나로
 * /api/billing/register-key 를 호출한다. 서버 전용 모듈을 import 하지 않는다.
 */

export type RegisterOutcome =
    | { kind: "paid"; nextBillingDate: string | null }
    | { kind: "processing" }
    | { kind: "paymentFailed" }
    | { kind: "alreadySubscribed" }
    | { kind: "cancelScheduled" }
    | { kind: "inProgress" }
    | { kind: "invalidCard" }
    | { kind: "unauthorized" }
    | { kind: "notCharged" } // 결제 호출 전 실패 (출금 없음)
    | { kind: "error" };

export async function registerBillingKey(billingKey: string): Promise<RegisterOutcome> {
    let res: Response;
    try {
        res = await fetch("/api/billing/register-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ billing_key: billingKey }),
        });
    } catch {
        // 요청이 서버에 닿았는지 알 수 없다. 결제가 진행됐을 수 있으므로 '확인 중'으로 안내한다.
        return { kind: "processing" };
    }

    const body: { status?: string; error?: string; next_billing_date?: string } = await res
        .json()
        .catch(() => ({}));

    if (res.status === 200 && body.status === "paid") {
        return { kind: "paid", nextBillingDate: body.next_billing_date ?? null };
    }
    if (res.status === 202) return { kind: "processing" };
    if (res.status === 402) return { kind: "paymentFailed" };
    if (res.status === 401) return { kind: "unauthorized" };
    if (res.status === 409) {
        if (body.error === "ALREADY_SUBSCRIBED") return { kind: "alreadySubscribed" };
        if (body.error === "CANCEL_SCHEDULED") return { kind: "cancelScheduled" };
        return { kind: "inProgress" };
    }
    if (res.status === 400 || res.status === 403) return { kind: "invalidCard" };
    // 결제 호출 전 단계 실패는 서버가 따로 표시한다 (출금 없음).
    if (body.error === "PRECHARGE_FAILED" || body.error === "NOT_CONFIGURED") return { kind: "notCharged" };
    // 그 밖의 5xx 는 결제 단계 이후의 예기치 못한 오류일 수 있다.
    return { kind: "error" };
}

/**
 * 모바일 결제창 복귀 쿼리 해석. 포트원은 빌링키 발급 응답 필드를 redirectUrl 의
 * 쿼리로 붙인다 (transactionType, billingKey, code, message).
 * 빌링키 발급 복귀가 아니면 null.
 */
export type BillingKeyRedirect =
    | { kind: "success"; billingKey: string }
    | { kind: "failure"; code: string; message: string | null };

export function readBillingKeyRedirect(search: string): BillingKeyRedirect | null {
    const params = new URLSearchParams(search);
    if (params.get("transactionType") !== "ISSUE_BILLING_KEY") return null;

    const code = params.get("code");
    if (code) return { kind: "failure", code, message: params.get("message") };

    const billingKey = params.get("billingKey");
    if (!billingKey) return { kind: "failure", code: "MISSING_BILLING_KEY", message: null };
    return { kind: "success", billingKey };
}

/** 복귀 쿼리를 주소창에서 지운다 (새로고침 시 재처리 방지). 다른 쿼리는 남긴다. */
export function clearBillingKeyRedirectParams() {
    const url = new URL(window.location.href);
    for (const key of ["transactionType", "billingKey", "billingIssueToken", "code", "message", "pgCode", "pgMessage"]) {
        url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}
