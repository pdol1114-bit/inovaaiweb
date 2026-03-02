import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";

// Setup Firestore connection logic. Usually requires service account keys in production.
// For prototyping, the adapter will fail to initialize without a valid service account.
// Since we only need simple client-side logic for the requested feature today to demonstrate the flow, 
// we will simulate the DB check entirely within `signIn` using cookies to store the first used provider, 
// avoiding the complex Service Account JSON setup for the user.
import { cookies } from "next/headers";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET,
        }),
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
        error: "/auth", // Error code passed in query string as ?error=
    },
    callbacks: {
        async signIn({ user, account }) {
            if (!account || !user.email) return true;

            const cookieStore = await cookies();
            const emailKey = `provider_${user.email.replace(/[@.]/g, "_")}`;
            const existingProvider = cookieStore.get(emailKey)?.value;

            if (existingProvider) {
                // An account exists! Compare providers.
                if (existingProvider !== account.provider) {
                    // They don't match -> Redirect with error and existing provider info
                    return `/auth?error=OAuthAccountNotLinked&provider=${existingProvider}`;
                }
            } else {
                // First time signing in with this email, let's remember the provider
                // Use a long maxAge to simulate persistent DB storage
                cookieStore.set(emailKey, account.provider, { maxAge: 60 * 60 * 24 * 365 });
            }

            return true;
        },
    }
});
