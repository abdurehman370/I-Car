export const DEALER_ROLE = "Car Dealers";
export const PARTNER_ROLE = "Baking Sector/Partners";
export const USER_ROLE = "User";

export type PlatformRoleFilter = "all" | "dealers" | "users" | "partners";

/** Only car dealers need admin review before they can use the portal. */
export function requiresAdminApproval(role: string | null | undefined): boolean {
  return role === DEALER_ROLE;
}

export function dealerDisplayName(dealer: {
  dealershipName?: string | null;
  contactPerson?: string | null;
  email?: string | null;
}): string {
  return dealer.dealershipName || dealer.contactPerson || dealer.email || "—";
}

export function roleLabel(role: string | null | undefined): string {
  if (role === DEALER_ROLE) return "Dealer";
  if (role === PARTNER_ROLE) return "Partner";
  if (role === USER_ROLE) return "User";
  return role || "User";
}

export function roleBadgeClass(role: string | null | undefined): string {
  if (role === DEALER_ROLE) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (role === PARTNER_ROLE) {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  return "bg-gray-500/10 text-gray-400 border-gray-500/20";
}

/** Users/partners don't go through approval — show as active regardless of DB value. */
export function effectiveApprovalStatus(
  role: string | null | undefined,
  approvalStatus: string | null | undefined,
): string {
  if (!requiresAdminApproval(role)) return "active";
  return (approvalStatus || "pending").toLowerCase();
}

export function roleFilterToDbRole(filter: PlatformRoleFilter): string | null {
  switch (filter) {
    case "dealers":
      return DEALER_ROLE;
    case "partners":
      return PARTNER_ROLE;
    case "users":
      return USER_ROLE;
    default:
      return null;
  }
}
