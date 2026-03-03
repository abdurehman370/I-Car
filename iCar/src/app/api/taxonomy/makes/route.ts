import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const makes = await prisma.carMake.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(makes);
    } catch (error) {
        console.error('Error fetching makes:', error);
        return NextResponse.json({ error: 'Failed to fetch makes' }, { status: 500 });
    }
}
