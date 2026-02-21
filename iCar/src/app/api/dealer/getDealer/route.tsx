import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        // 1. Auth check
        const dealerSession = await getDealerSession();
        if (!dealerSession) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch dealer data
        const dealer = await prisma.dealer.findUnique({
            where: { id: dealerSession.id },
            select: {
                id: true,
                email: true,
                contactPerson: true,
                phoneNumber: true,
                dealershipName: true,
                address: true,
                city: true,
                country: true,
                approvalStatus: true,
                createdAt: true,
                updatedAt: true,
                // companyName: true,
                // companyAddress: true,
                // logoUrl: true,
            },
        });

        if (!dealer) {
            return NextResponse.json({ message: "Dealer not found" }, { status: 404 });
        }

        return NextResponse.json({ data: dealer }, { status: 200 });

    } catch (error: any) {
        console.error("Get dealer error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}