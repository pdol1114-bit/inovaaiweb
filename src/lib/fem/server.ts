import "server-only";
import { NextResponse } from "next/server";
import { createFemAdminClient, createFemClient } from "@/utils/supabase/fem";
import { getWorkerClient } from "./engine-client";
import { createSupabaseJobStore } from "./job-store";
import { getFemSubscription, hasFemAccess, femAccessMode } from "./membership";
import type { Deps, ServiceError } from "./job-service";
import { isUuid } from "./worker-contract";

export type FemContext = { userId: string; deps: Deps };

/**
 * FEM API 공통 관문: FEM 프로젝트 설정 → FEM 로그인(서버 세션) → FEM 구독 → 워커 설정 순서로 확인한다.
 *
 * 사용자 ID는 여기서 확인한 **FEM 프로젝트의 세션** 값만 쓴다. 요청 본문·쿼리·헤더의 사용자 ID는 받지 않고,
 * 기본(Sniff) 프로젝트의 로그인·구독은 FEM 권한으로 인정하지 않는다.
 */
export async function femContext(): Promise<FemContext | NextResponse> {
    const supabase = await createFemClient();
    const admin = createFemAdminClient();
    if (!supabase || !admin) return NextResponse.json({ error: "FEM_AUTH_NOT_CONFIGURED" }, { status: 503 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!hasFemAccess(await getFemSubscription(admin, user.id), femAccessMode())) {
        return NextResponse.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }
    const worker = getWorkerClient();
    if (!worker) return NextResponse.json({ error: "ENGINE_NOT_CONFIGURED" }, { status: 503 });

    return { userId: user.id, deps: { store: createSupabaseJobStore(admin), worker } };
}

export function jobIdOr404(id: string): string | NextResponse {
    return isUuid(id) ? id : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
}

export function errorResponse(e: ServiceError): NextResponse {
    return NextResponse.json({ error: e.error, ...(e.detail ?? {}) }, { status: e.http, headers: NO_STORE });
}

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** 서버 내부 오류: 원인(예외 메시지·워커 응답)은 클라이언트로 내보내지 않는다. */
export function internalError(where: string, e: unknown): NextResponse {
    console.error(`[fem] ${where} failed:`, e instanceof Error ? e.name : "error");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500, headers: NO_STORE });
}
