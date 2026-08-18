import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // API 라우트는 로케일과 무관하다. 제외하지 않으면 next-intl 미들웨어가
    // /api/... 를 /ko/api/... 로 307 리다이렉트하고, 그 경로에는 핸들러가
    // 없어 404 가 된다 (핸들러는 src/app/api/ 에 있고 [locale] 하위가 아님).
    // 로케일이 필요한 유일한 라우트 핸들러는 [locale]/auth/callback 이며
    // /api 밖에 있어 이 제외에 걸리지 않는다.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
