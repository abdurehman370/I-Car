import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";

/** Archive a rule document (soft delete). */
export async function DELETE(req: NextRequest, context: any) {
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

        const archived = await prisma.importRuleDocument.update({
            where: { id },
            data: { status: "archived" },
        });

        return NextResponse.json({
            document: archived,
            message: doc.status === "active"
                ? "Active rules archived — default built-in rules will be used until a new document is activated"
                : "Document archived",
        });
    } catch (error: any) {
        console.error("Archive import rules error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
