import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { SNIFF_PREMIUM_MONTHLY_PRICE, SNIFF_PREMIUM_ORDER_NAME } from "@/lib/billing/constants";
import {
    deleteKeySafely,
    resolvePendingPayment,
    type SettleContext,
} from "@/lib/billing/settlement";
import { requestBillingKeyCharge, verifyIssuedBillingKey } from "@/lib/portone/server";

/**
 * 카드 등록 직후 첫 결제(즉시 청구).
 *
 * 흐름: 빌링키 검증 → pending 행 insert(사용자 잠금) → 구독 상태 재확인 →
 *       빌링키 결제 → 결제 조회로 확정 → paid 면 구독 활성화 / failed 면 정리.
 *
 * 이중 청구 방지 (3겹)
 *  1) 0007 의 부분 unique(user_id where status='pending') — 동시 요청 중 하나만 진행
 *  2) 잠금을 잡은 뒤 구독 상태를 재확인 — 먼저 끝난 요청이 이미 활성화했으면 중단
 *  3) 시도별 고정 paymentId — 같은 ID 재요청은 포트원이 ALREADY_PAID 로 거절
 *
 * 쓰기는 모두 서버 권한 클라이언트로 하며 user_id 는 세션에서 얻은 값만 쓴다.
 */

const STALE_PENDING_MS = 5 * 60 * 1000;
const PG_UNIQUE_VIOLATION = "23505";

/**
 * 첫 결제 paymentId: "spi" + 하이픈 없는 UUID v4 (35자, 영숫자만).
 * KCP 는 paymentId 최대 40자, 한글·특수문자 미지원이라 밑줄·하이픈을 쓰지 않는다.
 * 시도마다 새로 만들고 결제 호출 전에 DB 에 먼저 저장한다.
 */
export function newInitialPaymentId(): string {
    return `spi${randomUUID().replace(/-/g, "")}`;
}

/**
 * 결제 호출 전 단계에서 실패했다 — 포트원 결제는 요청되지 않았고 출금도 없다.
 * 라우트는 이를 500 PRECHARGE_FAILED 로, 결제 단계 이후의 예외는 SERVER_ERROR 로 구분한다.
 */
export class PreChargeError extends Error {
    constructor(cause: unknown) {
        super(`PRECHARGE_FAILED: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        this.name = "PreChargeError";
    }
}

export type InitialChargeResult =
    | { status: "paid"; nextBillingDate: string }
    | { status: "processing" }
    | { status: "failed" }
    | { status: "invalid_billing_key"; reason: "NOT_FOUND" | "NOT_ISSUED" | "CUSTOMER_MISMATCH" }
    | { status: "conflict"; reason: "ALREADY_SUBSCRIBED" | "CANCEL_SCHEDULED" | "IN_PROGRESS" };

type Outcome = { kind: "paid"; nextBillingDate: string } | { kind: "failed" } | { kind: "pending" };

export async function chargeInitialSubscription(params: {
    user: User;
    billingKey: string;
}): Promise<InitialChargeResult> {
    const { user, billingKey } = params;

    // 1) 빌링키 검증: 발급 완료 + 고객 ID = 세션 사용자
    let verification: Awaited<ReturnType<typeof verifyIssuedBillingKey>>;
    try {
        verification = await verifyIssuedBillingKey(billingKey, user.id);
    } catch (e) {
        // 포트원 통신 오류 등. 소유자를 확인하지 못한 키이므로 삭제하지 않는다.
        throw new PreChargeError(e);
    }
    if (!verification.ok) {
        return { status: "invalid_billing_key", reason: verification.reason };
    }

    // 2~3) 결제 호출 전 단계. 여기서 예외가 나면 결제는 일어나지 않았으므로
    //      잡은 잠금을 풀고, 검증까지 끝난 새 빌링키를 삭제한 뒤 다시 던진다.
    //      (IN_PROGRESS 는 예외가 아니라 반환값이라 삭제하지 않는다 — 먼저 진행 중인
    //       요청이 같은 빌링키로 결제하고 있을 수 있다.)
    let admin: SupabaseClient | null = null;
    let paymentId: string | null = null;
    try {
        admin = createAdminClient();

        // 2) 사용자 잠금 (pending 행)
        const lock = await acquirePendingLock(admin, user.id);
        if (!lock.ok) return { status: "conflict", reason: "IN_PROGRESS" };
        paymentId = lock.paymentId;

        // 3) 잠금 후 구독 상태 재확인
        const blocking = await findBlockingSubscription(admin, user.id);
        if (blocking) {
            await releaseUnusedLock(admin, user.id, paymentId);
            // 이미 구독 중인 카드와 다른 새 빌링키는 쓸 곳이 없으므로 정리한다.
            if (blocking.billingKey !== billingKey) {
                await deleteKeySafely(billingKey, "중복 카드 등록");
            }
            return { status: "conflict", reason: blocking.reason };
        }
    } catch (e) {
        if (admin && paymentId) await releaseUnusedLock(admin, user.id, paymentId);
        await deleteKeySafely(billingKey, "결제 전 단계 실패");
        throw new PreChargeError(e);
    }

    // 4) 빌링키 결제
    const requestResult = await requestBillingKeyCharge({
        paymentId,
        billingKey,
        orderName: SNIFF_PREMIUM_ORDER_NAME,
        amount: SNIFF_PREMIUM_MONTHLY_PRICE,
        customer: {
            id: user.id,
            email: user.email ?? undefined,
            fullName: displayName(user),
        },
    });
    if (requestResult.kind !== "accepted") {
        console.warn("[billing/initial] charge request not accepted", {
            paymentId,
            kind: requestResult.kind,
            reason: requestResult.reason,
        });
    }

    // 5) 결제 조회로 확정하고 결과 반영
    const outcome = await settleAttempt(admin, {
        userId: user.id,
        paymentId,
        billingKey,
        card: verification.card,
        requestResult,
        isStale: false,
    });

    if (outcome.kind === "paid") return { status: "paid", nextBillingDate: outcome.nextBillingDate };
    if (outcome.kind === "failed") return { status: "failed" };
    return { status: "processing" };
}

// ---------------------------------------------------------------------------

async function acquirePendingLock(
    admin: SupabaseClient,
    userId: string
): Promise<{ ok: true; paymentId: string } | { ok: false }> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const paymentId = newInitialPaymentId();
        const { error } = await admin.from("web_payments").insert({
            payment_id: paymentId,
            user_id: userId,
            amount: SNIFF_PREMIUM_MONTHLY_PRICE,
            currency: "KRW",
            status: "pending",
        });

        if (!error) return { ok: true, paymentId };
        if (error.code !== PG_UNIQUE_VIOLATION) {
            throw new Error(`[billing/initial] failed to create pending payment: ${error.message}`);
        }

        // 다른 pending 이 있다. 5분이 넘었으면 포트원 조회로 정리한 뒤 한 번 더 시도한다.
        if (attempt > 0) break;
        const { data: existing, error: readError } = await admin
            .from("web_payments")
            .select("payment_id, created_at")
            .eq("user_id", userId)
            .eq("status", "pending")
            .maybeSingle();
        if (readError) throw new Error(`[billing/initial] failed to read pending payment: ${readError.message}`);
        if (!existing) continue; // 그 사이 정리됨

        const age = Date.now() - new Date(existing.created_at as string).getTime();
        if (age < STALE_PENDING_MS) break;

        const outcome = await settleAttempt(admin, {
            userId,
            paymentId: existing.payment_id as string,
            isStale: true,
        });
        if (outcome.kind === "pending") break;
    }
    return { ok: false };
}

/**
 * 결제를 진행하면 안 되는 구독 상태인지.
 * - active
 * - cancel_scheduled 이면서 이용 종료일이 아직 안 지남 (해지취소로 안내)
 * cancel_scheduled 이면서 종료일이 지났으면 만료로 보고 결제를 진행한다.
 * past_due(미납)도 만료와 같이 취급해 첫 결제로 재구독시킨다. 성공 시 기준일·결제일을
 * 새로 쓰고 재시도 상태를 지우며, 미납 회차는 청구하지 않는다 (settlement.activateSubscription).
 * 배치 재시도와의 경합은 사용자 pending 잠금(0007)과 배치 쪽 잠금 후 재확인이 막는다.
 */
async function findBlockingSubscription(
    admin: SupabaseClient,
    userId: string
): Promise<{ reason: "ALREADY_SUBSCRIBED" | "CANCEL_SCHEDULED"; billingKey: string | null } | null> {
    const { data, error } = await admin
        .from("web_subscriptions")
        .select("status, service_end_date, billing_key")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw new Error(`[billing/initial] failed to read subscription: ${error.message}`);
    if (!data) return null;

    const billingKey = (data.billing_key as string | null) ?? null;
    if (data.status === "active") return { reason: "ALREADY_SUBSCRIBED", billingKey };
    if (data.status === "past_due") return null;
    if (data.status === "cancel_scheduled") {
        const end = data.service_end_date ? new Date(data.service_end_date as string) : null;
        // 종료일이 없으면 판단할 수 없으므로 보수적으로 막는다.
        if (!end || end.getTime() > Date.now()) return { reason: "CANCEL_SCHEDULED", billingKey };
    }
    return null;
}

/** 결제를 호출하지 않은 잠금 행은 결제 기록이 아니므로 지운다. */
async function releaseUnusedLock(admin: SupabaseClient, userId: string, paymentId: string) {
    const { error } = await admin
        .from("web_payments")
        .delete()
        .eq("payment_id", paymentId)
        .eq("user_id", userId)
        .eq("status", "pending");
    if (error) console.error("[billing/initial] failed to release unused lock", paymentId, error);
}

// ---------------------------------------------------------------------------

/**
 * 요청 경로용 확정. 공통 확정 로직의 일시 오류를 잡아 pending('확인 중')으로 바꾼다.
 * pending 으로 남은 결제 행은 5분 뒤 정리 경로나 웹훅이 다시 확정한다.
 */
async function settleAttempt(admin: SupabaseClient, ctx: SettleContext): Promise<Outcome> {
    try {
        const outcome = await resolvePendingPayment(admin, ctx);
        if (outcome.kind === "needs_review") return { kind: "pending" };
        return outcome;
    } catch (e) {
        console.error("[billing/initial] settle failed; leaving pending", ctx.paymentId, e);
        return { kind: "pending" };
    }
}

function displayName(user: User): string | undefined {
    const meta = user.user_metadata ?? {};
    const name = meta.full_name ?? meta.name;
    return typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined;
}
