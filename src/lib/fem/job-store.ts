import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEM_PRO_MONTHLY_QUOTA, FEM_PRO_PLAN } from "@/lib/billing/constants";
import { currentKstMonthStartIso } from "./quota";
import type { JobPatch, JobRow, JobStore } from "./job-service";
import type { JobStatus, WorkerMetrics } from "./worker-contract";

const COLUMNS = "id, user_id, status, result, error_code, metrics, file_name, counts_toward_quota";

type DbRow = {
    id: string; user_id: string; status: string; result: string | null; error_code: string | null;
    metrics: WorkerMetrics | null; file_name: string; counts_toward_quota: boolean;
};

function toRow(r: DbRow): JobRow {
    return {
        id: r.id, userId: r.user_id, status: r.status as JobStatus, result: r.result,
        errorCode: r.error_code, metrics: r.metrics, fileName: r.file_name,
        countsTowardQuota: r.counts_toward_quota,
    };
}

/**
 * Supabase(fem_jobs) 저장소. service role 클라이언트를 쓰므로 모든 쿼리를 `user_id`로 한정한다.
 * 한도 확인 + 행 생성은 DB 함수 `fem_reserve_job`(마이그레이션 0012)가 한 트랜잭션에서 처리한다.
 */
export function createSupabaseJobStore(admin: SupabaseClient): JobStore {
    return {
        async reserve(p) {
            const { data, error } = await admin.rpc("fem_reserve_job", {
                p_user_id: p.userId,
                p_request_key: p.requestKey,
                p_plan: FEM_PRO_PLAN,
                p_file_name: p.fileName,
                p_file_format: p.fileFormat,
                p_file_size_bytes: p.fileSize,
                p_settings: p.settings,
                p_month_start: currentKstMonthStartIso(),
                p_monthly_limit: FEM_PRO_MONTHLY_QUOTA,
            });
            if (error || !data) {
                throw new Error(`[fem/job-store] reserve failed: ${error?.code ?? "no data"}`);
            }
            const d = data as { kind: string; used: number; job: DbRow | null };
            const quota = {
                used: d.used, limit: FEM_PRO_MONTHLY_QUOTA,
                remaining: Math.max(0, FEM_PRO_MONTHLY_QUOTA - d.used),
            };
            if (d.kind === "quota_exceeded" || !d.job) return { kind: "quota_exceeded", quota };
            if (d.kind !== "created" && d.kind !== "existing") {
                throw new Error("[fem/job-store] unexpected reserve result");
            }
            return { kind: d.kind, row: toRow(d.job), quota };
        },

        async get(userId, id) {
            const { data, error } = await admin
                .from("fem_jobs").select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
            if (error) throw new Error(`[fem/job-store] get failed: ${error.code}`);
            return data ? toRow(data as DbRow) : null;
        },

        async update(userId, id, patch: JobPatch) {
            const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (patch.status !== undefined) row.status = patch.status;
            if (patch.result !== undefined) row.result = patch.result;
            if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
            if (patch.metrics !== undefined) row.metrics = patch.metrics;
            if (patch.countsTowardQuota !== undefined) row.counts_toward_quota = patch.countsTowardQuota;
            const { error } = await admin.from("fem_jobs").update(row).eq("id", id).eq("user_id", userId);
            if (error) throw new Error(`[fem/job-store] update failed: ${error.code}`);
        },
    };
}
