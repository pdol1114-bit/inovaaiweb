import { NextResponse } from "next/server";
import { getArtifact } from "@/lib/fem/job-service";
import { errorResponse, femContext, internalError, jobIdOr404, NO_STORE } from "@/lib/fem/server";

/** 완료된 해당 작업의 실제 INP/MSH. 소유권은 DB 행(user_id)과 워커 양쪽에서 확인된다. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = jobIdOr404((await params).id);
    if (id instanceof NextResponse) return id;
    const format = new URL(request.url).searchParams.get("format");
    if (format !== "inp" && format !== "msh") {
        return NextResponse.json({ error: "INVALID_FORMAT" }, { status: 400 });
    }
    const ctx = await femContext();
    if (ctx instanceof NextResponse) return ctx;
    try {
        const out = await getArtifact(ctx.deps, ctx.userId, id, format);
        if (!out.ok) return errorResponse(out);
        if (out.kind === "redirect") {
            // 짧게 유효한 서명 URL로 보낸다(파일은 웹 서버를 거치지 않는다).
            return new NextResponse(null, { status: 303, headers: { Location: out.url, ...NO_STORE } });
        }
        return new NextResponse(out.response.body, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(out.bytes),
                "Content-Disposition": `attachment; filename="mesh.${format}"`,
                "X-Content-SHA256": out.sha256,
                ...NO_STORE,
            },
        });
    } catch (e) {
        return internalError("download", e);
    }
}
