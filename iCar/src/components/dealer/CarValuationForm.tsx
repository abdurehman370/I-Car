"use client";

import { useState } from "react";
import { Car, DollarSign, Loader2, CalendarX2 } from "lucide-react";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";
import { MarketRegionSelect } from "@/components/FormElements/MarketRegionSelect";
import { MileageFields } from "@/components/dealer/MileageFields";
import { ValuationReport } from "@/components/dealer/ValuationReport";
import { buildStoredRegion, type Market } from "@/lib/regions";

export type ValuationVariant = "dealer" | "partner";

// Rough client-side cost estimate — ADJUST to your real model pricing.
// (The server also returns usage.estimatedCostUsd computed from actual tokens.)
const COST_RATES = {
  inputPer1M: 1.25,
  cachedInputPer1M: 0.125,
  outputPer1M: 10,
  webSearchPerCall: 0.025,
};

function roughClientCost(u: Record<string, number> | undefined): number {
  if (!u) return 0;
  const inp = Number(u.inputTokens ?? (u as Record<string, number>).input_tokens ?? 0);
  const cached = Number(u.cachedInputTokens ?? 0);
  const out = Number(u.outputTokens ?? (u as Record<string, number>).output_tokens ?? 0);
  const nonCached = Math.max(inp - cached, 0);
  return (
    (nonCached / 1e6) * COST_RATES.inputPer1M +
    (cached / 1e6) * COST_RATES.cachedInputPer1M +
    (out / 1e6) * COST_RATES.outputPer1M +
    COST_RATES.webSearchPerCall
  );
}

/**
 * Developer console logging: prints the full request, response, prices, meta,
 * sources, token usage and estimated search cost for every valuation.
 * Wrapped so logging can never break the UI.
 */
function logValuationToConsole(
  requestPayload: unknown,
  res: Response,
  data: any,
  elapsedMs: number,
) {
  try {
    const u = data?.usage ?? {};
    const title = `🚗 CarQ Valuation — ${data?.valuation?.vehicle?.make ?? ""} ${
      data?.valuation?.vehicle?.model ?? ""
    } ${data?.valuation?.vehicle?.year ?? ""}`.trim();

    /* eslint-disable no-console */
    console.groupCollapsed(`%c${title}`, "color:#22d3ee;font-weight:bold;");
    console.log("⏱  HTTP:", res.status, res.ok ? "OK" : "ERROR", `· ${Math.round(elapsedMs)}ms`);
    console.log("🧠 Model:", data?.meta?.model ?? "(unknown)");
    console.log(
      "🔎 Web search used:", data?.meta?.webSearchUsed,
      "| Cache hit:", data?.meta?.cacheHit,
      "| Fallback used:", data?.valuation?.fallbackUsed ?? data?.meta?.fallbackUsed,
    );
    console.log("📤 Request payload:", requestPayload);

    if (data?.status === "invalid_vehicle") {
      console.warn("🚫 Invalid vehicle:", data?.message);
    }

    if (data?.valuation) {
      console.log("💰 Market price (USD):", data.valuation.marketPriceUsd ?? data.valuation.marketPrice);
      console.log("🏷  Dealer buy (USD):", data.valuation.dealerBuyPriceUsd ?? data.valuation.dealerBuyPrice);
      console.log(
        "📊 Confidence:", data.valuation.confidence,
        "| sourceMarketAnchorUsed:", data.valuation.sourceMarketAnchorUsed,
      );
    }

    console.log(
      "🌍 Submitted source:", data?.meta?.submittedVehicleSourceType,
      "| Source-matched local anchor:", data?.meta?.sourceMatchedLocalAnchorFound,
      "| Import duty applied:", data?.meta?.importCalculationApplied,
    );
    if (data?.meta?.importDutySkippedReason) {
      console.log("🧾 Import duty skipped:", data.meta.importDutySkippedReason);
    }

    console.log("📈 Token usage:");
    console.table({
      inputTokens: u.inputTokens ?? u.input_tokens,
      cachedInputTokens: u.cachedInputTokens,
      outputTokens: u.outputTokens ?? u.output_tokens,
      totalTokens: u.totalTokens ?? u.total_tokens,
    });

    const serverCost = u.estimatedCostUsd;
    console.log(
      "💵 Estimated cost (server):",
      serverCost != null ? `$${Number(serverCost).toFixed(4)}` : "null (set OPENAI_*_PRICE_PER_1M envs)",
    );
    console.log(
      "💵 Estimated cost (client, rough):",
      `$${roughClientCost(u).toFixed(4)}`,
      "· rates:", COST_RATES,
    );

    console.log("🌐 Sources:", data?.sources);
    console.groupCollapsed("🧾 Full meta");
    console.log(data?.meta);
    console.groupEnd();
    console.groupCollapsed("📦 Full response");
    console.log(data);
    console.groupEnd();
    console.groupEnd();
    /* eslint-enable no-console */
  } catch {
    /* logging must never break the UI */
  }
}

const COPY: Record<
  ValuationVariant,
  {
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    formTitle: string;
    notesPlaceholder: string;
    submitLabel: string;
    loadingLabel: string;
    reportTitle: string;
    evaluateMode: "quick" | "partner";
  }
> = {
  dealer: {
    badge: "TOOLS · QUICK VALUATION",
    title: "Vehicle",
    titleAccent: "Valuation",
    description:
      "Check market pricing for any vehicle without listing it or uploading photos. Enter details and a mileage range to get dealer-focused price bands.",
    formTitle: "Vehicle details",
    notesPlaceholder:
      "Trim details, accident history, service records, expected condition...",
    submitLabel: "Get Valuation",
    loadingLabel: "Analyzing market data...",
    reportTitle: "Valuation result",
    evaluateMode: "quick",
  },
  partner: {
    badge: "PARTNER · LOAN COLLATERAL",
    title: "Car Price",
    titleAccent: "Evaluation",
    description:
      "Enter vehicle details to get a market-based price estimate for loan underwriting and collateral assessment. No photos required.",
    formTitle: "Vehicle for evaluation",
    notesPlaceholder:
      "Loan purpose, known condition, trim level, accident history, or other underwriting notes...",
    submitLabel: "Get Price Estimate",
    loadingLabel: "Calculating market price...",
    reportTitle: "Price evaluation result",
    evaluateMode: "partner",
  },
};

interface InvalidVehicleInfo {
  message: string;
  correction?: {
    make?: string;
    model?: string;
    submittedYear?: number | null;
    earliestValidYear?: number | null;
    latestKnownYear?: number | null;
    suggestedYearRange?: string | null;
    suggestedModelsForYear?: string[];
  } | null;
}

export function CarValuationForm({ variant }: { variant: ValuationVariant }) {
  const copy = COPY[variant];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [invalidVehicle, setInvalidVehicle] = useState<InvalidVehicleInfo | null>(null);
  const [mileageMode, setMileageMode] = useState<"range" | "single">("range");

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    variant: "",
    year: "",
    mileageKm: "",
    mileageMinKm: "",
    mileageMaxKm: "",
    specs: "Unknown",
    notes: "",
    region: "UAE" as Market,
    country: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaxonomyChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMarkdown(null);
    setInvalidVehicle(null);

    try {
      const regionValue = buildStoredRegion(formData.region, formData.country);

      const requestPayload = {
        mode: copy.evaluateMode,
        region: regionValue,
        make: formData.make,
        model: formData.model,
        variant: formData.variant || undefined,
        year: parseInt(formData.year, 10),
        ...(mileageMode === "single"
          ? { mileage: parseInt(formData.mileageKm, 10) }
          : {
              mileageMin: parseInt(formData.mileageMinKm, 10),
              mileageMax: parseInt(formData.mileageMaxKm, 10),
            }),
        specs: formData.specs,
        notes: formData.notes || undefined,
        images: [],
      };

      const startedAt = performance.now();
      const res = await fetch("/api/dealer/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();
      logValuationToConsole(requestPayload, res, data, performance.now() - startedAt);
      if (res.ok && data.status === "invalid_vehicle") {
        setInvalidVehicle({
          message: data.message || "This vehicle/model-year combination is not valid.",
          correction: data.correction || null,
        });
      } else if (res.ok && data.markdown) {
        setMarkdown(data.markdown);
      } else {
        setError(data.message || "Failed to get valuation");
      }
    } catch {
      setError("Failed to connect to valuation service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accentClass =
    variant === "partner"
      ? "border-purple-400/30 text-purple-400"
      : "border-cyan-400/30 text-cyan-400";

  const iconBgClass =
    variant === "partner"
      ? "bg-purple-400/10 border-purple-400/20"
      : "bg-cyan-400/10 border-cyan-400/20";

  const iconClass = variant === "partner" ? "text-purple-400" : "text-cyan-400";

  const buttonClass =
    variant === "partner"
      ? "bg-gradient-to-r from-purple-500 to-violet-500 shadow-purple-500/20"
      : "bg-gradient-to-r from-cyan-500 to-teal-500 shadow-cyan-500/20";

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full glass border text-[10px] font-mono tracking-[0.25em] mb-4 ${accentClass}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full animate-glow ${variant === "partner" ? "bg-purple-400" : "bg-cyan-400"}`}
            />
            {copy.badge}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            {copy.title} <span className="text-gradient">{copy.titleAccent}</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{copy.description}</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="panel p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center border ${iconBgClass}`}
            >
              <Car className={`size-5 ${iconClass}`} />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">{copy.formTitle}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MarketRegionSelect
                market={formData.region}
                country={formData.country}
                onMarketChange={(market) =>
                  setFormData((prev) => ({ ...prev, region: market, country: "" }))
                }
                onCountryChange={(country) =>
                  setFormData((prev) => ({ ...prev, country }))
                }
                labelClassName="text-xs font-mono uppercase tracking-[0.1em] text-gray-400 ml-1"
              />
            </div>

            <CarTaxonomyDropdowns
              selectedMake={formData.make}
              selectedModel={formData.model}
              selectedVariant={formData.variant}
              onChange={handleTaxonomyChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Year *
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  required
                  min={1990}
                  max={2030}
                  className="carq-input"
                  placeholder="e.g. 2022"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Source
                </label>
                <select
                  name="specs"
                  value={formData.specs}
                  onChange={handleInputChange}
                  className="carq-select"
                >
                  <option value="Company source">Company source</option>
                  <option value="TGF Lebanon">TGF Lebanon</option>
                  <option value="GCC">GCC source</option>
                  <option value="European / Germany source">European / Germany source</option>
                  <option value="U.S. source - clean title">U.S. source — clean title</option>
                  <option value="U.S. source - accident/salvage">U.S. source — accident/salvage</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMileageMode("range")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mileageMode === "range"
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 border"
                      : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                  }`}
                >
                  Mileage Range
                </button>
                <button
                  type="button"
                  onClick={() => setMileageMode("single")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mileageMode === "single"
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 border"
                      : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                  }`}
                >
                  Exact Mileage
                </button>
              </div>

              {mileageMode === "range" ? (
                <MileageFields
                  mode="range"
                  mileageMinKm={formData.mileageMinKm}
                  mileageMaxKm={formData.mileageMaxKm}
                  onMileageMinKmChange={(v) =>
                    setFormData((prev) => ({ ...prev, mileageMinKm: v }))
                  }
                  onMileageMaxKmChange={(v) =>
                    setFormData((prev) => ({ ...prev, mileageMaxKm: v }))
                  }
                  required
                />
              ) : (
                <MileageFields
                  mode="single"
                  mileageKm={formData.mileageKm}
                  onMileageKmChange={(v) =>
                    setFormData((prev) => ({ ...prev, mileageKm: v }))
                  }
                  label="Exact Mileage *"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes (optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="carq-textarea"
                placeholder={copy.notesPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.make || !formData.model || !formData.year}
              className={`w-full h-14 text-black rounded-2xl font-bold transition-all hover:scale-[1.01] disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 ${buttonClass}`}
            >
              {loading ? (
                <Loader2 className="animate-spin size-5" />
              ) : (
                <DollarSign className="size-5" />
              )}
              {loading ? copy.loadingLabel : copy.submitLabel}
            </button>
          </form>
        </div>

        {invalidVehicle && (
          <div className="panel p-8 border-amber-500/25 bg-amber-500/[0.04]">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <CalendarX2 className="size-5 text-amber-400" />
              </div>
              <div className="min-w-0 space-y-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">Invalid model year</h2>
                <p className="text-sm text-gray-300 leading-relaxed">{invalidVehicle.message}</p>

                {invalidVehicle.correction && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {invalidVehicle.correction.submittedYear != null && (
                      <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Submitted year</p>
                        <p className="text-sm font-bold text-red-400 tabular-nums">{invalidVehicle.correction.submittedYear}</p>
                      </div>
                    )}
                    {invalidVehicle.correction.earliestValidYear != null && (
                      <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Earliest valid year</p>
                        <p className="text-sm font-bold text-green-400 tabular-nums">{invalidVehicle.correction.earliestValidYear}</p>
                      </div>
                    )}
                    {invalidVehicle.correction.suggestedModelsForYear &&
                      invalidVehicle.correction.suggestedModelsForYear.length > 0 && (
                        <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                            Valid {invalidVehicle.correction.submittedYear ?? ""} models
                          </p>
                          <p className="text-sm font-bold text-gray-200">
                            {invalidVehicle.correction.suggestedModelsForYear.join(", ")}
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {markdown && <ValuationReport markdown={markdown} title={copy.reportTitle} />}
      </div>
    </div>
  );
}
