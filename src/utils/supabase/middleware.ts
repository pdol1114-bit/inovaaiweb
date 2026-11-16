import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { FEM_AUTH_COOKIE, femSupabaseConfig } from './fem-config'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          // 인증 쿠키를 싣는 응답이 CDN 에 캐시되지 않도록 SDK 가 넘기는 헤더(Cache-Control 등)
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, potentially respond by redirecting the user to the login page
    // return NextResponse.redirect(new URL('/auth', request.url))
  }

  // FEM 전용 프로젝트의 세션 갱신. FEM 세션 쿠키가 있는 요청에서만 돈다(없으면 위 동작 그대로).
  // 기본 프로젝트의 세션과는 별개이며 서로의 로그인 상태에 영향을 주지 않는다.
  const fem = femSupabaseConfig()
  if (fem && request.cookies.getAll().some(({ name }) => name.startsWith(FEM_AUTH_COOKIE))) {
    const femClient = createServerClient(fem.url, fem.anonKey, {
      cookieOptions: { name: FEM_AUTH_COOKIE },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // 갱신된 요청 쿠키를 싣도록 응답을 다시 만들되, 위에서 실은 기본 세션 쿠키·헤더는 보존한다.
          const previous = supabaseResponse
          supabaseResponse = NextResponse.next({ request })
          previous.cookies.getAll().forEach((cookie) => supabaseResponse.cookies.set(cookie))
          previous.headers.forEach((value, key) => {
            const k = key.toLowerCase()
            if (k === 'cache-control' || k === 'expires' || k === 'pragma') supabaseResponse.headers.set(key, value)
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    })
    await femClient.auth.getUser()
  }

  return supabaseResponse
}
