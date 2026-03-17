import { handlers } from "../../../../../auth";

// Force this route to be server-rendered at request time, never at build time.
// This prevents Firebase Admin from being initialized without credentials during the GCP build.
export const dynamic = "force-dynamic";

/**
 * Modifies Set-Cookie headers on NextAuth responses so that the state and nonce
 * cookies used for OAuth CSRF protection are set with SameSite=None; Secure.
 *
 * WHY: Apple Sign In uses response_mode=form_post, which is a cross-origin POST.
 * Browsers do not send SameSite=Lax cookies on cross-origin POSTs, so NextAuth
 * cannot read back the state/nonce it stored, causing a CallbackRouteError.
 * NextAuth v5 beta.30 has a bug where the `cookies` config option causes
 * a Configuration error, so we patch the response headers here instead.
 */
function patchCookies(response: Response): Response {
    const cookieHeaders: string[] = [];
    response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
            cookieHeaders.push(value);
        }
    });

    if (cookieHeaders.length === 0) return response;

    // Check if any auth state/nonce cookies need patching
    const needsPatch = cookieHeaders.some(
        (c) =>
            (c.includes("authjs.state") || c.includes("authjs.nonce")) &&
            /samesite=lax/i.test(c)
    );
    if (!needsPatch) return response;

    const newHeaders = new Headers(response.headers);
    // Remove all existing set-cookie headers (we'll re-add patched versions)
    newHeaders.delete("set-cookie");

    for (const cookie of cookieHeaders) {
        if (
            (cookie.includes("authjs.state") || cookie.includes("authjs.nonce")) &&
            /samesite=lax/i.test(cookie)
        ) {
            // Replace SameSite=Lax with SameSite=None and ensure Secure is present
            const patched = cookie
                .replace(/;\s*SameSite=Lax/i, "; SameSite=None")
                + (/;\s*Secure/i.test(cookie) ? "" : "; Secure");
            newHeaders.append("set-cookie", patched);
        } else {
            newHeaders.append("set-cookie", cookie);
        }
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}

export async function GET(req: Request) {
    return patchCookies(await handlers.GET(req));
}

export async function POST(req: Request) {
    return patchCookies(await handlers.POST(req));
}
