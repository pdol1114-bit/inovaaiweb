import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * service role 키를 쓰는 서버 전용 Supabase 클라이언트. RLS 를 우회한다.
 *
 * - 사용자 식별에는 쓰지 않는다. 사용자는 항상 세션 클라이언트(`./server`)의
 *   `auth.getUser()` 로 확인하고, 그 user.id 로만 쓰기 대상을 한정할 것.
 * - RLS 가 걸러 주지 않으므로 모든 쓰기 쿼리에 `.eq("user_id", user.id)` 같은
 *   대상 한정 조건을 직접 넣어야 한다.
 * - `server-only` 때문에 클라이언트 컴포넌트에서 import 하면 빌드가 실패한다.
 *   키는 NEXT_PUBLIC_ 이 아닌 RUNTIME 전용 시크릿으로만 주입한다.
 *
 * 키가 없을 때 모듈 로드 시점이 아니라 호출 시점에 실패하도록 함수로 둔다
 * (빌드 단계에는 RUNTIME 시크릿이 없다).
 */
export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error("[supabase/admin] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    return createSupabaseClient(url, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}
