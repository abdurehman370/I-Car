import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth"; // adjust if your path differs

export async function GET(request: NextRequest) {
    try {
        // ✅ Optional: protect route (admin only)
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;

        // Optional filters/pagination
        const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
        const limit = Math.min(
            Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
            200
        );
        const skip = (page - 1) * limit;

        const q = (searchParams.get("q") || "").trim(); // search email/name/city etc.
        const approvalStatus = (searchParams.get("approvalStatus") || "").trim(); // pending/approved/...
        const country = (searchParams.get("country") || "").trim();

        // ⚠️ IMPORTANT: use the correct Prisma model name:
        // If your schema has `model Dealer`, use prisma.dealer
        // If your schema has `model Dealers`, use prisma.dealers
        const where: any = {
            ...(approvalStatus ? { approvalStatus } : {}),
            ...(country ? { country } : {}),
            ...(q
                ? {
                    OR: [
                        { email: { contains: q } },
                        { dealershipName: { contains: q } },
                        { contactPerson: { contains: q } },
                        { city: { contains: q } },
                        { phoneNumber: { contains: q } },
                    ],
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.dealer.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    dealershipName: true,
                    contactPerson: true,
                    phoneNumber: true,
                    address: true,
                    city: true,
                    country: true,
                    approvalStatus: true,
                    createdAt: true,
                    updatedAt: true,
                    // ❌ password intentionally excluded
                },
            }),
            prisma.dealer.count({ where }),
        ]);

        return NextResponse.json(
            {
                data: items,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET dealers error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
