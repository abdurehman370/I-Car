import { DEALER_ROLE, PARTNER_ROLE, USER_ROLE, requiresAdminApproval } from "@/lib/dealer-roles";

/** User portal lives under /user/* — separate from the dealer route tree. */
export const USER_ALLOWED_PATHS = [
  "/user/auctions",
  "/user/auction-notifications",
  "/user/profile",
] as const;

export const PARTNER_ALLOWED_PATHS = ["/car-valuation", "/profile"] as const;

export const PARTNER_HOME = "/car-valuation";
export const USER_HOME = "/user/auctions";
export const DEALER_HOME = "/dashboard";

const DEALER_ONLY_PREFIXES = [
  "/dashboard",
  "/listings",
  "/list-vehicle",
  "/vehicle-valuation",
  "/settings",
];

/** Legacy paths that User accounts should be redirected away from. */
const LEGACY_USER_REDIRECTS: Record<string, string> = {
  "/auctions": "/user/auctions",
  "/auction-notifications": "/user/auction-notifications",
  "/profile": "/user/profile",
};

export function isUserPortalArea(pathname: string): boolean {
  return pathname === "/user" || pathname.startsWith("/user/");
}

export function isUserRole(role: string | null | undefined): boolean {
  return role === USER_ROLE;
}

export function isPartnerRole(role: string | null | undefined): boolean {
  return role === PARTNER_ROLE;
}

export function isDealerRole(role: string | null | undefined): boolean {
  return role === DEALER_ROLE;
}

export function getPortalHomeForRole(role: string | null | undefined): string {
  if (isUserRole(role)) return USER_HOME;
  if (isPartnerRole(role)) return PARTNER_HOME;
  return DEALER_HOME;
}

function matchesPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function matchesAny(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => matchesPath(pathname, p));
}

export function isPartnerOnlyPortalPath(pathname: string): boolean {
  return matchesPath(pathname, "/car-valuation");
}

export function isDealerOnlyPortalPath(pathname: string): boolean {
  return DEALER_ONLY_PREFIXES.some((p) => matchesPath(pathname, p));
}

/** Redirect User role from old shared paths to /user/* equivalents. */
export function getLegacyUserRedirect(pathname: string): string | null {
  if (pathname === "/auctions" || pathname.startsWith("/auctions/")) {
    return pathname.replace(/^\/auctions/, "/user/auctions");
  }
  for (const [legacy, target] of Object.entries(LEGACY_USER_REDIRECTS)) {
    if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
      return target;
    }
  }
  return null;
}

export function isPathAllowedForRole(
  pathname: string,
  role: string | null | undefined
): boolean {
  if (isUserRole(role)) {
    return matchesAny(pathname, USER_ALLOWED_PATHS);
  }
  if (isPartnerRole(role)) {
    return matchesAny(pathname, PARTNER_ALLOWED_PATHS);
  }
  if (isDealerRole(role)) {
    return !isUserPortalArea(pathname) && !isPartnerOnlyPortalPath(pathname);
  }
  // Unknown / legacy JWT without role — allow dealer paths, block user/partner areas
  return !isUserPortalArea(pathname) && !isPartnerOnlyPortalPath(pathname);
}

export function isPathForbiddenForRole(
  pathname: string,
  role: string | null | undefined
): boolean {
  return !isPathAllowedForRole(pathname, role);
}

export function canAccessAuctions(dealer: {
  role: string;
  approvalStatus: string;
}): boolean {
  if (isPartnerRole(dealer.role)) return false;
  if (isUserRole(dealer.role)) return true;
  if (requiresAdminApproval(dealer.role)) {
    return dealer.approvalStatus === "approved";
  }
  return false;
}

export function canAccessValuation(role: string | null | undefined): boolean {
  return isDealerRole(role) || isPartnerRole(role);
}
