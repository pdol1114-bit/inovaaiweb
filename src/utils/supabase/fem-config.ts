/**
 * FEM 전용 Supabase 프로젝트 설정. 순수 모듈(미들웨어·서버·시험 공용).
 *
 * 세션 쿠키 이름을 고정한다. 기본값(`sb-<프로젝트 ref>-auth-token`)은 주소에서 만들어지므로
 * 로컬처럼 두 프로젝트의 호스트가 같으면 기본 프로젝트의 쿠키와 겹친다.
 */
export const FEM_AUTH_COOKIE = "sb-fem-auth-token";

export type FemSupabaseConfig = { url: string; anonKey: string };

const origin = (u: string | undefined): string | null => {
    try {
        return u ? new URL(u).origin : null;
    } catch {
        return null;
    }
};

/** 설정이 없거나, 주소가 잘못됐거나, 기본(Sniff) 프로젝트와 같은 주소면 null. */
export function femSupabaseConfig(
    // 이름을 그대로 적어야 한다: NEXT_PUBLIC_* 는 빌드 때 이 표기로만 치환된다(미들웨어 포함).
    env: Record<string, string | undefined> = {
        NEXT_PUBLIC_FEM_SUPABASE_URL: process.env.NEXT_PUBLIC_FEM_SUPABASE_URL,
        NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
): FemSupabaseConfig | null {
    const url = origin(env.NEXT_PUBLIC_FEM_SUPABASE_URL);
    const anonKey = env.NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    if (url === origin(env.NEXT_PUBLIC_SUPABASE_URL)) return null;
    return { url, anonKey };
}
