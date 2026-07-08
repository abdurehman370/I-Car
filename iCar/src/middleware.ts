import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  parseDealerSessionFromRequest,
  updateAdminSession,
  updateDealerSession,
} from "@/lib/auth";
import { USER_ROLE } from "@/lib/dealer-roles";
import {
  getLegacyUserRedirect,
  getPortalHomeForRole,
  isPathForbiddenForRole,
  isUserPortalArea,
} from "@/lib/portal-access";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/webhook");

  const isApi = pathname.startsWith("/api/");

  // Public big-screen broadcast page — token-protected by its own API,
  // must work on venue screens with no session and regardless of any
  // logged-in role on the machine.
  const isAuctionDisplay = pathname.startsWith("/auction-display");

  if (isStatic || isApi || isAuctionDisplay) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAdminLoginPage = pathname === "/admin/login";
  const isAdminApiAuth = pathname.startsWith("/api/admin/auth");

  const isDealerApiAuth =
    pathname.startsWith("/api/dealer/auth") || pathname.startsWith("/api/auth");

  const dealerPublicPaths = ["/", "/login", "/signup", "/forgot-password"];
  const isDealerPublicPage =
    dealerPublicPaths.includes(pathname) ||
    dealerPublicPaths.some((p) => pathname.startsWith(p + "/"));

  if (isAdminRoute || isAdminApiAuth) {
    const adminSessionResponse = await updateAdminSession(request);
    const isAdminAuthenticated = !!adminSessionResponse;

    if (!isAdminAuthenticated && !isAdminLoginPage && !isAdminApiAuth) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (isAdminAuthenticated && isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return adminSessionResponse || NextResponse.next();
  }

  const dealerSessionResponse = await updateDealerSession(request);
  const parsedSession = await parseDealerSessionFromRequest(request);
  const isDealerAuthenticated = !!parsedSession;
  const role = parsedSession?.user?.role as string | undefined;

  if (!isDealerAuthenticated && !isDealerPublicPage && !isDealerApiAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isDealerAuthenticated) {
    // User accounts use /user/* — redirect legacy paths and block dealer-only routes
    if (role === USER_ROLE) {
      const legacy = getLegacyUserRedirect(pathname);
      if (legacy) {
        return NextResponse.redirect(new URL(legacy, request.url));
      }
      if (isPathForbiddenForRole(pathname, role)) {
        return NextResponse.redirect(new URL(getPortalHomeForRole(role), request.url));
      }
    }

    // Dealers and partners cannot access the user portal area
    if (isUserPortalArea(pathname) && role !== USER_ROLE) {
      return NextResponse.redirect(new URL(getPortalHomeForRole(role), request.url));
    }

    if (isPathForbiddenForRole(pathname, role)) {
      return NextResponse.redirect(new URL(getPortalHomeForRole(role), request.url));
    }
  }

  if (isDealerAuthenticated && isDealerPublicPage) {
    const home = getPortalHomeForRole(role);
    return NextResponse.redirect(new URL(home, request.url));
  }

  return dealerSessionResponse || NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|uploads).*)"],
};
