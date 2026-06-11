import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireDealerPortalSession } from "@/lib/require-dealer-portal";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireDealerPortalSession();
        if (!auth.ok) return auth.response;
        const session = auth.session;

        const dealer = session.user;
        const body = await request.json();

        // Validate required fields
        const {
            make,
            model,
            year,
            mileage,
            variant,
            price,
            currency,
            description,
            features,
            condition,
            city,
            region,
            images,
            status
        } = body;

        // Validation
        if (!make || !model || !year || !mileage || !price || !description || !condition || !city || !region) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!["NEW", "USED", "CERTIFIED"].includes(condition)) {
            return NextResponse.json(
                { success: false, message: "Invalid condition. Must be NEW, USED, or CERTIFIED" },
                { status: 400 }
            );
        }

        if (!["DRAFT", "ACTIVE"].includes(status)) {
            return NextResponse.json(
                { success: false, message: "Invalid status. Must be DRAFT or ACTIVE" },
                { status: 400 }
            );
        }

        // Create listing in a transaction
        const listing = await prisma.$transaction(async (tx: any) => {
            // Create the listing
            const newListing = await tx.listing.create({
                data: {
                    dealerId: dealer.id,
                    make,
                    model,
                    year: parseInt(year),
                    mileage: parseInt(mileage),
                    variant: variant || null,
                    price: parseFloat(price),
                    currency: currency || "AED",
                    description,
                    features: JSON.stringify(features || []),
                    condition,
                    city,
                    region,
                    status,
                    publishedAt: status === "ACTIVE" ? new Date() : null,
                },
            });

            // Only save images if status is ACTIVE
            if (status === "ACTIVE" && images && Array.isArray(images) && images.length > 0) {
                const uploadDir = path.join(process.cwd(), "public", "uploads", "listings", newListing.id.toString());
                await fs.mkdir(uploadDir, { recursive: true });

                const imageRecords = await Promise.all(images.map(async (imageData: string, index: number) => {
                    // Expecting base64 data: "data:image/png;base64,..."
                    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

                    if (!matches || matches.length !== 3) {
                        return null; // Skip invalid images
                    }

                    const type = matches[1];
                    const buffer = Buffer.from(matches[2], "base64");
                    const extension = type.split("/")[1];
                    const filename = `${uuidv4()}.${extension}`;
                    const filePath = path.join(uploadDir, filename);

                    await fs.writeFile(filePath, buffer);

                    return {
                        listingId: newListing.id,
                        url: `/uploads/listings/${newListing.id}/${filename}`,
                        isPrimary: index === 0, // First image is primary
                        order: index,
                    };
                }));

                const validImageRecords = imageRecords.filter((record: any) => record !== null);

                if (validImageRecords.length > 0) {
                    await tx.listingImage.createMany({
                        data: validImageRecords,
                    });
                }
            }

            return newListing;
        });

        return NextResponse.json({
            success: true,
            listingId: (listing as any).id,
            message: status === "ACTIVE"
                ? "Listing published successfully!"
                : "Listing saved as draft",
        });

    } catch (error) {
        console.error("Error creating listing:", error);
        return NextResponse.json(
            { success: false, message: "Failed to create listing" },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch dealer's listings
export async function GET(request: NextRequest) {
    try {
        const auth = await requireDealerPortalSession();
        if (!auth.ok) return auth.response;
        const session = auth.session;

        const dealer = session.user;

        const listings = await prisma.listing.findMany({
            where: {
                dealerId: dealer.id,
            },
            include: {
                images: {
                    orderBy: {
                        order: 'asc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            listings,
        });

    } catch (error) {
        console.error("Error fetching listings:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch listings" },
            { status: 500 }
        );
    }
}
