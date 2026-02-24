import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const alerts = await prisma.alert.findMany({
            where: { dealerId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ data: alerts }, { status: 200 });
    } catch (error: any) {
        console.error("Get alerts error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { make, model, yearMin, yearMax, variant, region, frequency } = body;

        if (!make || !model || !region) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const alert = await prisma.alert.create({
            data: {
                dealerId: session.user.id,
                make,
                model,
                yearMin: yearMin ? parseInt(yearMin) : null,
                yearMax: yearMax ? parseInt(yearMax) : null,
                variant,
                region,
                frequency: frequency || 'daily',
            },
        });

        return NextResponse.json({ data: alert }, { status: 201 });
    } catch (error: any) {
        console.error("Create alert error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
