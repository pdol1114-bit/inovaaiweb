import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

// NextAuth v5 configuration
import { adapter } from "@/lib/auth-adapter";
import { firestore } from "@/lib/firebase-admin";

/**
 * Firebase App Hosting may pass private keys with stripped or space-replaced newlines.
 * This helper robustly reconstructs proper PEM format from any input:
 * - base64-encoded string → decode then reconstruct
 * - PEM with literal \n → replace then reconstruct
 * - PEM with real newlines → reconstruct (ensures 64-char wrapping)
 * - PEM with spaces instead of newlines → reconstruct
 */
function parsePrivateKey(raw: string | undefined): string {
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

export const { handlers, signIn, signOut, auth } = NextAuth({
    debug: true,
    adapter,
    // Use JWT-based sessions. The adapter will still manage user/account creation in Firestore.
    session: { strategy: "jwt" },
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        // Apple provider requires teamId/keyId/privateKey; cast needed due to incomplete type definition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Apple({
            clientId: process.env.AUTH_APPLE_ID?.trim() ?? "",
            teamId: process.env.AUTH_APPLE_TEAM_ID?.trim() ?? "",
            keyId: process.env.AUTH_APPLE_KEY_ID?.trim() ?? "",
            privateKey: parsePrivateKey(process.env.AUTH_APPLE_PRIVATE_KEY),
        } as any),
    ],
    pages: {
        signIn: "/auth",
        error: "/auth/error",
    },
    callbacks: {
        async signIn({ user, account }) {
            console.log("[auth] signIn callback:", {
                provider: account?.provider,
                email: user.email,
                id: user.id
            });
            // user.id is not available yet on first Apple login
            // Allow sign-in; adapter will handle user/account creation
            if (!account || !user.email) return true;

            try {
                const db = firestore;
                // Only check for conflicts if we have a valid userId
                if (user.id) {
                    const snapshot = await db
                        .collection("accounts")
                        .where("userId", "==", user.id)
                        .get();

                    if (!snapshot.empty) {
                        const existingAccount = snapshot.docs.find(
                            (doc) => doc.data().provider !== account.provider
                        );
                        if (existingAccount) {
                            const existingProvider = existingAccount.data().provider;
                            return `/auth?error=OAuthAccountNotLinked&provider=${existingProvider}`;
                        }
                    }
                }
            } catch (e) {
                console.error("[auth] signIn callback error:", e);
            }

            return true;
        },
        async jwt({ token, user, account }) {
            // Persist user id and provider into the token on first sign-in
            if (user) {
                token.uid = user.id;
            }
            if (account) {
                token.provider = account.provider;
            }
            return token;
        },
        async session({ session, token }) {
            // Pass uid and provider through to the client session
            if (token.uid) {
                session.user.id = token.uid as string;
            }
            return session;
        },
    },
});
