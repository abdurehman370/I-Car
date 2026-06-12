"use client";

import {
  DollarSign,
  TrendingUp,
  Scale,
  Coins,
  Sparkles,
  Layers
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export function parsePriceRanges(markdown: string): { label: string; range: string }[] {
  let fmrMatch = markdown.match(/\*\*Fair Market Retail[^:*]*:\*\*\s*([^\n]+)/i);
  let fmr = '';
  if (fmrMatch) {
    fmr = fmrMatch[1].trim();
  } else {
    const match = markdown.match(/💰?\s*Market\s+Price\s*\n+([^🏷️#]+)/i);
    if (match) {
      fmr = match[1].trim();
    }
  }

  let dbpMatch = markdown.match(/\*\*Dealer Buy Price[^:*]*:\*\*\s*([^\n]+)/i);
  let dbp = '';
  if (dbpMatch) {
    dbp = dbpMatch[1].trim();
  } else {
    const match = markdown.match(/🏷️?\s*Dealer\s+Buy\s+Price\s*\n+([^\n]+(?:\n+[^\n]+)?)/i);
    if (match) {
      dbp = match[1].trim();
    }
  }

  const results: { label: string; range: string }[] = [];

  if (fmr) {
    results.push({ label: "Fair Market Retail", range: fmr });
    // Use only the first line of fmr to avoid averaging different currencies
    const firstLine = fmr.split('\n')[0];
    const numbers = firstLine.replace(/,/g, "").match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length >= 2) {
      const n1 = parseFloat(numbers[0]);
      const n2 = parseFloat(numbers[numbers.length - 1]);
      const avg = Math.round((n1 + n2) / 2);
      const currencyMatch = firstLine.match(/[A-Za-z$€£]+/);
      const currency = currencyMatch ? currencyMatch[0] : "";
      const avgRange = currency.match(/^[$€£]/)
        ? `${currency}${avg.toLocaleString()}`
        : `${avg.toLocaleString()} ${currency}`.trim();
      results.push({ label: "Average Fair Market Price", range: avgRange });
    }
  }

  if (dbp) {
    results.push({ label: "Dealer Buy Price", range: dbp });
  }

  return results;
}

function markdownWithoutPriceRanges(markdown: string): string {
  return markdown
    .replace(/\*\*Fair Market Retail[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/\*\*Dealer Retail Asking[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/\*\*Dealer Buy Price[^:*]*:\*\*\s*[^\n]+/gi, "")
    .replace(/💰?\s*Market\s+Price\s*\n+[^🏷️#]+/gi, "")
    .replace(/🏷️?\s*Dealer\s+Buy\s+Price\s*\n+[^💰#]+/gi, "")
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
    <div className="relative overflow-hidden bg-white dark:bg-[#0a1526] rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm transition-all duration-300">
      {/* Decorative top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

      {/* Glow Effects in Dark Mode */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/5 dark:bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-500/5 dark:bg-blue-500/5 blur-3xl pointer-events-none" />

      <div className="p-6 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time dealer market appraisal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5">
            <Sparkles className="size-3.5 text-cyan-500 animate-pulse" />
            <span>AI Powered</span>
          </div>
        </div>

        {/* Markdown Report Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 space-y-4">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="flex items-center gap-2 text-base font-bold mt-6 mb-3 text-cyan-600 dark:text-cyan-400 first:mt-0 tracking-tight border-b border-gray-200 dark:border-white/10 pb-1">
                  <Layers className="size-4 text-cyan-500" />
                  {children}
                </h2>
              ),
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-gray-600 dark:text-gray-300">{children}</ul>,
              li: ({ children }) => <li className="marker:text-cyan-500">{children}</li>,
              strong: ({ children }) => (
                <strong className="text-gray-950 dark:text-white font-semibold">{children}</strong>
              ),
              p: ({ children }) => (
                <p className="my-2 leading-relaxed text-gray-600 dark:text-gray-300">{children}</p>
              ),
            }}
          >
            {markdownWithoutPriceRanges(markdown)}
          </ReactMarkdown>
        </div>

        {/* Pricing Cards Section */}
        {priceCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200 dark:border-white/10">
            {priceCards.map(({ label, range }) => {
              const isDealerBuy = label === "Dealer Buy Price";
              const isAverage = label === "Average Fair Market Price";

              // Select appropriate icon
              let Icon = TrendingUp;
              if (isAverage) Icon = Scale;
              if (isDealerBuy) Icon = Coins;

              // Split lines of range for beautiful multi-currency layout
              const rangeLines = range.split('\n');

              return (
                <div
                  key={label}
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${isDealerBuy
                      ? "border-cyan-300 dark:border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10 ring-1 ring-cyan-200 dark:ring-cyan-500/30"
                      : isAverage
                        ? "border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5 ring-1 ring-blue-50 dark:ring-blue-500/5"
                        : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
                    }`}
                >
                  {/* Decorative background glow for highlights */}
                  {isDealerBuy && (
                    <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-cyan-400/10 dark:bg-cyan-500/5 blur-xl group-hover:scale-125 transition-transform duration-300" />
                  )}

                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${isDealerBuy
                          ? "text-cyan-600 dark:text-cyan-400"
                          : isAverage
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                    >
                      {label}
                    </p>
                    <div className={`p-1.5 rounded-lg ${isDealerBuy
                        ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                        : isAverage
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-gray-200/50 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                      }`}>
                      <Icon className="size-4" />
                    </div>
                  </div>

                  {/* Render Price Ranges Line by Line */}
                  <div className="flex flex-col gap-1.5">
                    {rangeLines.map((line, idx) => {
                      const isMainVal = idx === 0;
                      return (
                        <span
                          key={idx}
                          className={`font-black tracking-tight block ${isMainVal
                              ? "text-xl sm:text-2xl text-gray-900 dark:text-white"
                              : "text-sm font-semibold text-gray-500 dark:text-gray-400"
                            }`}
                        >
                          {line}
                        </span>
                      );
                    })}
                  </div>

                  {/* Top-right corner tag for Featured card */}
                  {isDealerBuy && (
                    <span className="absolute top-1 right-12 transform -translate-y-1/2 bg-cyan-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm scale-90">
                      Acquisition
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
