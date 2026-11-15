import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'session'

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set(
    'next',
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  )

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/account',
    '/account/:path*',
    '/orders',
    '/orders/:path*',
    '/checkout/:path*',
    '/panel',
    '/panel/:path*',
  ],
}
