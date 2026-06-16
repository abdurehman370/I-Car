import { NextResponse } from 'next/server';
import { requireValuationSession } from '@/lib/require-dealer-portal';
import { isPartnerRole } from '@/lib/portal-access';
import { evaluateVehicleWithAI } from '@/lib/valuation/openaiValuation';

export async function POST(request: Request) {
    try {
        const auth = await requireValuationSession();
        if (!auth.ok) return auth.response;

        const sessionRole = auth.session.user.role as string;
        const payload = await request.json();
        const {
            region,
            make,
            model,
            year,
            mileage,
            mileageMin,
            mileageMax,
            images = [],
            mode = 'listing',
        } = payload;

        const isPartner = isPartnerRole(sessionRole) || mode === 'partner';
        const isQuick = isPartner || mode === 'quick';

        if (isPartnerRole(sessionRole) && mode === 'listing') {
            return NextResponse.json(
                { message: 'Partner accounts can only use quick price evaluation (no photo upload)' },
                { status: 403 }
            );
        }

        if (!region || !make || !model || !year) {
            return NextResponse.json(
                { message: 'Missing required fields: region, make, model, year' },
                { status: 400 }
            );
        }

        const validRegions = ['LEBANON', 'UAE', 'EUROPE'];
        if (!validRegions.includes(String(region).toUpperCase())) {
            return NextResponse.json(
                { message: 'Unsupported region' },
                { status: 400 }
            );
        }

        if (isQuick) {
            const min = mileageMin != null ? parseInt(String(mileageMin), 10) : NaN;
            const max = mileageMax != null ? parseInt(String(mileageMax), 10) : NaN;
            if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0) {
                return NextResponse.json(
                    { message: 'Please provide valid mileage min and max (km)' },
                    { status: 400 }
                );
            }
            if (min > max) {
                return NextResponse.json(
                    { message: 'Minimum mileage cannot exceed maximum mileage' },
                    { status: 400 }
                );
            }
        } else {
            const km = parseInt(String(mileage), 10);
            if (Number.isNaN(km) || km < 0) {
                return NextResponse.json(
                    { message: 'Missing or invalid mileage' },
                    { status: 400 }
                );
            }
        }

        const imageList = Array.isArray(images) ? images : [];

        if (!isQuick) {
            if (imageList.length < 1 || imageList.length > 5) {
                return NextResponse.json(
                    { message: 'Please provide 1 to 5 vehicle photos (mandatory)' },
                    { status: 400 }
                );
            }
        }

        // The OPEN_AI_KEY check is now handled in openaiValuation.ts implicitly via process.env 
        if (!process.env.OPEN_AI_KEY && !process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { message: 'OpenAI API key not configured' },
                { status: 500 }
            );
        }

        // Proceed to AI evaluation service
        const result = await evaluateVehicleWithAI(payload);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Valuation API error:', error);
        
        let status = 500;
        const msg = error.message || 'Failed to evaluate vehicle';
        
        // Return clean 502 for specific upstream failures
        if (msg.includes('Marketplace search could not be completed') || msg.includes('Structured JSON invalid') || msg.includes('Empty response')) {
            status = 502;
        }

        return NextResponse.json(
            { message: msg },
            { status }
        );
    }
}
