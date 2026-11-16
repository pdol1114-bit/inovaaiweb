import { NextResponse } from 'next/server'
import { createFemClient } from '@/utils/supabase/fem'

const LOCALES = ['ko', 'en']

/**
 * FEM 회원 로그인 콜백. FEM 전용 Supabase 프로젝트의 세션만 만든다.
 * 이동 경로는 고정이다(쿼리·쿠키로 받지 않는다): 성공 → FEM 작업 화면, 실패 → FEM 로그인 화면.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { searchParams, origin } = new URL(request.url)
  const raw = (await params).locale
  const locale = LOCALES.includes(raw) ? raw : 'ko'

  // 로드밸런서 뒤에서는 origin이 내부 주소일 수 있다(기존 로그인 콜백과 같은 처리).
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base = process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : origin

  const code = searchParams.get('code')
  const supabase = code ? await createFemClient() : null
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${base}/${locale}/fem-ai#mesh-workspace`)
    console.error('[fem-auth] callback failed:', error.name)
  }
  return NextResponse.redirect(`${base}/${locale}/fem-ai/auth?error=failed`)
}
