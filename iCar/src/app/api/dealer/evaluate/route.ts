import { NextResponse } from 'next/server';
import { getDealerSession } from '@/lib/auth';
import { formatMileageDisplay, formatMileageRangeDisplay } from '@/lib/mileage';

const LISTING_VALUATION_PROMPT = `You are an expert used-car dealer appraiser. Your task is to produce a dealer-focused valuation for the selected region using:

1. Live market evidence from internet listings/marketplaces (search the web), and
2. Condition analysis from 1–5 user-uploaded images (mandatory).

You will receive:
- Region/Country/Market
- Vehicle details: Make, Model, Variant/Trim, Year, Mileage, Specs, Notes
- 1-5 photos of the vehicle

What you must do:

A) Identify local market + currency
Use the provided Region to determine the most relevant local marketplaces and listing sites for that region, and the local currency. All output prices must be in that region's typical currency.

B) Market comp valuation (internet-based)
Search the web for recent comparable listings in the given region. Prefer same city/region if available. Filter comps by: same year (±1 if needed), similar mileage (±20,000 km if possible), similar trim/specs/engine where possible.
From comps, derive these ranges:
- Fair Market Retail (private buyer) range
- Dealer Retail Asking range (what dealers list it for)
- Dealer Buy Price (recommended acquisition) range (what a dealer should pay)

C) Photo-based condition adjustment (important)
Analyze the images to judge visible condition and adjust the Dealer Buy Price accordingly.
Look for: scratches, dents, paint mismatch, panel gaps, corrosion, wheel rash, tire wear, interior wear, upholstery damage, warning lights, flood/accident hints, poor detailing.
Assign condition category: Excellent / Good / Average / Rough
Apply adjustment to Dealer Buy Price:
- Excellent: 0% to +2%
- Good: 0% to −3%
- Average: −3% to −7%
- Rough: −7% to −15% (or more if severe)
If photos are not enough to confirm major issues, say so and keep the adjustment conservative.

D) Dealer mindset rules
Assume the user is a dealer who needs: reconditioning budget, negotiation buffer, margin, time-to-sell risk buffer. The Dealer Buy Price must be meaningfully lower than dealer retail.

Output format (STRICT — return ONLY this, no other sections or text):

## Summary

**Region:** <region>
**Vehicle:** <year make model variant>
**Mileage:** <xx,xxx km> | **Specs:** <...>
**Condition (from photos):** <Excellent/Good/Average/Rough> — 1 line why

## Price Ranges (local currency)

**Fair Market Retail (private):** <low> – <high>

**Dealer Retail Asking:** <low> – <high>

**Dealer Buy Price (recommended):** <low> – <high>

Do NOT include "How I Calculated It", "Dealer Notes", market comps, baseline, photo adjustment details, quick-turn strategy, or any other sections. Only the Summary and the three price ranges above.`;

const QUICK_VALUATION_PROMPT = `You are an expert used-car dealer appraiser. Produce a dealer-focused valuation using live market evidence from internet listings (search the web). No vehicle photos are provided.

You will receive:
- Region/Country/Market
- Vehicle details: Make, Model, Variant/Trim, Year, Mileage (single value OR min–max range), Specs, Notes

What you must do:

A) Identify local market + currency for the region. All prices in that region's typical currency.

B) Search for comparable listings. Filter by year (±1 if needed), mileage within or near the provided range, similar trim/specs.
Derive Fair Market Retail, Dealer Retail Asking, and Dealer Buy Price ranges.

C) No photos — assume **Average** condition unless Notes specify otherwise. State this in Summary.

D) If mileage is a range, value across that range (wider price bands are acceptable) and mention the mileage range in Summary.

Output format (STRICT — same as listing valuation, but Condition line should say "Estimated (no photos)" instead of photo-based):

## Summary

**Region:** <region>
**Vehicle:** <year make model variant>
**Mileage:** <range or single> | **Specs:** <...>
**Condition (estimated):** <category> — no photos supplied

## Price Ranges (local currency)

**Fair Market Retail (private):** <low> – <high>

**Dealer Retail Asking:** <low> – <high>

**Dealer Buy Price (recommended):** <low> – <high>

Only Summary and Price Ranges sections.`;

function buildMileageLabel(
    mileage?: number,
    mileageMin?: number,
    mileageMax?: number
): string {
    if (mileageMin != null && mileageMax != null) {
        return formatMileageRangeDisplay(mileageMin, mileageMax);
    }
    if (mileage != null) {
        return formatMileageDisplay(mileage);
    }
    return 'Not specified';
}

export async function POST(request: Request) {
    try {
        const session = await getDealerSession();
        if (!session?.user) {
            return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        const payload = await request.json();
        const {
            region,
            make,
            model,
            variant,
            year,
            mileage,
            mileageMin,
            mileageMax,
            specs = 'Unknown',
            notes = '',
            images = [],
            mode = 'listing',
        } = payload;

        const isQuick = mode === 'quick';

        if (!region || !make || !model || !year) {
            return NextResponse.json(
                { message: 'Missing required fields: region, make, model, year' },
                { status: 400 }
            );
        }

        let mileageLabel: string;
        let numericMileage: number | undefined;

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
            mileageLabel = buildMileageLabel(undefined, min, max);
            numericMileage = Math.round((min + max) / 2);
        } else {
            const km = parseInt(String(mileage), 10);
            if (Number.isNaN(km) || km < 0) {
                return NextResponse.json(
                    { message: 'Missing or invalid mileage' },
                    { status: 400 }
                );
            }
            mileageLabel = buildMileageLabel(km);
            numericMileage = km;
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

        const apiKey = process.env.LLM_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { message: 'LLM API key not configured' },
                { status: 500 }
            );
        }

        const photoNote = isQuick
            ? 'No photos provided. Use market data only and assume average condition unless notes say otherwise.'
            : `Below are ${imageList.length} photo(s) of the vehicle. Analyze them for condition.`;

        const userContent: Array<
            { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
        > = [
            {
                type: 'text',
                text: `Evaluate this vehicle:

**Region:** ${region}
**Make:** ${make}
**Model:** ${model}
**Variant/Trim:** ${variant || 'Not specified'}
**Year:** ${year}
**Mileage:** ${mileageLabel}
**Specs:** ${specs}
**Notes:** ${notes || 'None'}

${photoNote}

Produce the full dealer valuation report in the exact markdown format specified.`,
            },
        ];

        if (!isQuick) {
            for (const img of imageList) {
                const url = typeof img === 'string' ? img : img.url || img;
                if (url && url.startsWith('data:')) {
                    userContent.push({
                        type: 'image_url',
                        image_url: { url },
                    });
                }
            }
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer':
                    process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.NEXTAUTH_URL ||
                    'http://localhost:3000',
                'X-Title': 'iCar Dealer Portal',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'system',
                        content: isQuick ? QUICK_VALUATION_PROMPT : LISTING_VALUATION_PROMPT,
                    },
                    { role: 'user', content: userContent },
                ],
                max_tokens: 4096,
                temperature: 0.3,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data.error?.message || data.message || 'LLM request failed';
            console.error(`OpenRouter Error:`, errMsg, data);
            return NextResponse.json(
                { message: `Valuation service error: ${errMsg}` },
                { status: response.status >= 400 ? response.status : 500 }
            );
        }

        const markdown = data.choices?.[0]?.message?.content?.trim() || '';

        return NextResponse.json({
            status: 'ok',
            region,
            currency: 'AED',
            markdown,
            mileageUsed: numericMileage,
        });
    } catch (error) {
        console.error('Valuation API error:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Failed to evaluate vehicle' },
            { status: 500 }
        );
    }
}
