import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const statusFilter = (searchParams.get("status") || "ACTIVE").trim();

    const where: { status?: string } = {};
    if (statusFilter) {
      where.status = statusFilter;
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        images: {
          orderBy: { order: "asc" },
        },
        dealer: {
          select: {
            id: true,
            dealershipName: true,
            email: true,
            contactPerson: true,
            city: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error("GET admin listings error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
