import { ValuationResult } from './schema';

function formatPrice(value: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(value);
}

function formatRange(currency: string, min: number, max: number): string {
    return `${currency} ${formatPrice(min)} – ${formatPrice(max)}`;
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
            console.log(result),
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

    return [
        '💰 Market Price',
        formatRange('USD', result.marketPrice.min, result.marketPrice.max),
        '',
        '🏷️ Dealer Buy Price',
        formatRange('USD', result.dealerBuyPrice.min, result.dealerBuyPrice.max),
    ].join('\n');
}