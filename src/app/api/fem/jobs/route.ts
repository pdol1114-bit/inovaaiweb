import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSubscriptionForUser, isSubscriptionActive } from "@/lib/subscription";
import { FEM_PRO_MONTHLY_QUOTA, FEM_PRO_PLAN } from "@/lib/billing/constants";
import { inspectSelection, validSettings, type MeshSettings } from "@/lib/fem/preflight";
import { isFemEngineConfigured, submitEngineMeshJob } from "@/lib/fem/engine-client";
import { getFemMonthlyUsage } from "@/lib/fem/quota";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const engineConfigured = isFemEngineConfigured();

    if (!user) {
        return NextResponse.json({
            authenticated: false,
            subscribed: false,
            engineConfigured,
            quota: { used: 0, limit: FEM_PRO_MONTHLY_QUOTA, remaining: 0 },
        });
    }

    const subscription = await getSubscriptionForUser(supabase, user.id, FEM_PRO_PLAN);
    const subscribed = isSubscriptionActive(subscription);
    const admin = createAdminClient();
    const quota = subscribed
        ? await getFemMonthlyUsage(admin, user.id)
        : { used: 0, limit: FEM_PRO_MONTHLY_QUOTA, remaining: 0 };

    return NextResponse.json({
        authenticated: true,
        subscribed,
        subscriptionStatus: subscription?.status ?? null,
        engineConfigured,
        quota,
    });
}

export async function POST(request: Request) {
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
    const quota = await getFemMonthlyUsage(admin, user.id);
    if (quota.remaining <= 0) {
        return NextResponse.json(
            { error: "QUOTA_EXCEEDED", quota },
            { status: 429 }
        );
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "INVALID_FORM_DATA" }, { status: 400 });
    }

    const fileEntry = formData.get("file");
    const rawSettings = formData.get("settings");
    if (!(fileEntry instanceof File) || typeof rawSettings !== "string") {
        return NextResponse.json({ error: "MISSING_FILE_OR_SETTINGS" }, { status: 400 });
    }

    const selection = inspectSelection([{ name: fileEntry.name, size: fileEntry.size }]);
    if (!selection.file || selection.error) {
        return NextResponse.json({ error: selection.error ?? "INVALID_FILE" }, { status: 400 });
    }

    let parsedSettings: MeshSettings;
    try {
        parsedSettings = JSON.parse(rawSettings) as MeshSettings;
    } catch {
        return NextResponse.json({ error: "INVALID_SETTINGS" }, { status: 400 });
    }
    if (!validSettings(parsedSettings)) {
        return NextResponse.json({ error: "INVALID_SETTINGS" }, { status: 400 });
    }

    const { data: jobRow, error: insertError } = await admin
        .from("fem_jobs")
        .insert({
            user_id: user.id,
            plan: FEM_PRO_PLAN,
            status: "queued",
            file_name: selection.file.name,
            file_format: selection.file.format,
            file_size_bytes: selection.file.size,
            settings: parsedSettings,
        })
        .select("id")
        .single();

    if (insertError || !jobRow) {
        console.error("[fem/jobs] failed to create job row", insertError?.message);
        return NextResponse.json({ error: "JOB_CREATE_FAILED" }, { status: 500 });
    }

    const jobId = jobRow.id as string;

    try {
        const engineRes = await submitEngineMeshJob({
            jobId,
            userId: user.id,
            file: fileEntry,
            settings: {
                size: Number(parsedSettings.size),
                unit: parsedSettings.unit,
                strategy: parsedSettings.strategy,
                order: parsedSettings.order,
                jacobian: Number(parsedSettings.jacobian),
                aspect: Number(parsedSettings.aspect),
            },
        });

        await admin
            .from("fem_jobs")
            .update({
                engine_job_id: engineRes.engineJobId,
                status: engineRes.status,
                metrics: engineRes.metrics ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId)
            .eq("user_id", user.id);

        return NextResponse.json(
            {
                id: jobId,
                status: engineRes.status,
                metrics: engineRes.metrics ?? null,
                quota: {
                    used: quota.used + 1,
                    limit: quota.limit,
                    remaining: Math.max(0, quota.remaining - 1),
                },
            },
            { status: 201 }
        );
    } catch (e) {
        const message = e instanceof Error ? e.message : "ENGINE_ERROR";
        await admin
            .from("fem_jobs")
            .update({
                status: "failed",
                error_message: message.slice(0, 500),
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId)
            .eq("user_id", user.id);

        console.error("[fem/jobs] engine submit failed", jobId, message);
        return NextResponse.json({ error: "ENGINE_SUBMIT_FAILED", id: jobId }, { status: 502 });
    }
}

