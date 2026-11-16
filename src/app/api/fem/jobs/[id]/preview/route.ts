import { NextResponse } from "next/server";
import { getPreview } from "@/lib/fem/job-service";
import { errorResponse, femContext, internalError, jobIdOr404, NO_STORE } from "@/lib/fem/server";

/** 그 작업의 실제 메쉬에서 엔진이 만든 미리보기(viewer.json). 개념도·샘플이 아니다. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = jobIdOr404((await params).id);
    if (id instanceof NextResponse) return id;
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;
    try {
        const out = await getPreview(ctx.deps, ctx.userId, id);
        if (!out.ok) return errorResponse(out);
        if (out.kind === "redirect") {
            return NextResponse.json({ mode: "direct", url: out.url, bytes: out.bytes, sha256: out.sha256 },
                                     { headers: NO_STORE });
        }
        return new NextResponse(out.response.body, {
            status: 200,
            headers: { "Content-Type": "application/json", "Content-Length": String(out.bytes),
                       "X-Content-SHA256": out.sha256, "X-Fem-Preview-Mode": "inline", ...NO_STORE },
        });
    } catch (e) {
        return internalError("preview", e);
    }
}
