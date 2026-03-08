import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";

// NextAuth v5 configuration
import { adapter } from "@/lib/auth-adapter";
import { firestore } from "@/lib/firebase-admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter,
    // Use JWT-based sessions. The adapter will still manage user/account creation in Firestore.
    session: { strategy: "jwt" },
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Apple({
            clientId: process.env.AUTH_APPLE_ID?.trim(),
            clientSecret: process.env.AUTH_APPLE_SECRET?.trim(),
            teamId: process.env.AUTH_APPLE_TEAM_ID?.trim(),
            keyId: process.env.AUTH_APPLE_KEY_ID?.trim(),
            privateKey: process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        } as any),
        Naver({
            clientId: process.env.AUTH_NAVER_ID?.trim(),
            clientSecret: process.env.AUTH_NAVER_SECRET?.trim(),
        }),
        Kakao({
            clientId: process.env.AUTH_KAKAO_ID?.trim(),
            clientSecret: process.env.AUTH_KAKAO_SECRET?.trim(),
        }),
    ],
    pages: {
        signIn: "/auth",
        error: "/auth/error",
    },
    callbacks: {
        // Check for provider conflicts: if a user already signed up with Google,
        // they should not be able to log in with Naver/Kakao using the same email.
        async signIn({ user, account }) {
            if (!account || !user.email) return true;

            try {
                // Use the shared firestore instance
                const db = firestore;

                // Query the accounts collection for this email
                const snapshot = await db
                    .collection("accounts")
                    .where("userId", "==", user.id || user.email)
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
            } catch (e) {
                // If Firestore check fails (e.g., first time user), allow sign-in
                console.error("[auth] signIn callback error:", e);
            }

            return true;
        },
    },
});
