"use client";

import { useState } from "react";
import { Car, DollarSign, Loader2 } from "lucide-react";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";
import { MarketRegionSelect } from "@/components/FormElements/MarketRegionSelect";
import { MileageFields } from "@/components/dealer/MileageFields";
import { ValuationReport } from "@/components/dealer/ValuationReport";
import { buildStoredRegion, type Market } from "@/lib/regions";

export type ValuationVariant = "dealer" | "partner";

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

export function CarValuationForm({ variant }: { variant: ValuationVariant }) {
  const copy = COPY[variant];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markdown, setMarkdown] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    variant: "",
    year: "",
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

    try {
      const regionValue = buildStoredRegion(formData.region, formData.country);

      const res = await fetch("/api/dealer/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: copy.evaluateMode,
          region: regionValue,
          make: formData.make,
          model: formData.model,
          variant: formData.variant || undefined,
          year: parseInt(formData.year, 10),
          mileageMin: parseInt(formData.mileageMinKm, 10),
          mileageMax: parseInt(formData.mileageMaxKm, 10),
          specs: formData.specs,
          notes: formData.notes || undefined,
          images: [],
        }),
      });

      const data = await res.json();
      if (res.ok && data.markdown) {
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
                  Specs / Source
                </label>
                <select
                  name="specs"
                  value={formData.specs}
                  onChange={handleInputChange}
                  className="carq-select"
                >
                  <option value="Company / Official dealer source">Company / Official dealer source</option>
                  <option value="TGF Lebanon">TGF Lebanon</option>
                  <option value="GCC">GCC source</option>
                  <option value="European / Germany source">European / Germany source</option>
                  <option value="U.S. source - clean title">U.S. source — clean title</option>
                  <option value="U.S. source - accident/salvage">U.S. source — accident/salvage</option>
                  <option value="Canada source">Canada source</option>
                  <option value="China source">China source</option>
                  <option value="Import">Generic import</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

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

        {markdown && <ValuationReport markdown={markdown} title={copy.reportTitle} />}
      </div>
    </div>
  );
}
