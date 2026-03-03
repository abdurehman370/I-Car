import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ makeId: string }> }
) {
    try {
        const { makeId: makeIdStr } = await params;
        const makeId = parseInt(makeIdStr);
        if (isNaN(makeId)) {
            return NextResponse.json({ error: 'Invalid make ID' }, { status: 400 });
        }

        const models = await prisma.carModel.findMany({
            where: { makeId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(models);
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
