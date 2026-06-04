"use client";

import { useState } from "react";
import { Car, DollarSign, Loader2 } from "lucide-react";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";
import { MileageFields } from "@/components/dealer/MileageFields";
import { ValuationReport } from "@/components/dealer/ValuationReport";

const EUROPE_COUNTRIES = ["Germany"];

export default function VehicleValuationPage() {
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
    region: "UAE",
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
      const regionValue =
        formData.region === "Europe" && formData.country
          ? formData.country
          : formData.region;

      const res = await fetch("/api/dealer/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
            TOOLS · QUICK VALUATION
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Vehicle <span className="text-gradient">Valuation</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Check market pricing for any vehicle without listing it or uploading photos.
            Enter details and a mileage range to get dealer-focused price bands.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="panel p-8 border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
              <Car className="size-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Vehicle details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-[0.1em] text-gray-400 ml-1">
                  Region *
                </label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  required
                  className="icar-select"
                >
                  <option value="UAE">UAE</option>
                  <option value="Lebanon">Lebanon</option>
                  <option value="Europe">Europe</option>
                </select>
              </div>
              {formData.region === "Europe" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="icar-select"
                  >
                    <option value="">Select Country</option>
                    {EUROPE_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  className="icar-input"
                  placeholder="e.g. 2022"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Specs
                </label>
                <select
                  name="specs"
                  value={formData.specs}
                  onChange={handleInputChange}
                  className="icar-select"
                >
                  <option value="GCC">GCC</option>
                  <option value="Import">Import</option>
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
                className="icar-textarea"
                placeholder="Trim details, accident history, service records, expected condition..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.make || !formData.model || !formData.year}
              className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold transition-all hover:scale-[1.01] disabled:opacity-50 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin size-5" /> : <DollarSign className="size-5" />}
              {loading ? "Analyzing market data..." : "Get Valuation"}
            </button>
          </form>
        </div>

        {markdown && <ValuationReport markdown={markdown} title="Valuation result" />}
      </div>
    </div>
  );
}
