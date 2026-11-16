import { NextResponse } from "next/server";
import { MAX_CAD_BYTES } from "@/lib/fem/preflight";
import { proxyUpload } from "@/lib/fem/job-service";
import { errorResponse, femContext, internalError, jobIdOr404, NO_STORE } from "@/lib/fem/server";

/**
 * 워커 경유 업로드(로컬 워커 전용). 클라우드 워커는 객체 저장소 직접 업로드 URL을 주므로
 * 이 경로를 쓰지 않는다 — 그 경우 워커가 USE_DIRECT_UPLOAD로 거절한다.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = jobIdOr404((await params).id);
    if (id instanceof NextResponse) return id;
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;

    const length = Number(request.headers.get("content-length"));
    if (!Number.isSafeInteger(length) || length <= 0) {
        return NextResponse.json({ error: "LENGTH_REQUIRED" }, { status: 411 });
    }
    if (length > MAX_CAD_BYTES) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    if (!request.body) return NextResponse.json({ error: "EMPTY_BODY" }, { status: 400 });
    try {
        const out = await proxyUpload(ctx.deps, ctx.userId, id, request.body, length);
        if (!out.ok) return errorResponse(out);
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
    } catch (e) {
        return internalError("upload", e);
    }
}
