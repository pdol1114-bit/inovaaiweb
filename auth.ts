import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { firestore } from "./src/lib/firebase-admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: FirestoreAdapter(firestore),
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
    // The FirestoreAdapter combined with default settings (allowDangerousEmailAccountLinking: false) 
    // automatically throws OAuthAccountNotLinked if the email is already registered via a different provider.
    // We no longer need the cookie-based hack.
});
