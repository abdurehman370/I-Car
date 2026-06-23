import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { modelId, name } = await request.json();
        if (!modelId || !name) {
            return NextResponse.json({ error: 'modelId and name are required' }, { status: 400 });
        }

        const variant = await prisma.carVariant.create({
            data: {
                name,
                modelId: parseInt(modelId),
            },
        });

        return NextResponse.json({ success: true, variant });
    } catch (error) {
        console.error('Error adding variant:', error);
        return NextResponse.json({ error: 'Failed to add variant' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        await prisma.carVariant.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
