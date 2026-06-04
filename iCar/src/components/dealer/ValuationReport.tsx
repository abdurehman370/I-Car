"use client";

import { DollarSign } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function parsePriceRanges(markdown: string): { label: string; range: string }[] {
  const fmrMatch = markdown.match(/\*\*Fair Market Retail[^:*]*:\*\*\s*([^\n]+)/i);
  const dbpMatch = markdown.match(/\*\*Dealer Buy Price[^:*]*:\*\*\s*([^\n]+)/i);
  const results: { label: string; range: string }[] = [];

  if (fmrMatch) {
    const fmr = fmrMatch[1].trim();
    results.push({ label: "Fair Market Retail", range: fmr });
    const numbers = fmr.replace(/,/g, "").match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length >= 2) {
      const n1 = parseFloat(numbers[0]);
      const n2 = parseFloat(numbers[numbers.length - 1]);
      const avg = Math.round((n1 + n2) / 2);
      const currencyMatch = fmr.match(/[A-Za-z$€£]+/);
      const currency = currencyMatch ? currencyMatch[0] : "";
      const avgRange = currency.match(/^[$€£]/)
        ? `${currency}${avg.toLocaleString()}`
        : `${avg.toLocaleString()} ${currency}`.trim();
      results.push({ label: "Average Fair Market Price", range: avgRange });
    }
  }

  if (dbpMatch) {
    results.push({ label: "Dealer Buy Price", range: dbpMatch[1].trim() });
  }

  return results;
}

function markdownWithoutPriceRanges(markdown: string): string {
  return markdown
    .replace(/\*\*Fair Market Retail[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/\*\*Dealer Retail Asking[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/\*\*Dealer Buy Price[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ValuationReportProps {
  markdown: string;
  title?: string;
}

export function ValuationReport({ markdown, title = "Evaluation Report" }: ValuationReportProps) {
  const priceCards = parsePriceRanges(markdown);

  return (
    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="size-5 text-cyan-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto space-y-4">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h2 className="text-base font-semibold mt-6 mb-2 text-cyan-500 dark:text-cyan-400 first:mt-0">
                {children}
              </h2>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
            strong: ({ children }) => (
              <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
            ),
            p: ({ children }) => (
              <p className="my-1 text-gray-700 dark:text-gray-300">{children}</p>
            ),
          }}
        >
          {markdownWithoutPriceRanges(markdown)}
        </ReactMarkdown>
      </div>
      {priceCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
          {priceCards.map(({ label, range }) => {
            const isDealerBuy = label === "Dealer Buy Price";
            return (
              <div
                key={label}
                className={`rounded-xl border p-4 shadow-sm ${
                  isDealerBuy
                    ? "border-cyan-300 dark:border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10 ring-1 ring-cyan-200 dark:ring-cyan-500/30"
                    : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                }`}
              >
                <p
                  className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                    isDealerBuy ? "text-cyan-500 dark:text-cyan-400" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {label}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{range}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
