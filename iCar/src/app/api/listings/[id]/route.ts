import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                images: { orderBy: { order: "asc" } },
                dealer: {
                    select: {
                        dealershipName: true,
                        contactPerson: true,
                        phoneNumber: true,
                        city: true,
                        country: true,
                    },
                },
            },
        });

        if (!listing) {
            return NextResponse.json({ message: "Listing not found" }, { status: 404 });
        }

        return NextResponse.json({ data: listing }, { status: 200 });
    } catch (error) {
        console.error("Get listing error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
