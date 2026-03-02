import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Naver from "next-auth/providers/naver";
import Kakao from "next-auth/providers/kakao";
import { adapter } from "./src/lib/auth-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter,
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET?.trim() || undefined,
            // For NextAuth v5 to automatically generate the Apple JWT secret
            // @ts-expect-error: teamId is used by AppleProvider dynamic secret generation
            teamId: process.env.AUTH_APPLE_TEAM_ID?.trim() || undefined,
            // @ts-expect-error: keyId is used by AppleProvider dynamic secret generation
            keyId: process.env.AUTH_APPLE_KEY_ID?.trim() || undefined,
            // @ts-expect-error: privateKey is used by AppleProvider dynamic secret generation
            privateKey: process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || undefined,
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
});
