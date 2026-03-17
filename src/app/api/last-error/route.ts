import { NextResponse } from "next/server";
import { errorStore } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({ errors: errorStore });
}
