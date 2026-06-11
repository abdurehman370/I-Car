import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { dealerSessionNeedsSync, getDealerSession, loginDealer } from "@/lib/auth";
import { USER_ROLE } from "@/lib/dealer-roles";

export async function GET(request: NextRequest) {
  try {
    const session = await getDealerSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        dealershipName: true,
        contactPerson: true,
        phoneNumber: true,
        address: true,
        city: true,
        country: true,
        approvalStatus: true,
        role: true,
        createdAt: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ message: "Dealer not found" }, { status: 404 });
    }

    // Keep JWT in sync with DB (fixes stale cookies after role/portal changes)
    if (dealerSessionNeedsSync(session, {
      id: dealer.id,
      email: dealer.email,
      dealershipName: dealer.dealershipName,
      role: dealer.role,
    })) {
      await loginDealer({
        id: dealer.id,
        email: dealer.email,
        dealershipName: dealer.dealershipName,
        role: dealer.role,
      });
    }

    return NextResponse.json(dealer);
  } catch (error) {
    console.error("GET dealer profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDealerSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dealershipName, contactPerson, phoneNumber, address, city, country } = body;

    const existing = await prisma.dealer.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    const isUserAccount = existing.role === USER_ROLE;

    const updatedDealer = await prisma.dealer.update({
      where: { id: session.user.id },
      data: {
        dealershipName: isUserAccount ? null : dealershipName || null,
        contactPerson,
        phoneNumber,
        address,
        city,
        country,
      },
      select: {
        id: true,
        email: true,
        role: true,
        dealershipName: true,
        contactPerson: true,
        phoneNumber: true,
        address: true,
        city: true,
        country: true,
      },
    });

    return NextResponse.json(updatedDealer);
  } catch (error) {
    console.error("PUT dealer profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
