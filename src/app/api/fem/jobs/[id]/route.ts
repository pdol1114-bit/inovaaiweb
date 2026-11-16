import { NextResponse } from "next/server";
import { getJobView } from "@/lib/fem/job-service";
import { errorResponse, femContext, internalError, jobIdOr404, NO_STORE } from "@/lib/fem/server";

/** 작업 상태. 워커 조회에 실패하면 `sync: "unavailable"`로 알린다(이전 상태로 숨기지 않는다). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = jobIdOr404((await params).id);
    if (id instanceof NextResponse) return id;
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;
    try {
        const out = await getJobView(ctx.deps, ctx.userId, id);
        if (!out.ok) return errorResponse(out);
        return NextResponse.json(out.job, { headers: NO_STORE });
    } catch (e) {
        return internalError("status", e);
    }
}
