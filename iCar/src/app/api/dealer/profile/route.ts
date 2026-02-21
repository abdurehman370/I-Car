import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";

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
        createdAt: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ message: "Dealer not found" }, { status: 404 });
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

    const updatedDealer = await prisma.dealer.update({
      where: { id: session.user.id },
      data: {
        dealershipName,
        contactPerson,
        phoneNumber,
        address,
        city,
        country,
      },
      select: {
        id: true,
        email: true,
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
