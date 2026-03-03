import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            make,
            model,
            variant,
            region,
            yearMin,
            yearMax,
            mileageMax,
            priceMin,
            priceMax,
        } = body;

        if (!region) {
            return NextResponse.json({ message: "Region is required" }, { status: 400 });
        }

        // ----------------------------------------------------------------
        // 1. Internal DB listings
        // ----------------------------------------------------------------
        const whereClause: any = {
            status: 'ACTIVE',
            region,
            ...(make ? { make: { contains: make } } : {}),
            ...(model ? { model: { contains: model } } : {}),
            ...(variant ? { variant: { contains: variant } } : {}),
            ...(yearMin || yearMax ? {
                year: {
                    ...(yearMin ? { gte: parseInt(yearMin) } : {}),
                    ...(yearMax ? { lte: parseInt(yearMax) } : {}),
                },
            } : {}),
            ...(mileageMax ? { mileage: { lte: parseInt(mileageMax) } } : {}),
            ...(priceMin || priceMax ? {
                price: {
                    ...(priceMin ? { gte: parseFloat(priceMin) } : {}),
                    ...(priceMax ? { lte: parseFloat(priceMax) } : {}),
                },
            } : {}),
        };

        const internalListings = await prisma.listing.findMany({
            where: whereClause,
            include: {
                images: { orderBy: { order: 'asc' }, take: 1 },
                dealer: { select: { dealershipName: true, city: true, phoneNumber: true } },
            },
            orderBy: { publishedAt: 'desc' },
            take: 50,
        });

        const internalFormatted = internalListings.map((l) => ({
            source: 'iCar' as const,
            id: l.id,
            title: `${l.year} ${l.make} ${l.model}${l.variant ? ' ' + l.variant : ''}`,
            make: l.make,
            model: l.model,
            year: l.year,
            mileage: l.mileage,
            price: l.price,
            currency: l.currency,
            location: `${l.city}, ${l.region}`,
            image: l.images[0]?.url ?? null,
            url: null,
            dealer: l.dealer.dealershipName,
            phone: l.dealer.phoneNumber,
            condition: l.condition,
        }));

        // ----------------------------------------------------------------
        // 2. External scraper listings
        // ----------------------------------------------------------------
        let externalFormatted: any[] = [];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120_000);

            const scraperPayload = {
                make: make || null,
                model: model || null,
                variant: variant || null,
                region,
                year_min: yearMin ? parseInt(yearMin) : null,
                year_max: yearMax ? parseInt(yearMax) : null,
                mileage_max: mileageMax ? parseInt(mileageMax) : null,
                price_min: priceMin ? parseFloat(priceMin) : null,
                price_max: priceMax ? parseFloat(priceMax) : null,
                max_pages: 2,
            };

            const scraperRes = await fetch("http://localhost:8000/api/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.SCRAPER_API_KEY || "default_dev_key"
                },
                body: JSON.stringify({
                    make: make || null,
                    model: model || null,
                    variant: variant || null,
                    region,
                    year_min: yearMin ? parseInt(yearMin) : null,
                    year_max: yearMax ? parseInt(yearMax) : null,
                    mileage_max: mileageMax ? parseInt(mileageMax) : null,
                    price_min: priceMin ? parseFloat(priceMin) : null,
                    price_max: priceMax ? parseFloat(priceMax) : null,
                    max_pages: 2,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (scraperRes.ok) {
                const scraperData = await scraperRes.json();
                externalFormatted = (scraperData.data || []).map((m: any) => ({
                    source: 'External' as const,
                    id: null,
                    title: m.title || `${make ?? ''} ${model ?? ''}`.trim() || 'Unknown',
                    make: make ?? null,
                    model: model ?? null,
                    year: m.year ?? null,
                    mileage: m.mileage ?? null,
                    price: m.price ?? null,
                    currency: m.currency ?? scraperData.currency ?? 'AED',
                    location: m.location ?? region,
                    image: m.image_url || m.image || null,
                    url: m.url || m.listing_url || null,
                    dealer: null,
                    phone: null,
                    condition: null,
                }));
            }
        } catch (err: any) {
            console.error("Dealer search scraper error:", err.message);
            // Non-fatal — return internal results even if scraper fails
        }

        return NextResponse.json({
            total: internalFormatted.length + externalFormatted.length,
            internal: internalFormatted.length,
            external: externalFormatted.length,
            results: [...internalFormatted, ...externalFormatted],
        }, { status: 200 });

    } catch (error: any) {
        console.error("Dealer search error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
