import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";

async function getOwnedListing(listingId: string, dealerId: number) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { error: "Listing not found", status: 404 as const };
    if (listing.dealerId !== dealerId) return { error: "Forbidden", status: 403 as const };
    return { listing };
}

const LISTING_INCLUDE = {
    images: { orderBy: { order: "asc" as const } },
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const result = await getOwnedListing(id, session.user.id);
        if ("error" in result && result.error) {
            return NextResponse.json({ success: false, message: result.error }, { status: result.status });
        }

        const listing = await prisma.listing.findUnique({
            where: { id },
            include: LISTING_INCLUDE,
        });

        return NextResponse.json({ success: true, listing });
    } catch (error) {
        console.error("Get listing error:", error);
        return NextResponse.json({ success: false, message: "Failed to fetch listing" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const owned = await getOwnedListing(id, session.user.id);
        if ("error" in owned && owned.error) {
            return NextResponse.json({ success: false, message: owned.error }, { status: owned.status });
        }

        const body = await request.json();
        const listingStatus = body.status as string | undefined;

        // Status-only toggle (active ↔ inactive)
        if (listingStatus !== undefined && body.toggleStatus === true) {
            if (!["ACTIVE", "DRAFT"].includes(listingStatus)) {
                return NextResponse.json(
                    { success: false, message: "Status must be ACTIVE or DRAFT" },
                    { status: 400 }
                );
            }

            if (owned.listing.status === "SOLD" || owned.listing.status === "EXPIRED") {
                return NextResponse.json(
                    { success: false, message: "Cannot change status of sold or expired listings" },
                    { status: 400 }
                );
            }

            const updated = await prisma.listing.update({
                where: { id },
                data: {
                    status: listingStatus,
                    publishedAt: listingStatus === "ACTIVE" ? new Date() : null,
                },
                include: LISTING_INCLUDE,
            });

            return NextResponse.json({ success: true, listing: updated });
        }

        const {
            make,
            model,
            year,
            mileage,
            variant,
            price,
            currency,
            description,
            condition,
            city,
            region,
            status: fullUpdateStatus,
        } = body;

        if (!make || !model || !year || !mileage || !price || !description || !condition || !city || !region) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const nextStatus = fullUpdateStatus || owned.listing.status;
        if (!["ACTIVE", "DRAFT", "SOLD", "EXPIRED"].includes(nextStatus)) {
            return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
        }

        if (!["NEW", "USED", "CERTIFIED"].includes(condition)) {
            return NextResponse.json({ success: false, message: "Invalid condition" }, { status: 400 });
        }

        const updated = await prisma.listing.update({
            where: { id },
            data: {
                make,
                model,
                year: parseInt(String(year), 10),
                mileage: parseInt(String(mileage), 10),
                variant: variant || null,
                price: parseFloat(String(price)),
                currency: currency || "AED",
                description,
                condition,
                city,
                region,
                status: nextStatus,
                publishedAt:
                    nextStatus === "ACTIVE"
                        ? owned.listing.publishedAt ?? new Date()
                        : nextStatus === "DRAFT"
                          ? null
                          : owned.listing.publishedAt,
            },
            include: LISTING_INCLUDE,
        });

        return NextResponse.json({ success: true, listing: updated });
    } catch (error) {
        console.error("Update listing error:", error);
        return NextResponse.json({ success: false, message: "Failed to update listing" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const owned = await getOwnedListing(id, session.user.id);
        if ("error" in owned && owned.error) {
            return NextResponse.json({ success: false, message: owned.error }, { status: owned.status });
        }

        await prisma.listingImage.deleteMany({ where: { listingId: id } });
        await prisma.listing.delete({ where: { id } });

        return NextResponse.json({ success: true, message: "Listing deleted" });
    } catch (error) {
        console.error("Delete listing error:", error);
        return NextResponse.json({ success: false, message: "Failed to delete listing" }, { status: 500 });
    }
}
