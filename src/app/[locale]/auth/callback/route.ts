import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Get locale from URL if it exists, otherwise default
  const urlParts = request.url.split('/')
  const localeIndex = urlParts.findIndex(part => part === 'auth') - 1
  const locale = localeIndex >= 0 ? urlParts[localeIndex] : 'ko'
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? `/${locale}/auth/success`

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
