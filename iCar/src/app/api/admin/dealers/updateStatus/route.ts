import prisma from "@/lib/db";
import { DEALER_ROLE } from "@/lib/dealer-roles";
import { getAdminSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();
    const { dealerId, status } = body;

    if (!dealerId || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid request data" }, { status: 400 });
    }

    if (status === "approved") {
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: { licenseDocumentUrl: true, role: true },
      });

      if (dealer?.role === DEALER_ROLE && !dealer.licenseDocumentUrl) {
        return NextResponse.json(
          { message: "Cannot approve car dealer without a license document on file" },
          { status: 400 }
        );
      }
    }

    // 3. Update database
    const updatedDealer = await prisma.dealer.update({
      where: { id: dealerId },
      data: { approvalStatus: status },
    });

    // 4. Send email (fire and forget or await?)
    // We await to ensure the user knows if the email failed, or just log error?
    // Usually, we log error and return success for DB change.
    try {
      if (status === "approved") {
        await sendApprovalEmail(updatedDealer.email, updatedDealer.contactPerson);
      } else {
        await sendRejectionEmail(updatedDealer.email, updatedDealer.contactPerson);
      }
    } catch (mailError) {
      console.error("Email sending failed:", mailError);
      // We don't fail the whole request if only the email fails, but we could return a warning.
    }

    return NextResponse.json({
      message: `Dealer ${status} successful`,
      data: updatedDealer,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Dealer status update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
