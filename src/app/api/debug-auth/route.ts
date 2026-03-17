import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const rawAppleKey = process.env.AUTH_APPLE_PRIVATE_KEY ?? "";
    const parsedAppleKey = rawAppleKey.replace(/\\n/g, "\n");

    const envVars = {
        AUTH_URL: process.env.AUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET ? "PRESENT" : "MISSING",
        GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? "PRESENT" : "MISSING",
        APPLE_ID: process.env.AUTH_APPLE_ID,
        APPLE_TEAM_ID: process.env.AUTH_APPLE_TEAM_ID,
        APPLE_KEY_ID: process.env.AUTH_APPLE_KEY_ID,
        APPLE_PRIVATE_KEY_RAW_LENGTH: rawAppleKey.length,
        APPLE_PRIVATE_KEY_PARSED_LENGTH: parsedAppleKey.length,
        APPLE_PRIVATE_KEY_NEWLINE_COUNT: (parsedAppleKey.match(/\n/g) || []).length,
        APPLE_PRIVATE_KEY_PREFIX: rawAppleKey.startsWith("-----BEGIN PRIVATE KEY-----") ? "VALID" : "INVALID",
        APPLE_PRIVATE_KEY_SUFFIX: rawAppleKey.trim().endsWith("-----END PRIVATE KEY-----") ? "VALID" : "INVALID",
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
