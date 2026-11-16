import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { FEM_AUTH_COOKIE, femSupabaseConfig } from "./fem-config";

/**
 * FEM 전용 Supabase 프로젝트의 서버 클라이언트.
 *
 * FEM 회원(계정·세션)과 FEM 작업 이력은 Sniff·결제용 기본 프로젝트(`./server`, `./admin`)와
 * **다른 프로젝트**에 있다. 두 프로젝트의 사용자 ID는 서로 무관하므로 섞어 쓰지 않는다:
 * FEM API는 이 파일의 클라이언트만 쓰고, 기본 프로젝트의 세션은 FEM 권한으로 인정하지 않는다.
 *
 * 설정(`NEXT_PUBLIC_FEM_SUPABASE_URL`, `NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY`)이 없거나 기본 프로젝트와
 * 같은 주소면 null — 호출부는 "FEM 로그인 준비 중"으로 처리하고 실행을 막는다(기본 프로젝트로 대신 붙지 않는다).
 */
export async function createFemClient(): Promise<SupabaseClient | null> {
    const cfg = femSupabaseConfig();
    if (!cfg) return null;
    const cookieStore = await cookies();
    return createServerClient(cfg.url, cfg.anonKey, {
        cookieOptions: { name: FEM_AUTH_COOKIE },
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // 서버 컴포넌트에서 호출된 경우. 세션 갱신은 미들웨어가 한다.
                }
            },
        },
    });
}

/**
 * FEM 프로젝트의 service role 클라이언트(RLS 우회). 사용자 식별에는 쓰지 않는다 —
 * 사용자는 `createFemClient().auth.getUser()`로 확인하고 모든 쿼리를 그 ID로 한정한다.
 * 키는 `FEM_SUPABASE_SERVICE_ROLE_KEY`(RUNTIME 전용 시크릿). 기본 프로젝트의 키와 다르다.
 */
export function createFemAdminClient(): SupabaseClient | null {
    const cfg = femSupabaseConfig();
    const key = process.env.FEM_SUPABASE_SERVICE_ROLE_KEY;
    if (!cfg || !key) return null;
    return createSupabaseClient(cfg.url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}
