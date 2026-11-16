import { NextResponse } from "next/server";
import { createFemAdminClient, createFemClient } from "@/utils/supabase/fem";
import { FEM_PRO_MONTHLY_QUOTA } from "@/lib/billing/constants";
import { getFemSubscription, isFemSubscriptionActive, hasFemAccess, femAccessMode } from "@/lib/fem/membership";
import { inspectSelection, parseEngineSettings } from "@/lib/fem/preflight";
import { getEngineState } from "@/lib/fem/engine-client";
import { getFemMonthlyUsage } from "@/lib/fem/quota";
import { submitJob } from "@/lib/fem/job-service";
import { isUuid } from "@/lib/fem/worker-contract";
import { errorResponse, femContext, internalError, NO_STORE } from "@/lib/fem/server";

/**
 * 화면 상태: FEM 로그인 설정·로그인·구독·엔진 상태(설정/응답/검증)·이번 달 이용량.
 * 로그인은 FEM 전용 프로젝트의 세션만 본다. `account`는 본인 화면에 어느 FEM 계정인지 보여 주는 용도다.
 */
export async function GET() {
    const supabase = await createFemClient();
    const admin = createFemAdminClient();
    const engine = await getEngineState();
    const authConfigured = Boolean(supabase && admin);
    const accessMode = femAccessMode();
    const signedOut = { authConfigured, authenticated: false, account: null, subscribed: false, entitled: false, accessMode, engine, quota: null, limit: FEM_PRO_MONTHLY_QUOTA };
    if (!supabase || !admin) return NextResponse.json(signedOut, { headers: NO_STORE });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(signedOut, { headers: NO_STORE });

    const subscription = await getFemSubscription(admin, user.id);
    const subscribed = isFemSubscriptionActive(subscription);
    // 조회 실패는 null: 화면은 "확인 불가"로 표시하고 실행을 막는다(잔여 횟수를 추정하지 않는다).
    const entitled = hasFemAccess(subscription, accessMode);
    const quota = entitled ? await getFemMonthlyUsage(admin, user.id) : null;

    return NextResponse.json({
        authConfigured,
        authenticated: true,
        account: user.email ?? null,
        subscribed,
        entitled,
        accessMode,
        subscriptionStatus: subscription?.status ?? null,
        engine,
        quota,
        limit: FEM_PRO_MONTHLY_QUOTA,
    }, { headers: NO_STORE });
}

/** 작업 생성: 한도 확인 + 작업 행 생성(원자적) → 워커에 작업 등록 → 업로드 대상 반환. 파일은 받지 않는다. */
export async function POST(request: Request) {
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

    if (!isUuid(body.requestKey)) return NextResponse.json({ error: "INVALID_REQUEST_KEY" }, { status: 400 });
    if (typeof body.fileName !== "string" || typeof body.fileSize !== "number") {
        return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
    }
    const selection = inspectSelection([{ name: body.fileName, size: body.fileSize }]);
    if (!selection.file) return NextResponse.json({ error: "INVALID_FILE", reason: selection.error }, { status: 400 });
    const settings = parseEngineSettings(body.settings);
    if (!settings) return NextResponse.json({ error: "UNSUPPORTED_SETTINGS" }, { status: 400 });

    try {
        const out = await submitJob(ctx.deps, {
            userId: ctx.userId, requestKey: body.requestKey,
            fileName: selection.file.name.slice(0, 200), fileFormat: selection.file.format,
            fileSize: selection.file.size, settings,
        });
        if (!out.ok) return errorResponse(out);
        return NextResponse.json(
            { id: out.id, status: out.status, upload: out.upload, quota: out.quota, duplicate: out.duplicate },
            { status: out.duplicate ? 200 : 201, headers: NO_STORE });
    } catch (e) {
        return internalError("submit", e);
    }
}
