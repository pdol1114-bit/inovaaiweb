import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) Supabase 세션 갱신. 갱신된 토큰은 request.cookies 에도 반영되므로
  //    이어지는 intl 미들웨어와 서버 컴포넌트는 새 토큰을 본다.
  const sessionResponse = await updateSession(request);

  // 2) 로케일 처리(리다이렉트·리라이트 포함)는 intl 미들웨어 응답을 그대로 쓴다.
  const response = intlMiddleware(request);

  // 3) 갱신된 세션 쿠키와 캐시 방지 헤더를 최종 응답에 옮겨 싣는다.
  //    이전에는 sessionResponse 를 버려서 브라우저에 새 토큰이 내려가지 않았다.
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  sessionResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "cache-control" || key.toLowerCase() === "expires" || key.toLowerCase() === "pragma") {
      response.headers.set(key, value);
    }
  });

  return response;
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
