import { NextResponse } from "next/server";
import { parsePrivateKey } from "@/lib/auth-utils";
import { SignJWT, importPKCS8 } from "jose";

export const dynamic = "force-dynamic";

export async function GET() {
    const appleId = process.env.AUTH_APPLE_ID?.trim() ?? "";
    const teamId = process.env.AUTH_APPLE_TEAM_ID?.trim() ?? "";
    const keyId = process.env.AUTH_APPLE_KEY_ID?.trim() ?? "";
    const rawKey = process.env.AUTH_APPLE_PRIVATE_KEY ?? "";
    const parsedKey = parsePrivateKey(rawKey);

    const results: Record<string, unknown> = {
        appleId,
        teamId,
        keyId,
        rawKeyLength: rawKey.length,
        parsedKeyLength: parsedKey.length,
        parsedKeyNewlines: (parsedKey.match(/\n/g) || []).length,
        parsedKeyValid: parsedKey.startsWith("-----BEGIN PRIVATE KEY-----") && parsedKey.trim().endsWith("-----END PRIVATE KEY-----"),
    };

    // Try to import the key
    try {
        const privateKey = await importPKCS8(parsedKey, "ES256");
        results.keyImportStatus = "SUCCESS";

        // Try to sign a JWT
        try {
            const now = Math.floor(Date.now() / 1000);
            const clientSecret = await new SignJWT({})
                .setProtectedHeader({ alg: "ES256", kid: keyId })
                .setIssuer(teamId)
                .setIssuedAt(now)
                .setExpirationTime(now + 3600)
                .setAudience("https://appleid.apple.com")
                .setSubject(appleId)
                .sign(privateKey);

            results.jwtSigningStatus = "SUCCESS";
            results.jwtPreview = clientSecret.substring(0, 50) + "...";

            // Test against Apple's token endpoint with a fake code to see what error we get
            const params = new URLSearchParams({
                client_id: appleId,
                client_secret: clientSecret,
                code: "test-invalid-code",
                grant_type: "authorization_code",
                redirect_uri: "https://inovaai.ai/api/auth/callback/apple",
            });

            const appleResponse = await fetch("https://appleid.apple.com/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            });

            const appleData = await appleResponse.json();
            results.appleTokenEndpointStatus = appleResponse.status;
            results.appleTokenEndpointResponse = appleData;
            // If we get "invalid_grant" (not "invalid_client"), the key/credentials are VALID
            // If we get "invalid_client", the credentials themselves are wrong
        } catch (jwtErr) {
            results.jwtSigningStatus = "FAILED";
            results.jwtSigningError = String(jwtErr);
        }
    } catch (importErr) {
        results.keyImportStatus = "FAILED";
        results.keyImportError = String(importErr);
    }

    return NextResponse.json(results);
}
