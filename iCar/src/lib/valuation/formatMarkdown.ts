import { ValuationResult } from './schema';

function formatPrice(value: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(value);
}

function formatRange(currency: string, min: number, max: number): string {
    return `${currency} ${formatPrice(min)} – ${formatPrice(max)}`;
}

function formatFuelCategory(fuel: string | null | undefined): string {
    if (!fuel) return 'Unknown';
    return fuel
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Extra transparency block appended for Lebanon fallback valuations
 * (source-market anchor + deterministic import calculation).
 */
function buildLebanonFallbackDetails(result: ValuationResult): string[] {
    const calc = result.importCalculation;

    if (!calc || !calc.applied) return [];

    const lines: string[] = ['', '---', ''];

    if (result.fallbackMarketsUsed && result.fallbackMarketsUsed.length > 0) {
        lines.push(`Fallback used: ${result.fallbackMarketsUsed.join(' + ')}`);
    }

    if (result.localMarketAssessment) {
        lines.push(`Reason: ${result.localMarketAssessment.reason}`);
    }

    if (calc.ruleVersion) {
        lines.push(
            `Import rule used: Lebanon customs rules ${calc.ruleVersion}${calc.usedDefaultRules ? ' (built-in defaults — no active PDF)' : ''}`
        );
    }

    lines.push(`Fuel category: ${formatFuelCategory(calc.fuelCategory)}`);

    if (calc.taxRateApplied !== null) {
        lines.push(`Import/tax load applied: ${Math.round(calc.taxRateApplied * 100)}%`);
    }

    if (calc.sourceMarket) {
        lines.push(`Source anchor: ${calc.sourceMarket}`);
    }

    if (calc.sourceMarketPriceUsd) {
        lines.push(
            `Source anchor price: ${formatRange('USD', calc.sourceMarketPriceUsd.min, calc.sourceMarketPriceUsd.max)}`
        );
    }

    if (calc.estimatedTaxUsd) {
        lines.push(
            `Estimated tax/import amount: ${formatRange('USD', calc.estimatedTaxUsd.min, calc.estimatedTaxUsd.max)}`
        );
    }

    if (calc.landedCostUsd) {
        lines.push(
            `Landed benchmark: ${formatRange('USD', calc.landedCostUsd.min, calc.landedCostUsd.max)}`
        );
    }

    return lines;
}

export function buildMarkdownFromValuationJson(result: ValuationResult): string {
    if (result.region === 'UAE') {
        return [
            '💰 Market Price',
            formatRange('AED', result.marketPrice.min, result.marketPrice.max),
            result.marketPriceUsd
                ? formatRange('USD', result.marketPriceUsd.min, result.marketPriceUsd.max)
                : null,
            '',
            '🏷️ Dealer Buy Price',
            formatRange('AED', result.dealerBuyPrice.min, result.dealerBuyPrice.max),
            result.dealerBuyPriceUsd
                ? formatRange('USD', result.dealerBuyPriceUsd.min, result.dealerBuyPriceUsd.max)
                : null,
        ].filter((line) => line !== null).join('\n');
    }

    if (result.region === 'EUROPE') {
        return [
            '💰 Market Price',
            formatRange('EUR', result.marketPrice.min, result.marketPrice.max),
            result.marketPriceUsd
                ? formatRange('USD', result.marketPriceUsd.min, result.marketPriceUsd.max)
                : null,
            '',
            '🏷️ Dealer Buy Price',
            formatRange('EUR', result.dealerBuyPrice.min, result.dealerBuyPrice.max),
            result.dealerBuyPriceUsd
                ? formatRange('USD', result.dealerBuyPriceUsd.min, result.dealerBuyPriceUsd.max)
                : null,
        ].filter((line) => line !== null).join('\n');
    }

    // Lebanon
    const lines: (string | null)[] = [
        '💰 Market Price — Lebanon',
        formatRange('USD', result.marketPrice.min, result.marketPrice.max),
        '',
        '🏷️ Dealer Buy Price',
        formatRange('USD', result.dealerBuyPrice.min, result.dealerBuyPrice.max),
        ...buildLebanonFallbackDetails(result),
    ];

    return lines.filter((line) => line !== null).join('\n');
}
