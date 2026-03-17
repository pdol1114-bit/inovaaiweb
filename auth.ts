import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

// NextAuth v5 configuration
import { adapter } from "@/lib/auth-adapter";
import { firestore } from "@/lib/firebase-admin";

import { parsePrivateKey } from "@/lib/auth-utils";

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
