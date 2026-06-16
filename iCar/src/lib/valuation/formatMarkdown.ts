import { ValuationResult } from './schema';

export function buildMarkdownFromValuationJson(result: ValuationResult): string {
    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    let markdown = '';

    if (result.region === 'UAE') {
        markdown += '💰 Market Price\n';
        markdown += `AED ${formatPrice(result.marketPrice.min)} – ${formatPrice(result.marketPrice.max)}\n`;
        if (result.marketPriceUsd) {
            markdown += `USD ${formatPrice(result.marketPriceUsd.min)} – ${formatPrice(result.marketPriceUsd.max)}\n`;
        }

        markdown += '\n🏷️ Dealer Buy Price\n';
        markdown += `AED ${formatPrice(result.dealerBuyPrice.min)} – ${formatPrice(result.dealerBuyPrice.max)}\n`;
        if (result.dealerBuyPriceUsd) {
            markdown += `USD ${formatPrice(result.dealerBuyPriceUsd.min)} – ${formatPrice(result.dealerBuyPriceUsd.max)}`;
        }
    } else if (result.region === 'LEBANON') {
        markdown += '💰 Market Price\n';
        markdown += `USD ${formatPrice(result.marketPrice.min)} – ${formatPrice(result.marketPrice.max)}\n`;

        markdown += '\n🏷️ Dealer Buy Price\n';
        markdown += `USD ${formatPrice(result.dealerBuyPrice.min)} – ${formatPrice(result.dealerBuyPrice.max)}`;
    } else if (result.region === 'EUROPE') {
        markdown += '💰 Market Price\n';
        markdown += `EUR ${formatPrice(result.marketPrice.min)} – ${formatPrice(result.marketPrice.max)}\n`;
        if (result.marketPriceUsd) {
            markdown += `USD ${formatPrice(result.marketPriceUsd.min)} – ${formatPrice(result.marketPriceUsd.max)}\n`;
        }

        markdown += '\n🏷️ Dealer Buy Price\n';
        markdown += `EUR ${formatPrice(result.dealerBuyPrice.min)} – ${formatPrice(result.dealerBuyPrice.max)}\n`;
        if (result.dealerBuyPriceUsd) {
            markdown += `USD ${formatPrice(result.dealerBuyPriceUsd.min)} – ${formatPrice(result.dealerBuyPriceUsd.max)}`;
        }
    }

    return markdown;
}
