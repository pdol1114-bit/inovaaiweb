'use server'

import { redirect } from 'next/navigation'
import { createFemClient } from '@/utils/supabase/fem'

/**
 * FEM 회원 로그인·로그아웃. FEM 전용 Supabase 프로젝트만 다룬다.
 * 기본(Sniff) 프로젝트의 로그인 액션(`./auth.ts`)·세션과는 별개이며 서로 영향을 주지 않는다.
 *
 * 로그인 뒤 이동 경로는 입력으로 받지 않는다. 콜백이 항상 `/{locale}/fem-ai#mesh-workspace`로 보낸다.
 */
const LOCALES = ['ko', 'en']
const safeLocale = (locale: string) => (LOCALES.includes(locale) ? locale : 'ko')

async function signIn(provider: 'google' | 'apple', rawLocale: string) {
  const locale = safeLocale(rawLocale)
  if (provider === 'apple' && process.env.FEM_APPLE_LOGIN_ENABLED !== 'true') redirect(`/${locale}/fem-ai/auth?error=unavailable`)
  const supabase = await createFemClient()
  if (!supabase) redirect(`/${locale}/fem-ai/auth?error=unavailable`)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/fem-ai/auth/callback`,
      ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
    },
  })
  if (error || !data.url) {
    console.error('[fem-auth] sign-in start failed:', error?.name ?? 'no url')
    redirect(`/${locale}/fem-ai/auth?error=failed`)
  }
  redirect(data.url)
}

export async function signInFemWithGoogle(locale: string) {
  await signIn('google', locale)
}

export async function signInFemWithApple(locale: string) {
  await signIn('apple', locale)
}

/** 이 브라우저의 FEM 세션만 끝낸다. 기본 프로젝트의 로그인은 그대로 둔다. */
export async function signOutFem(rawLocale: string) {
  const locale = safeLocale(rawLocale)
  const supabase = await createFemClient()
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) console.error('[fem-auth] sign-out failed:', error.name)
  }
  redirect(`/${locale}/fem-ai`)
}
