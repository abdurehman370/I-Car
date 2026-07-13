import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getAdminSession();
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const region = (req.nextUrl.searchParams.get("region") || "LEBANON").toUpperCase();

        const documents = await prisma.importRuleDocument.findMany({
            where: { region },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                region: true,
                originalFileName: true,
                fileUrl: true,
                mimeType: true,
                sizeBytes: true,
                rulesJson: true,
                status: true,
                version: true,
                createdAt: true,
                updatedAt: true,
                activatedAt: true,
                uploadedBy: { select: { username: true } },
            },
        });

        return NextResponse.json({ documents });
    } catch (error: any) {
        console.error("List import rules error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
