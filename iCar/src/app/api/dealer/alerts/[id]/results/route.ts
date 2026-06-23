import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getScraperApiKey, getScraperBaseUrl } from "@/lib/scraper";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const alertId = parseInt(id);

        const alert = await prisma.alert.findUnique({ where: { id: alertId } });
        if (!alert) {
            return NextResponse.json({ message: "Alert not found" }, { status: 404 });
        }
        if (alert.dealerId !== session.user.id) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        // 1. Internal listings from DB
        const internalMatches = await prisma.listing.findMany({
            where: {
                make: { contains: alert.make },
                model: { contains: alert.model },
                region: alert.region,
                status: 'ACTIVE',
                ...(alert.yearMin ? { year: { gte: alert.yearMin } } : {}),
                ...(alert.yearMax ? { year: { lte: alert.yearMax } } : {}),
            },
            include: {
                images: { orderBy: { order: 'asc' }, take: 1 },
                dealer: { select: { dealershipName: true, city: true } },
            },
            take: 20,
        });

        const internalFormatted = internalMatches.map((l) => ({
            source: 'iCar' as const,
            id: l.id,
            title: `${l.year} ${l.make} ${l.model}${l.variant ? ' ' + l.variant : ''}`,
            price: l.price,
            currency: l.currency,
            year: l.year,
            mileage: l.mileage,
            location: `${l.city}, ${l.region}`,
            image: l.images[0]?.url ?? null,
            url: null, // internal — link built on frontend
            dealer: l.dealer.dealershipName,
        }));

        // 2. Scraper results
        let scraperFormatted: any[] = [];
        try {
            const scraperRes = await fetch(`${getScraperBaseUrl()}/api/scrape`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": getScraperApiKey()
                },
                body: JSON.stringify({
                    make: alert.make,
                    model: alert.model,
                    region: alert.region,
                    year_min: alert.yearMin,
                    year_max: alert.yearMax,
                    variant: alert.variant,
                    max_pages: 2,
                }),
            });
            if (scraperRes.ok) {
                const scraperData = await scraperRes.json();
                scraperFormatted = (scraperData.data || []).map((m: any) => ({
                    source: 'External' as const,
                    id: null,
                    title: m.title || `${alert.make} ${alert.model}`,
                    price: m.price ?? null,
                    currency: m.currency ?? scraperData.currency ?? 'AED',
                    year: m.year ?? null,
                    mileage: m.mileage ?? null,
                    location: m.location ?? alert.region,
                    image: m.image_url || m.image || null,
                    url: m.url || m.listing_url || null,
                    dealer: null,
                }));
            }
        } catch (e) {
            console.error("Scraper error:", e);
        }

        return NextResponse.json({
            alert,
            results: [...internalFormatted, ...scraperFormatted],
        }, { status: 200 });

    } catch (error) {
        console.error("Alert results error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
