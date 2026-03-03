import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ modelId: string }> }
) {
    try {
        const { modelId: modelIdStr } = await params;
        const modelId = parseInt(modelIdStr);
        if (isNaN(modelId)) {
            return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
        }

        const variants = await prisma.carVariant.findMany({
            where: { modelId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(variants);
    } catch (error) {
        console.error('Error fetching variants:', error);
        return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
    }
}
