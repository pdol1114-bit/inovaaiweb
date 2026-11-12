import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getEngineJobStatus, isFemEngineConfigured } from "@/lib/fem/engine-client";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: job, error } = await admin
        .from("fem_jobs")
        .select("id, user_id, status, engine_job_id, metrics, error_message, created_at, updated_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !job) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (
        (job.status === "queued" || job.status === "running") &&
        job.engine_job_id &&
        isFemEngineConfigured()
    ) {
        try {
            const latest = await getEngineJobStatus(job.engine_job_id as string);
            await admin
                .from("fem_jobs")
                .update({
                    status: latest.status,
                    metrics: latest.metrics ?? job.metrics,
                    error_message: latest.errorMessage ?? null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("user_id", user.id);

            return NextResponse.json({
                id: job.id,
                status: latest.status,
                stage: latest.stage ?? null,
                metrics: latest.metrics ?? job.metrics ?? null,
                errorMessage: latest.errorMessage ?? null,
            });
        } catch (e) {
            console.warn("[fem/jobs/id] failed to sync engine status", id, e);
        }
    }

    return NextResponse.json({
        id: job.id,
        status: job.status,
        stage: null,
        metrics: job.metrics ?? null,
        errorMessage: job.error_message ?? null,
    });
}

