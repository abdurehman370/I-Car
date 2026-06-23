import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { makeId, name } = await request.json();
        if (!makeId || !name) {
            return NextResponse.json({ error: 'makeId and name are required' }, { status: 400 });
        }

        const model = await prisma.carModel.create({
            data: {
                name,
                makeId: parseInt(makeId),
            },
        });

        return NextResponse.json({ success: true, model });
    } catch (error) {
        console.error('Error adding model:', error);
        return NextResponse.json({ error: 'Failed to add model' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        await prisma.carModel.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
