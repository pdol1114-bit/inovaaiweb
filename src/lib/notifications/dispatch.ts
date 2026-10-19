import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMailConfig, isRecipientAllowed } from "@/lib/notifications/config";
import { sendViaResend } from "@/lib/notifications/resend";
import { renderNotification } from "@/lib/notifications/templates";

/**
 * 안내 메일 대기열 발송.
 *
 * 즉시 발송(기록 직후)과 cron f 단계가 같은 deliverNotification() 하나를 쓴다.
 * 선점: status ∈ (pending, failed) 이고 attempts 가 읽은 값과 같을 때만 sending 으로 바꾼다.
 *       바뀐 행이 없으면 다른 실행이 가져간 것 → 건너뜀 (동시 실행 중복 발송 방지).
 * Resend Idempotency-Key = notification id (기록 전 중단된 시도의 재발송도 24h 내 중복 없음).
 * 재시도: 최대 5회, 간격 1h·1h·24h·24h. 영구 오류·한도 초과는 failed + next_attempt_at=null.
 * 401·403 설정 오류: attempts 원복, pending + next_attempt_at=1시간 뒤 (한도 미소모).
 *
 * 이 모듈의 함수는 결제 흐름에서 호출돼도 결과·응답·집계를 바꾸지 않도록, 기록 지점은
 * queueAndSend() 로만 호출한다 (모든 예외를 잡고 시간 상한을 둔다).
 * 로그: notification id와 고정 코드만 (주소·키·공급자 응답 원문 미출력).
 */

export const MAX_SEND_ATTEMPTS = 5;
const BACKOFF_MS = [60 * 60e3, 60 * 60e3, 24 * 60 * 60e3, 24 * 60 * 60e3];
const STALE_SENDING_MS = 10 * 60e3;
const CONFIG_RETRY_MS = 60 * 60e3;
const QUEUE_AND_SEND_TIMEOUT_MS = 15_000;
const BATCH_LIMIT = 100;

type Row = {
    id: string;
    user_id: string;
    kind: string;
    payload: Record<string, unknown>;
    status: "pending" | "sending" | "sent" | "failed";
    attempts: number;
    next_attempt_at: string | null;
};

export type DeliverResult =
    | "sent"
    | "failed_retry"
    | "failed_final"
    | "config_blocked"
    | "skipped_disabled"
    | "skipped_not_allowed"
    | "skipped_not_due"
    | "skipped_claimed"
    | "error";

export async function deliverNotification(admin: SupabaseClient, id: string): Promise<DeliverResult> {
    const config = getMailConfig();
    if (!config.enabled) return "skipped_disabled";

    const { data, error } = await admin
        .from("web_notifications")
        .select("id, user_id, kind, payload, status, attempts, next_attempt_at")
        .eq("id", id)
        .maybeSingle();
    if (error || !data) return "error";
    const row = data as Row;

    const now = Date.now();
    const due =
        (row.status === "pending" &&
            (!row.next_attempt_at || new Date(row.next_attempt_at).getTime() <= now)) ||
        (row.status === "failed" &&
            row.attempts < MAX_SEND_ATTEMPTS &&
            !!row.next_attempt_at &&
            new Date(row.next_attempt_at).getTime() <= now);
    if (!due) return "skipped_not_due";

    // 수신 주소는 발송 시점에 조회한다 (payload 에 개인정보를 중복 저장하지 않음).
    let email: string | null = null;
    let recipientMissing = false;
    try {
        const { data: u, error: userError } = await admin.auth.admin.getUserById(row.user_id);
        if (userError && userError.status !== 404) return "error"; // 일시 오류: 선점하지 않음
        email = u?.user?.email ?? null;
        recipientMissing = !email;
    } catch {
        return "error";
    }

    // allowlist 모드에서 목록 밖 수신자는 행을 건드리지 않는다 (운영 사용자 발송 불가).
    if (email && !isRecipientAllowed(config, email)) return "skipped_not_allowed";

    const rendered = renderNotification(row.kind, row.payload ?? {}, config.template!);

    // 선점
    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
        .from("web_notifications")
        .update({ status: "sending", attempts: row.attempts + 1, sending_started_at: claimedAt })
        .eq("id", row.id)
        .eq("status", row.status)
        .eq("attempts", row.attempts)
        // 401·403 후 attempts가 원복돼도 이전 값을 읽은 실행이 대기 시간을 우회하지 못하게 한다.
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${claimedAt}`)
        .select("id");
    if (claimError) return "error";
    if (!claimed || claimed.length === 0) return "skipped_claimed";
    const attemptsNow = row.attempts + 1;

    const finish = async (patch: Record<string, unknown>) => {
        const { error: finishError } = await admin
            .from("web_notifications")
            .update(patch)
            .eq("id", row.id)
            .eq("status", "sending")
            .eq("attempts", attemptsNow)
            .eq("sending_started_at", claimedAt);
        // 기록 실패 시 sending 으로 남고 10분 뒤 복구된다 (재발송은 Idempotency-Key 로 중복 없음).
        if (finishError) console.error(`[mail] id=${row.id} code=MAIL_RESULT_WRITE_FAILED`);
    };
    const log = (code: string) => console.info(`[mail] id=${row.id} code=${code}`);

    if (recipientMissing) {
        await finish({ status: "failed", last_error: "NO_RECIPIENT", next_attempt_at: null });
        log("NO_RECIPIENT");
        return "failed_final";
    }
    if (!rendered) {
        await finish({ status: "failed", last_error: "UNKNOWN_KIND", next_attempt_at: null });
        log("UNKNOWN_KIND");
        return "failed_final";
    }

    const result = await sendViaResend({
        apiKey: config.apiKey!,
        idempotencyKey: row.id,
        from: config.from!,
        to: email!,
        replyTo: config.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
    });

    if (result.ok) {
        await finish({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: result.id,
            last_error: null,
            next_attempt_at: null,
        });
        log("MAIL_SENT");
        return "sent";
    }

    if (result.configurationError) {
        await finish({
            status: "pending",
            attempts: row.attempts,
            last_error: result.code,
            sending_started_at: null,
            next_attempt_at: new Date(Date.now() + CONFIG_RETRY_MS).toISOString(),
        });
        log(result.code);
        return "config_blocked";
    }

    const final = !result.retryable || attemptsNow >= MAX_SEND_ATTEMPTS;
    const delay = Math.max(BACKOFF_MS[Math.min(attemptsNow - 1, BACKOFF_MS.length - 1)], result.minDelayMs ?? 0);
    await finish({
        status: "failed",
        last_error: result.code.slice(0, 300),
        next_attempt_at: final ? null : new Date(Date.now() + delay).toISOString(),
    });
    log(final ? "MAIL_FAILED_FINAL" : "MAIL_FAILED_RETRY");
    return final ? "failed_final" : "failed_retry";
}

/**
 * 결제 흐름의 기록 지점에서 호출. 대기열 기록(dedupe_key 충돌 시 무시) 후 즉시 발송을 시도한다.
 * 어떤 경우에도 throw 하지 않으며 시간 상한을 둔다 → 청구 결과·응답·집계에 영향 없음.
 */
export async function queueAndSend(
    admin: SupabaseClient,
    n: { userId: string; kind: string; payload: Record<string, unknown>; dedupeKey: string }
): Promise<void> {
    const work = (async () => {
        const { data, error } = await admin
            .from("web_notifications")
            .upsert(
                { user_id: n.userId, kind: n.kind, payload: n.payload, dedupe_key: n.dedupeKey },
                { onConflict: "dedupe_key", ignoreDuplicates: true }
            )
            .select("id");
        if (error) {
            console.error("[mail] id=- code=MAIL_QUEUE_FAILED");
            return;
        }
        const id = data?.[0]?.id as string | undefined;
        if (!id) {
            console.info("[mail] id=- code=MAIL_DUPLICATE_IGNORED");
            return;
        }
        const r = await deliverNotification(admin, id);
        if (r !== "sent" && r !== "failed_retry" && r !== "failed_final" && r !== "config_blocked") {
            console.info(`[mail] id=${id} code=MAIL_${r.toUpperCase()}`);
        }
    })();

    try {
        await Promise.race([
            work,
            new Promise<void>((resolve) => setTimeout(resolve, QUEUE_AND_SEND_TIMEOUT_MS)),
        ]);
    } catch {
        console.error("[mail] id=- code=MAIL_QUEUE_EXCEPTION");
    }
    // 시간 상한을 넘겨 남은 작업의 예외도 삼킨다
    work.catch(() => {});
}

/** cron f 단계: 멈춘 sending 복구 → pending·재시도 대상 failed 발송 */
export async function processPendingNotifications(
    admin: SupabaseClient,
    timeUp: () => boolean
): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const add = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);

    const { data: recovered, error: recoverError } = await admin
        .from("web_notifications")
        .update({ status: "pending", sending_started_at: null })
        .eq("status", "sending")
        .lt("sending_started_at", new Date(Date.now() - STALE_SENDING_MS).toISOString())
        .select("id");
    if (recoverError) console.error("[mail] id=- code=MAIL_STALE_RECOVERY_FAILED");
    if (recovered?.length) counts.recovered = recovered.length;

    if (!getMailConfig().enabled) {
        counts.disabled = 1;
        return counts;
    }

    const nowIso = new Date().toISOString();
    const [pending, retry] = await Promise.all([
        admin
            .from("web_notifications")
            .select("id")
            .eq("status", "pending")
            .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
            .order("created_at")
            .limit(BATCH_LIMIT),
        admin
            .from("web_notifications")
            .select("id")
            .eq("status", "failed")
            .lt("attempts", MAX_SEND_ATTEMPTS)
            .lte("next_attempt_at", nowIso)
            .order("next_attempt_at")
            .limit(BATCH_LIMIT),
    ]);
    if (pending.error || retry.error) {
        console.error("[mail] id=- code=MAIL_QUEUE_QUERY_FAILED");
        counts.error = 1;
        return counts;
    }

    for (const r of [...(pending.data ?? []), ...(retry.data ?? [])]) {
        if (timeUp()) {
            counts.truncated = 1;
            break;
        }
        try {
            add(await deliverNotification(admin, r.id as string));
        } catch {
            console.error(`[mail] id=${r.id} code=MAIL_DELIVER_EXCEPTION`);
            add("error");
        }
    }
    return counts;
}
