import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/core/lib/auth'

const protectedRoutes = ['/dashboard', '/properties', '/tenants', '/documents']
const authRoutes = ['/login', '/register']

const suspiciousHeaders = ['x-forwarded-host', 'x-host']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bloque les requêtes avec des headers d'hôte forgés (protection contre
  // les attaques par empoisonnement de cache / redirections d'hôte).
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && value !== request.headers.get('host')) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
