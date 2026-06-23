import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const make = await prisma.carMake.upsert({
            where: { name: name.toLowerCase() },
            update: {},
            create: { name: name.toLowerCase() },
        });

        return NextResponse.json({ success: true, make });
    } catch (error) {
        console.error('Error adding make:', error);
        return NextResponse.json({ error: 'Failed to add make' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        await prisma.carMake.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
