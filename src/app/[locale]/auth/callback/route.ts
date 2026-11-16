import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Get locale from URL if it exists, otherwise default
  const urlParts = request.url.split('/')
  const localeIndex = urlParts.findIndex(part => part === 'auth') - 1
  const locale = localeIndex >= 0 ? urlParts[localeIndex] : 'ko'
  
  // 로그인 뒤에는 항상 사이트 안의 정해진 화면으로 간다.
  // 이전에는 next 쿼리를 검사 없이 origin 뒤에 붙였다(`@host`, `.host` 로 외부 이동이 가능했다).
  // 저장소 안에 next 를 넘기는 호출부가 없어 쿼리를 받지 않는 것으로 막는다.
  const next = `/${locale}/auth/success`

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Set user_type to 'app_user' upon initial sign-in if not present
      if (data.user) {
        const userType = data.user.user_metadata?.user_type;
        if (!userType) {
          // You could use the admin client here to force user_metadata if needed
          // Or just update the user's data
          await supabase.auth.updateUser({
            data: { user_type: 'app_user' }
          })
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('Supabase Auth Error:', error.message)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/${locale}/auth/error?error=auth_callback_failed`)
}
