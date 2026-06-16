import { NextResponse } from 'next/server';
import { requireValuationSession } from '@/lib/require-dealer-portal';
import { isPartnerRole } from '@/lib/portal-access';
import { evaluateVehicleWithAI } from '@/lib/valuation/openaiValuation';

type EvaluationMode = 'quick' | 'listing' | 'partner';

function parseInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMode(mode: unknown): EvaluationMode {
    if (mode === 'quick' || mode === 'listing' || mode === 'partner') {
        return mode;
    }

    return 'listing';
}

function isValidDataUrlImage(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    return /^data:image\/(png|jpe?g|webp);base64,/i.test(value);
}

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
        } = payload;

        const mode = normalizeMode(payload.mode);
        const regionUpper = String(region || '').toUpperCase();

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
        if (!validRegions.includes(regionUpper)) {
            return NextResponse.json(
                { message: 'Unsupported region' },
                { status: 400 }
            );
        }

        const parsedYear = parseInteger(year);
        if (parsedYear === null || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 2) {
            return NextResponse.json(
                { message: 'Missing or invalid year' },
                { status: 400 }
            );
        }

        const parsedMileage = parseInteger(mileage);
        const parsedMileageMin = parseInteger(mileageMin);
        const parsedMileageMax = parseInteger(mileageMax);

        if (isQuick) {
            const hasSingleMileage = parsedMileage !== null && parsedMileage >= 0;
            const hasMileageRange =
                parsedMileageMin !== null &&
                parsedMileageMax !== null &&
                parsedMileageMin >= 0 &&
                parsedMileageMax >= 0;

            if (!hasSingleMileage && !hasMileageRange) {
                return NextResponse.json(
                    { message: 'Please provide either mileage or valid mileage min and max (km)' },
                    { status: 400 }
                );
            }

            if (hasMileageRange && parsedMileageMin > parsedMileageMax) {
                return NextResponse.json(
                    { message: 'Minimum mileage cannot exceed maximum mileage' },
                    { status: 400 }
                );
            }
        } else {
            if (parsedMileage === null || parsedMileage < 0) {
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

            const invalidImage = imageList.some((img: unknown) => {
                const url = typeof img === 'string' ? img : (img as any)?.url;
                return !isValidDataUrlImage(url);
            });

            if (invalidImage) {
                return NextResponse.json(
                    { message: 'Invalid image format. Please upload PNG, JPG, JPEG, or WEBP images.' },
                    { status: 400 }
                );
            }
        }

        if (!process.env.OPEN_AI_KEY && !process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { message: 'OpenAI API key not configured' },
                { status: 500 }
            );
        }

        const normalizedPayload = {
            ...payload,
            region: regionUpper,
            mode: isQuick ? 'quick' : 'listing',
            year: parsedYear,
            mileage: parsedMileage,
            mileageMin: parsedMileageMin,
            mileageMax: parsedMileageMax,
            images: imageList,
        };

        const result = await evaluateVehicleWithAI(normalizedPayload);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Valuation API error:', error);

        const msg = error?.message || 'Failed to evaluate vehicle';

        let status = 500;

        if (
            msg.includes('Marketplace search could not be completed') ||
            msg.includes('Structured JSON invalid') ||
            msg.includes('Empty response') ||
            msg.includes('OpenAI request failed')
        ) {
            status = 502;
        }

        return NextResponse.json(
            { message: msg },
            { status }
        );
    }
}