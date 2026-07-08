import prisma from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ALERT_INCLUDE = {
    dealer: { select: { dealershipName: true, contactPerson: true } },
    user: { select: { username: true } },
} as const;

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const alertId = parseInt(id);

        const existing = await prisma.alert.findUnique({ where: { id: alertId } });
        if (!existing) {
            return NextResponse.json({ message: "Alert not found" }, { status: 404 });
        }

        const body = await request.json();
        const { make, model, yearMin, yearMax, variant, region, frequency, enabled } = body;

        // Partial update: allow toggling enabled without other fields
        if (typeof enabled === 'boolean') {
            const updated = await prisma.alert.update({
                where: { id: alertId },
                data: { enabled },
                include: ALERT_INCLUDE,
            });
            return NextResponse.json({ data: updated }, { status: 200 });
        }

        if (!make || !model || !region) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const updated = await prisma.alert.update({
            where: { id: alertId },
            data: {
                make,
                model,
                yearMin: yearMin ? parseInt(yearMin) : null,
                yearMax: yearMax ? parseInt(yearMax) : null,
                variant: variant || null,
                region,
                frequency: frequency || 'daily',
            },
            include: ALERT_INCLUDE,
        });

        return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error: any) {
        console.error("Update alert error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const alertId = parseInt(id);

        const existing = await prisma.alert.findUnique({ where: { id: alertId } });
        if (!existing) {
            return NextResponse.json({ message: "Alert not found" }, { status: 404 });
        }

        await prisma.alert.delete({ where: { id: alertId } });

        return NextResponse.json({ message: "Alert deleted" }, { status: 200 });
    } catch (error: any) {
        console.error("Delete alert error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
