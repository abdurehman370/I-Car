import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const res = await fetch('http://localhost:8000/api/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.SCRAPER_API_KEY || 'default_dev_key'
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Valuation proxy error:', error);
        return NextResponse.json({ message: 'Failed to evaluate vehicle' }, { status: 500 });
    }
}
