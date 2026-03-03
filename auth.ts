import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";

// We deliberately do NOT import firebase-admin at module level.
// firebase-admin uses Node.js APIs that crash during Next.js build-time page data collection.
// Instead, we use JWT sessions and dynamically import Firebase only inside async callbacks
// (which run at request time, not build time).

export const { handlers, signIn, signOut, auth } = NextAuth({
    // Use JWT-based sessions (no database needed for session storage).
    // This avoids any build-time Firebase initialization issues.
    session: { strategy: "jwt" },
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET?.trim() || undefined,
            teamId: process.env.AUTH_APPLE_TEAM_ID?.trim() || undefined,
            keyId: process.env.AUTH_APPLE_KEY_ID?.trim() || undefined,
            privateKey: process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || undefined,
        } as any),
        Naver({
            clientId: process.env.AUTH_NAVER_ID,
            clientSecret: process.env.AUTH_NAVER_SECRET,
        }),
        Kakao({
            clientId: process.env.AUTH_KAKAO_ID,
            clientSecret: process.env.AUTH_KAKAO_SECRET,
        }),
    ],
    pages: {
        signIn: "/auth",
        error: "/auth",
    },
    callbacks: {
        // Check for provider conflicts: if a user already signed up with Google,
        // they should not be able to log in with Naver/Kakao using the same email.
        async signIn({ user, account }) {
            if (!account || !user.email) return true;

            try {
                // Dynamic import ensures Firebase is never loaded at build time
                const { getApps, initializeApp } = await import("firebase-admin/app");
                const { getFirestore } = await import("firebase-admin/firestore");

                if (!getApps().length) {
                    initializeApp({ projectId: process.env.FBASE_PROJECT_ID || "sniff-by-hatch-app" });
                }
                const db = getFirestore();

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
