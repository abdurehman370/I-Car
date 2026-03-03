import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
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
    // Basic delete logic - in a real app would need more safety
    try {
        const { id } = await request.json();
        await prisma.carMake.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
