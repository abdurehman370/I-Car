import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { LebanonImportRulesJsonSchema } from "@/lib/valuation/importRules/types";

/**
 * Activates a rule document. Archives the previously active document for
 * the same region — only one active document per region at a time.
 */
export async function POST(req: NextRequest, context: any) {
    const session = await getAdminSession();
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const params = await context.params;
        const id = parseInt(params.id);

        const doc = await prisma.importRuleDocument.findUnique({ where: { id } });
        if (!doc) {
            return NextResponse.json({ message: "Document not found" }, { status: 404 });
        }

        if (doc.status === "active") {
            return NextResponse.json({ message: "Document is already active" }, { status: 400 });
        }

        // Never activate a document whose rules do not validate
        const validation = LebanonImportRulesJsonSchema.safeParse(doc.rulesJson);
        if (!validation.success) {
            return NextResponse.json(
                { message: "This document's extracted rules are invalid and cannot be activated" },
                { status: 422 }
            );
        }

        const [, activated] = await prisma.$transaction([
            prisma.importRuleDocument.updateMany({
                where: { region: doc.region, status: "active" },
                data: { status: "archived" },
            }),
            prisma.importRuleDocument.update({
                where: { id },
                data: { status: "active", activatedAt: new Date() },
            }),
        ]);

        return NextResponse.json({
            document: activated,
            message: `Rules ${activated.version} are now active`,
        });
    } catch (error: any) {
        console.error("Activate import rules error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
