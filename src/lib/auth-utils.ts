/**
 * Firebase App Hosting may pass private keys with stripped or space-replaced newlines.
 * This helper robustly reconstructs proper PEM format from any input:
 * - base64-encoded string → decode then reconstruct
 * - PEM with literal \n → replace then reconstruct
 * - PEM with real newlines → reconstruct (ensures 64-char wrapping)
 * - PEM with spaces instead of newlines → reconstruct
 */
export function parsePrivateKey(raw: string | undefined): string {
    if (!raw) return "";

    let str = raw.trim();

    // Step 1: If base64-encoded (no PEM header), decode it first
    if (!str.includes("-----BEGIN")) {
        try {
            str = Buffer.from(str, "base64").toString("utf-8").trim();
        } catch {
            return raw;
        }
    }

    // Step 2: Replace literal \n (backslash + n) with real newlines
    str = str.replace(/\\n/g, "\n");

    // Step 3: Extract header, body data, and footer, then reconstruct.
    // This handles cases where Cloud Run stripped/replaced newlines with spaces.
    const beginMatch = str.match(/-----BEGIN[^-]+-----/);
    const endMatch = str.match(/-----END[^-]+-----/);

    if (beginMatch && endMatch) {
        const header = beginMatch[0];
        const footer = endMatch[0];
        // Get everything between header and footer, strip all whitespace
        const rawBody = str
            .slice(str.indexOf(header) + header.length, str.lastIndexOf(footer))
            .replace(/\s/g, "");
        // Re-wrap at 64 chars per PEM standard
        const wrappedBody = rawBody.match(/.{1,64}/g)?.join("\n") ?? rawBody;
        return `${header}\n${wrappedBody}\n${footer}`;
    }

    return str;
}
