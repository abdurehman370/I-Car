import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const alerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                dealer: { select: { dealershipName: true, contactPerson: true } },
                user: { select: { username: true } },
            },
        });

        return NextResponse.json({ data: alerts }, { status: 200 });
    } catch (error: any) {
        console.error("Get alerts error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { make, model, yearMin, yearMax, variant, region, frequency } = body;

        if (!make || !model || !region) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const alert = await prisma.alert.create({
            data: {
                userId: session.user.id,
                make,
                model,
                yearMin: yearMin ? parseInt(yearMin) : null,
                yearMax: yearMax ? parseInt(yearMax) : null,
                variant,
                region,
                frequency: frequency || 'daily',
            },
            include: {
                dealer: { select: { dealershipName: true, contactPerson: true } },
                user: { select: { username: true } },
            },
        });
        return NextResponse.json({ data: alert }, { status: 201 });
    } catch (error: any) {
        console.error("Create alert error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
