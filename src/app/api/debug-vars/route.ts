import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const vars = {
        AUTH_URL: process.env.AUTH_URL ? "SET" : "MISSING",
        AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "MISSING",
        AUTH_APPLE_ID: process.env.AUTH_APPLE_ID ? "SET" : "MISSING",
        AUTH_APPLE_TEAM_ID: process.env.AUTH_APPLE_TEAM_ID ? "SET" : "MISSING",
        AUTH_APPLE_KEY_ID: process.env.AUTH_APPLE_KEY_ID ? "SET" : "MISSING",
        AUTH_APPLE_PRIVATE_KEY: process.env.AUTH_APPLE_PRIVATE_KEY ? "SET" : "MISSING",
        AUTH_APPLE_PRIVATE_KEY_LENGTH: process.env.AUTH_APPLE_PRIVATE_KEY?.length ?? 0,
        NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json(vars);
}
