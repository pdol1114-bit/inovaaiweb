import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

// NextAuth v5 configuration
import { adapter } from "@/lib/auth-adapter";
import { firestore } from "@/lib/firebase-admin";
import { parsePrivateKey } from "@/lib/auth-utils";
import * as jose from "jose";

/**
 * Manually generates a Client Secret JWT for Apple.
 * This is more robust than letting NextAuth generate it internally in some environments.
 */
async function getAppleClientSecret() {
    const key = parsePrivateKey(process.env.AUTH_APPLE_PRIVATE_KEY);
    const clientId = process.env.AUTH_APPLE_ID?.trim();
    const teamId = process.env.AUTH_APPLE_TEAM_ID?.trim();
    const keyId = process.env.AUTH_APPLE_KEY_ID?.trim();

    if (!key || !clientId || !teamId || !keyId) {
        console.error("[auth] Missing Apple credentials for clientSecret generation");
        return undefined;
    }

    try {
        const privateKey = await jose.importPKCS8(key, "ES256");
        return await new jose.SignJWT({})
            .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
            .setIssuer(teamId)
            .setIssuedAt()
            .setExpirationTime("1h") // 1 hour expiration
            .setAudience("https://appleid.apple.com")
            .setSubject(clientId)
            .sign(privateKey);
    } catch (e) {
        console.error("[auth] Error generating Apple client secret:", e);
        return undefined;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
    const appleSecret = await getAppleClientSecret();

    return {
        debug: true,
        adapter,
        session: { strategy: "jwt" },
        trustHost: true,
        providers: [
            Google({
                clientId: process.env.AUTH_GOOGLE_ID?.trim(),
                clientSecret: process.env.AUTH_GOOGLE_SECRET?.trim(),
            }),
            Apple({
                clientId: process.env.AUTH_APPLE_ID?.trim(),
                clientSecret: appleSecret,
            }),
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
                if (!account || !user.email) return true;

                try {
                    const db = firestore;
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
                if (user) {
                    token.uid = user.id;
                }
                if (account) {
                    token.provider = account.provider;
                }
                return token;
            },
            async session({ session, token }) {
                if (token.uid) {
                    session.user.id = token.uid as string;
                }
                return session;
            },
        },
    };
});
