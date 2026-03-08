import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const envVars = {
        AUTH_URL: process.env.AUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET ? "PRESENT" : "MISSING",
        GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? "PRESENT" : "MISSING",
        KAKAO_ID: process.env.AUTH_KAKAO_ID ? "PRESENT" : "MISSING",
        NAVER_ID: process.env.AUTH_NAVER_ID ? "PRESENT" : "MISSING",
        APPLE_ID: process.env.AUTH_APPLE_ID ? "PRESENT" : "MISSING",
        APPLE_TEAM_ID: process.env.AUTH_APPLE_TEAM_ID ? "PRESENT" : "MISSING",
        APPLE_KEY_ID: process.env.AUTH_APPLE_KEY_ID ? "PRESENT" : "MISSING",
        APPLE_PRIVATE_KEY: process.env.AUTH_APPLE_PRIVATE_KEY ?
            (process.env.AUTH_APPLE_PRIVATE_KEY.startsWith("-----BEGIN PRIVATE KEY-----") ? "VALID_PREFIX" : "INVALID_PREFIX") : "MISSING",
        FBASE_PROJECT_ID: process.env.FBASE_PROJECT_ID,
        FBASE_CLIENT_EMAIL: process.env.FBASE_CLIENT_EMAIL ? "PRESENT" : "MISSING",
        FBASE_PRIVATE_KEY: process.env.FBASE_PRIVATE_KEY ? "PRESENT" : "MISSING",
    };

    return NextResponse.json({
        message: "Auth Debug Info",
        timestamp: new Date().toISOString(),
        env: envVars,
    });
}
