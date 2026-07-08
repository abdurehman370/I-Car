import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { placeBid, notifyOutbidAsync, BidError } from "@/lib/auction-bidding";

/**
 * Floor bid entry — used by the admin/IT operator at a physical auction to
 * record bids placed in the room. Runs through the exact same transactional
 * validation as online dealer bids (LIVE status, time window, min increment,
 * anti-sniping extension) and triggers outbid notifications to online dealers.
 */
export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bidAmount = parseFloat(body.amount);
    const paddleNumber = body.paddleNumber ? String(body.paddleNumber) : null;
    const bidderName = body.bidderName ? String(body.bidderName) : null;

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
    }

    const result = await placeBid(id, {
      source: "floor",
      amount: bidAmount,
      paddleNumber,
      bidderName,
    });

    // Notify the outbid online dealer (floor bidders are handled in the room)
    notifyOutbidAsync(result, bidAmount);

    return NextResponse.json({
      message: "Floor bid recorded",
      bid: result.newBid,
      currentHighestBid: bidAmount,
      extended: result.extended,
      endAt: result.updatedAuction.endAt,
    });

  } catch (error: any) {
    if (error instanceof BidError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error recording floor bid:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
