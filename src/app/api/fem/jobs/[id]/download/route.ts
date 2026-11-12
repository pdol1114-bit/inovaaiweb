import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSubscriptionForUser, isSubscriptionActive } from "@/lib/subscription";
import { FEM_PRO_PLAN } from "@/lib/billing/constants";
import { fetchEngineArtifact, isFemEngineConfigured } from "@/lib/fem/engine-client";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format");
    if (format !== "inp" && format !== "msh") {
        return NextResponse.json({ error: "INVALID_FORMAT" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const subscription = await getSubscriptionForUser(supabase, user.id, FEM_PRO_PLAN);
    if (!isSubscriptionActive(subscription)) {
        return NextResponse.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    if (!isFemEngineConfigured()) {
        return NextResponse.json({ error: "ENGINE_NOT_CONFIGURED" }, { status: 503 });
    }

    const admin = createAdminClient();
    const { data: job, error } = await admin
        .from("fem_jobs")
        .select("id, status, engine_job_id, file_name")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !job || !job.engine_job_id) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (job.status !== "completed") {
        return NextResponse.json({ error: "JOB_NOT_COMPLETED" }, { status: 409 });
    }

    const upstream = await fetchEngineArtifact(job.engine_job_id as string, format);
    if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: "ARTIFACT_UNAVAILABLE" }, { status: 502 });
    }

    const baseName = String(job.file_name).replace(/\.[^.]+$/, "") || "mesh";
    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${baseName}.${format}"`,
            "Cache-Control": "private, no-store",
        },
    });
}

