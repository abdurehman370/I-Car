import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getActiveImportRules } from "@/lib/valuation/importRules/getActiveImportRules";

export async function GET(req: NextRequest) {
    const session = await getAdminSession();
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const region = (req.nextUrl.searchParams.get("region") || "LEBANON").toUpperCase();

        if (region !== "LEBANON") {
            return NextResponse.json(
                { message: "Only LEBANON import rules are supported currently" },
                { status: 400 }
            );
        }

        const active = await getActiveImportRules("LEBANON");

        return NextResponse.json({
            region,
            ruleVersion: active.rules.version,
            isDefaultRules: active.isDefaultRules,
            documentId: active.documentId,
            rules: active.rules,
        });
    } catch (error: any) {
        console.error("Get active import rules error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
