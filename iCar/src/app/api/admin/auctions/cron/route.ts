import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { runAuctionScheduler } from "@/lib/auction-scheduler";

async function authorizeCronRequest(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const adminSession = await getAdminSession();
  return !!adminSession;
}

// Secured: requires CRON_SECRET bearer token or logged-in admin session.
export async function GET(req: NextRequest) {
  if (!(await authorizeCronRequest(req))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  console.log('[API Cron] Running push:auctions at', new Date().toISOString());

  try {
    const result = await runAuctionScheduler();

    return NextResponse.json({
      success: true,
      message: `Cron executed. Started: ${result.started}, Closed: ${result.closed}, Expired: ${result.expired}`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Cron] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
