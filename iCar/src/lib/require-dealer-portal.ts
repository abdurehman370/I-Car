import { NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import {
  canAccessValuation,
  isPartnerRole,
  isUserRole,
} from "@/lib/portal-access";

type SessionResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getDealerSession>>> }
  | { ok: false; response: NextResponse };

function forbidden(message: string) {
  return NextResponse.json({ message }, { status: 403 });
}

/** Full dealer portal — Car Dealers only (not users or partners). */
export async function requireDealerPortalSession(): Promise<SessionResult> {
  const session = await getDealerSession();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  if (isUserRole(session.user.role)) {
    return {
      ok: false,
      response: forbidden("This feature is not available for user accounts"),
    };
  }
  if (isPartnerRole(session.user.role)) {
    return {
      ok: false,
      response: forbidden("This feature is not available for partner accounts"),
    };
  }
  return { ok: true, session };
}

/** Car price evaluation — Car Dealers and banking partners. */
export async function requireValuationSession(): Promise<SessionResult> {
  const session = await getDealerSession();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!canAccessValuation(session.user.role)) {
    return {
      ok: false,
      response: forbidden("Your account type cannot access car price evaluation"),
    };
  }
  return { ok: true, session };
}
