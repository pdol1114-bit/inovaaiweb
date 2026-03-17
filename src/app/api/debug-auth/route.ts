import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parsePrivateKey(raw: string): string {
    if (!raw) return "";
    if (!raw.includes("-----BEGIN")) {
        try {
            return Buffer.from(raw, "base64").toString("utf-8");
        } catch {
            return raw;
        }
    }
    return raw.replace(/\\n/g, "\n");
}

export async function GET() {
    const rawAppleKey = process.env.AUTH_APPLE_PRIVATE_KEY ?? "";
    const parsedAppleKey = parsePrivateKey(rawAppleKey);

    const isBase64Input = !rawAppleKey.includes("-----BEGIN");

    const envVars = {
        AUTH_URL: process.env.AUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET ? "PRESENT" : "MISSING",
        GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? "PRESENT" : "MISSING",
        APPLE_ID: process.env.AUTH_APPLE_ID,
        APPLE_TEAM_ID: process.env.AUTH_APPLE_TEAM_ID,
        APPLE_KEY_ID: process.env.AUTH_APPLE_KEY_ID,
        APPLE_PRIVATE_KEY_INPUT_FORMAT: isBase64Input ? "BASE64" : "PEM_STRING",
        APPLE_PRIVATE_KEY_RAW_LENGTH: rawAppleKey.length,
        APPLE_PRIVATE_KEY_PARSED_LENGTH: parsedAppleKey.length,
        APPLE_PRIVATE_KEY_NEWLINE_COUNT_AFTER_PARSE: (parsedAppleKey.match(/\n/g) || []).length,
        APPLE_PRIVATE_KEY_PREFIX_AFTER_PARSE: parsedAppleKey.trimStart().startsWith("-----BEGIN PRIVATE KEY-----") ? "VALID" : "INVALID",
        APPLE_PRIVATE_KEY_SUFFIX_AFTER_PARSE: parsedAppleKey.trimEnd().endsWith("-----END PRIVATE KEY-----") ? "VALID" : "INVALID",
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
