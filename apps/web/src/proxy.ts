import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Proxy function for Next.js 16
export function proxy(request: NextRequest) {
  // Add custom proxy logic here
  // For example: authentication, redirects, etc.

  // Example: Redirect /login to /auth/sign-in
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // Example: Redirect /register to /auth/sign-up
  if (request.nextUrl.pathname === '/register') {
    return NextResponse.redirect(new URL('/auth/sign-up', request.url))
  }

  return NextResponse.next()
}
