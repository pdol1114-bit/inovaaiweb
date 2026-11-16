import { NextResponse } from "next/server";
import { startJob } from "@/lib/fem/job-service";
import { errorResponse, femContext, internalError, jobIdOr404, NO_STORE } from "@/lib/fem/server";

/** 업로드가 끝난 작업을 시작한다. 워커가 업로드된 파일을 다시 검증한 뒤 대기열에 넣는다. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = jobIdOr404((await params).id);
    if (id instanceof NextResponse) return id;
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;
    try {
        const out = await startJob(ctx.deps, ctx.userId, id);
        if (!out.ok) return errorResponse(out);
        return NextResponse.json({ id: out.id, status: out.status }, { status: 202, headers: NO_STORE });
    } catch (e) {
        return internalError("start", e);
    }
}
