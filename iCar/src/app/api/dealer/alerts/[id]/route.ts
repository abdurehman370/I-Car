import prisma from "@/lib/db";
import { getDealerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function getOwnedAlert(alertId: number, dealerId: number) {
    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) return { error: "Alert not found", status: 404 };
    if (alert.dealerId !== dealerId) return { error: "Forbidden", status: 403 };
    return { alert };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const alertId = parseInt(id);
        const { error, status } = await getOwnedAlert(alertId, session.user.id) as any;
        if (error) return NextResponse.json({ message: error }, { status });

        const body = await request.json();
        const { make, model, yearMin, yearMax, variant, region, frequency, enabled } = body;

        // Partial update: allow toggling enabled without other fields
        if (typeof enabled === 'boolean') {
            await prisma.$executeRaw`UPDATE \`Alert\` SET \`enabled\` = ${enabled}, \`updatedAt\` = NOW() WHERE id = ${alertId} AND dealerId = ${session.user.id}`;
            const updated = await prisma.alert.findUnique({ where: { id: alertId } });
            if (!updated) return NextResponse.json({ message: "Alert not found" }, { status: 404 });
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
        const session = await getDealerSession();
        if (!session || session.type !== 'dealer') {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const alertId = parseInt(id);
        const { error, status } = await getOwnedAlert(alertId, session.user.id) as any;
        if (error) return NextResponse.json({ message: error }, { status });

        await prisma.alert.delete({ where: { id: alertId } });

        return NextResponse.json({ message: "Alert deleted" }, { status: 200 });
    } catch (error: any) {
        console.error("Delete alert error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
