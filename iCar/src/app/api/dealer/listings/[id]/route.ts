import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";

async function getOwnedListing(listingId: string, dealerId: number) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { error: "Listing not found", status: 404 };
    if (listing.dealerId !== dealerId) return { error: "Forbidden", status: 403 };
    return { listing };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { error, status } = await getOwnedListing(id, session.user.id) as any;
        if (error) return NextResponse.json({ success: false, message: error }, { status });

        const body = await request.json();
        const { make, model, year, mileage, variant, price, currency, description, condition, city, region, status: listingStatus } = body;

        if (!make || !model || !year || !mileage || !price || !condition || !city || !region) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const updated = await prisma.listing.update({
            where: { id },
            data: {
                make,
                model,
                year: parseInt(year),
                mileage: parseInt(mileage),
                variant: variant || null,
                price: parseFloat(price),
                currency: currency || "AED",
                description,
                condition,
                city,
                region,
                status: listingStatus || "ACTIVE",
                publishedAt: listingStatus === "ACTIVE" ? new Date() : undefined,
            },
            include: { images: { orderBy: { order: 'asc' } } },
        });

        return NextResponse.json({ success: true, listing: updated });
    } catch (error) {
        console.error("Update listing error:", error);
        return NextResponse.json({ success: false, message: "Failed to update listing" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { error, status } = await getOwnedListing(id, session.user.id) as any;
        if (error) return NextResponse.json({ success: false, message: error }, { status });

        // Delete images first (cascade might handle it, but explicit is safer)
        await prisma.listingImage.deleteMany({ where: { listingId: id } });
        await prisma.listing.delete({ where: { id } });

        return NextResponse.json({ success: true, message: "Listing deleted" });
    } catch (error) {
        console.error("Delete listing error:", error);
        return NextResponse.json({ success: false, message: "Failed to delete listing" }, { status: 500 });
    }
}
