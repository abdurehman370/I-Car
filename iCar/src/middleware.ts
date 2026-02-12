import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateAdminSession, updateDealerSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and assets - allow through
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/webhook'); // public webhooks

  if (isStatic) {
    return NextResponse.next();
  }

  // --- ADMIN ROUTES ---
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLoginPage = pathname === '/admin/login';
  const isAdminApiAuth = pathname.startsWith('/api/admin/auth');

  // --- DEALER ROUTES (non-admin) ---
  const isDealerApiAuth =
    pathname.startsWith('/api/dealer/auth') || pathname.startsWith('/api/auth');

  // ✅ Add public dealer pages here
  const dealerPublicPaths = ['/', '/login', '/signup', '/forgot-password'];
  const isDealerPublicPage =
    dealerPublicPaths.includes(pathname) ||
    dealerPublicPaths.some((p) => pathname.startsWith(p + '/'));

  // Handle ADMIN routes
  if (isAdminRoute || isAdminApiAuth) {
    const adminSessionResponse = await updateAdminSession(request);
    const isAdminAuthenticated = !!adminSessionResponse;

    if (!isAdminAuthenticated && !isAdminLoginPage && !isAdminApiAuth) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (isAdminAuthenticated && isAdminLoginPage) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return adminSessionResponse || NextResponse.next();
  }

  // Handle DEALER routes (all non-admin routes)
  const dealerSessionResponse = await updateDealerSession(request);
  const isDealerAuthenticated = !!dealerSessionResponse;

  // ✅ Only redirect if it's NOT a public page
  if (!isDealerAuthenticated && !isDealerPublicPage && !isDealerApiAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ If already logged in, keep them away from login/signup
  if (isDealerAuthenticated && isDealerPublicPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return dealerSessionResponse || NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'],
};
