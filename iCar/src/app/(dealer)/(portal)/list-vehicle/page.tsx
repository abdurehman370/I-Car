"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, PlusCircle, Save, Send, Car, DollarSign, FileText, ChevronRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";
import { MarketRegionSelect } from "@/components/FormElements/MarketRegionSelect";
import { MileageFields } from "@/components/dealer/MileageFields";
import { ValuationReport } from "@/components/dealer/ValuationReport";
import { formatMileageDisplay } from "@/lib/mileage";
import {
    buildStoredRegion,
    getCitiesForMarket,
    defaultCityForMarket,
    type Market,
} from "@/lib/regions";

const COMMON_FEATURES = [
    "Air Conditioning", "Power Steering", "Power Windows", "ABS", "Airbags",
    "Alloy Wheels", "Bluetooth", "Cruise Control", "Leather Seats", "Sunroof",
    "Parking Sensors", "Rear Camera", "Navigation System", "Keyless Entry", "Push Start",
];

// --- Main Component ---
export default function ListVehicle() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Valuation State
    const [valuationImages, setValuationImages] = useState<File[]>([]);
    const [valuationPreviews, setValuationPreviews] = useState<string[]>([]);
    const [valuationMarkdown, setValuationMarkdown] = useState<string | null>(null);

    // Form Data (Shared across steps)
    const [formData, setFormData] = useState({
        make: "",
        model: "",
        year: "",
        mileage: "",
        variant: "",
        specs: "Unknown",
        notes: "",
        price: "",
        currency: "AED",
        description: "",
        condition: "USED",
        city: "Dubai",
        region: "UAE",
        country: "", // For Europe
    });

    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [customFeature, setCustomFeature] = useState("");
    const [listingImages, setListingImages] = useState<File[]>([]);
    const [listingPreviews, setListingPreviews] = useState<string[]>([]);

    // --- Handlers ---

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTaxonomyChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Step 1: Valuation Logic (1-5 images mandatory)
    const handleValuationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (valuationImages.length + files.length > 5) {
            setError("Maximum 5 images allowed");
            return;
        }
        setValuationImages(prev => [...prev, ...files]);
        // Also update listing images for later
        setListingImages(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setValuationPreviews(prev => [...prev, result]);
                setListingPreviews(prev => [...prev, result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeValuationImage = (index: number) => {
        setValuationImages(prev => prev.filter((_, i) => i !== index));
        setValuationPreviews(prev => prev.filter((_, i) => i !== index));
        // Sync removal
        setListingImages(prev => prev.filter((_, i) => i !== index));
        setListingPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleGetValuation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (valuationImages.length < 1 || valuationImages.length > 5) {
            setError("Please upload 1 to 5 vehicle photos (mandatory)");
            return;
        }
        setLoading(true);
        setError("");
        setValuationMarkdown(null);

        try {
            const imageBase64 = await Promise.all(
                valuationImages.map(file =>
                    new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    })
                )
            );

            const regionValue = buildStoredRegion(formData.region as Market, formData.country);

            const payload = {
                mode: "listing",
                region: regionValue,
                make: formData.make,
                model: formData.model,
                year: parseInt(formData.year),
                mileage: parseInt(formData.mileage, 10),
                variant: formData.variant || undefined,
                specs: formData.specs,
                notes: formData.notes || undefined,
                images: imageBase64,
            };

            const response = await fetch("/api/dealer/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.markdown) {
                setValuationMarkdown(data.markdown);
            } else {
                setError(data.message || "Failed to get valuation");
            }
        } catch (err) {
            setError("Failed to connect to valuation service. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const proceedToStep2 = () => {
        setStep(2);
        setError("");
        window.scrollTo(0, 0);
    };

    // Step 2: Listing Logic
    const toggleFeature = (feature: string) => {
        setSelectedFeatures(prev =>
            prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
        );
    };

    const addCustomFeature = () => {
        if (customFeature.trim() && !selectedFeatures.includes(customFeature.trim())) {
            setSelectedFeatures(prev => [...prev, customFeature.trim()]);
            setCustomFeature("");
        }
    };

    const removeFeature = (feature: string) => {
        setSelectedFeatures(prev => prev.filter(f => f !== feature));
    };

    const handleListingImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (listingImages.length + files.length > 5) {
            setError("Maximum 5 images allowed");
            return;
        }
        setListingImages(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setListingPreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeListingImage = (index: number) => {
        setListingImages(prev => prev.filter((_, i) => i !== index));
        setListingPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const convertImagesToBase64 = async (): Promise<string[]> => {
        const promises = listingImages.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });
        return Promise.all(promises);
    };

    const handleSubmitListing = async (status: "DRAFT" | "ACTIVE") => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const needsCity = formData.region !== "Europe";
            if (!formData.make || !formData.model || !formData.year || !formData.mileage ||
                !formData.price || !formData.description || (needsCity && !formData.city) ||
                (formData.region === "Europe" && !formData.country)) {
                setError("Please fill in all required fields in Step 2");
                setLoading(false);
                return;
            }

            const imageData = await convertImagesToBase64();

            const payload = {
                ...formData,
                region: buildStoredRegion(formData.region as Market, formData.country),
                city: formData.region === "Europe" && !formData.city
                    ? formData.country
                    : formData.city,
                year: parseInt(formData.year),
                mileage: parseInt(formData.mileage),
                price: parseFloat(formData.price),
                features: selectedFeatures,
                images: imageData,
                status,
            };

            const response = await fetch("/api/dealer/listings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(data.message);
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } else {
                setError(data.message || "Failed to create listing");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const canGetValuation = valuationImages.length >= 1 && valuationImages.length <= 5;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header with Cyber Stepper */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-300 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                            </span>
                            CATALOG INGESTION · STAGE {step} OF 2
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                            List New <span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">Vehicle</span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Deploy verified inventory with precision AI appraisal and multi-market listing distribution.
                        </p>
                    </div>

                    {/* Progress Indicator HUD */}
                    <div className="flex items-center gap-4 bg-[#061426]/70 border border-cyan-500/20 p-3 rounded-2xl backdrop-blur-xl">
                        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                            step === 1 ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300" : "text-slate-400"
                        }`}>
                            <span className="font-mono text-xs font-bold">01</span>
                            <span className="text-xs font-semibold">AI Valuation</span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                            step === 2 ? "bg-cyan-500/20 border border-cyan-400/40 text-cyan-300" : "text-slate-400"
                        }`}>
                            <span className="font-mono text-xs font-bold">02</span>
                            <span className="text-xs font-semibold">Listing Details</span>
                        </div>
                    </div>
                </div>

                {/* Shared Error/Success Alerts */}
                {error && (
                    <div className="bg-[#220c14]/95 border border-rose-500/30 text-rose-300 rounded-2xl p-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(244,63,94,0.15)] animate-in fade-in">
                        <X className="h-5 w-5 text-rose-400 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-[#061f1b]/95 border border-teal-500/30 text-teal-300 rounded-2xl p-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(20,184,166,0.15)] animate-in fade-in">
                        <Car className="h-5 w-5 text-teal-400 shrink-0" />
                        <p className="text-sm font-medium">{success}</p>
                    </div>
                )}

                {/* --- Step 1: Valuation --- */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-b from-[#071a30]/80 via-[#051324]/90 to-[#020914] p-6 md:p-8 backdrop-blur-xl shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                                    <Car className="size-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Vehicle Identity & Physical Assets</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Submit baseline specs and 1–5 inspection photographs</p>
                                </div>
                            </div>

                            <form onSubmit={handleGetValuation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <MarketRegionSelect
                                    market={formData.region as Market}
                                    country={formData.country}
                                    onMarketChange={(market) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            region: market,
                                            country: "",
                                            city: defaultCityForMarket(market),
                                        }))
                                    }
                                    onCountryChange={(country) =>
                                        setFormData((prev) => ({ ...prev, country, city: country }))
                                    }
                                    labelClassName="text-xs font-mono uppercase tracking-[0.1em] text-slate-400 ml-1 font-semibold"
                                />
                                <div className="col-span-1 md:col-span-2">
                                    <CarTaxonomyDropdowns
                                        selectedMake={formData.make}
                                        selectedModel={formData.model}
                                        selectedVariant={formData.variant}
                                        onChange={handleTaxonomyChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">Model Year *</label>
                                    <input type="number" name="year" value={formData.year} onChange={handleInputChange} required className="carq-input" placeholder="e.g. 2023" />
                                </div>
                                <MileageFields
                                    mode="single"
                                    label="Current Odometer (KM) *"
                                    mileageKm={formData.mileage}
                                    onMileageKmChange={(v) => setFormData(prev => ({ ...prev, mileage: v }))}
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">Regional Specs *</label>
                                    <select name="specs" value={formData.specs} onChange={handleInputChange} className="carq-select">
                                        <option value="GCC">GCC Specification</option>
                                        <option value="European / Germany source">European Specification</option>
                                        <option value="U.S. source - clean title">North American (Clean Title)</option>
                                        <option value="U.S. source - accident/salvage">North American (Rebuilt/Salvage)</option>
                                        <option value="Import">Other Regional Import</option>
                                        <option value="Unknown">Unknown Specification</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">Technical Notes (optional)</label>
                                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className="carq-textarea" placeholder="Service history, agency warranty expiry, repaint panels, custom trim packages..." />
                                </div>

                                {/* Cyber Media Upload Zone */}
                                <div className="col-span-1 md:col-span-2 space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                                            Vehicle Photographs * (1 to 5 images required)
                                        </label>
                                        <span className="text-[10px] font-mono text-cyan-400">
                                            {valuationPreviews.length} / 5 PHOTOS ATTACHED
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {valuationPreviews.map((p, i) => (
                                            <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-cyan-400/30 group bg-[#030914] shadow-md">
                                                <img src={p} alt="Inspection" className="w-full h-full object-cover" />
                                                {i === 0 && (
                                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-cyan-500/80 text-[8px] font-mono font-bold text-black uppercase tracking-wider">
                                                        PRIMARY
                                                    </span>
                                                )}
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeValuationImage(i)} 
                                                    className="absolute top-1 right-1 h-6 w-6 bg-rose-500/90 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove Image"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {valuationPreviews.length < 5 && (
                                            <label className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-cyan-500/25 hover:border-cyan-400/60 rounded-xl cursor-pointer bg-white/[0.02] hover:bg-cyan-500/[0.04] transition-all group">
                                                <Upload className="size-5 text-cyan-400/60 group-hover:text-cyan-400 group-hover:scale-110 transition-all mb-1" />
                                                <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200">Upload Photo</span>
                                                <input type="file" onChange={handleValuationImageUpload} className="hidden" multiple accept="image/*" />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading || !canGetValuation}
                                        className="w-full h-14 cyber-btn-primary rounded-xl font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2.5 text-sm"
                                    >
                                        {loading ? <Loader2 className="animate-spin size-5" /> : <Sparkles className="size-5" />}
                                        {loading ? "Generating Real-Time AI Appraisal..." : "Run AI Valuation Engine"}
                                    </button>
                                    {valuationImages.length === 0 && (
                                        <p className="text-[10px] font-mono text-amber-400/80 mt-2.5 text-center tracking-wider uppercase">
                                            Attach at least 1 photo to unlock automatic AI valuation
                                        </p>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Valuation Results */}
                        {valuationMarkdown && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <ValuationReport markdown={valuationMarkdown} />
                                <button
                                    onClick={proceedToStep2}
                                    className="w-full py-4 cyber-btn-primary rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    Confirm Appraisal & Proceed to Listing <ChevronRight className="size-5" />
                                </button>
                            </div>
                        )}

                        {/* Direct Listing Bypass */}
                        <div className="text-center pt-2">
                            <button onClick={proceedToStep2} className="text-xs font-mono tracking-wider text-slate-400 hover:text-cyan-300 transition-colors uppercase">
                                Skip AI appraisal and configure listing directly →
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Step 2: Listing Configuration --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-slate-400 hover:text-cyan-300 transition-colors uppercase">
                            <ArrowLeft className="size-3.5" /> Return to Step 1: Specs & Appraisal
                        </button>

                        <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-b from-[#071a30]/80 via-[#051324]/90 to-[#020914] p-6 md:p-8 backdrop-blur-xl shadow-xl relative overflow-hidden space-y-6">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                                    <FileText className="size-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Commercial & Public Listing Setup</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Define asking price, condition classification, and vehicle amenities</p>
                                </div>
                            </div>

                            {/* Read-only Spec Recap HUD */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#030914]/80 border border-cyan-500/20 rounded-2xl">
                                <div>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Make</span>
                                    <p className="font-bold text-white text-sm mt-0.5">{formData.make || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Model</span>
                                    <p className="font-bold text-white text-sm mt-0.5">{formData.model || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Variant</span>
                                    <p className="font-bold text-white text-sm mt-0.5">{formData.variant || "Standard"}</p>
                                </div>
                                <div>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Year</span>
                                    <p className="font-bold text-cyan-400 text-sm mt-0.5">{formData.year || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Odometer</span>
                                    <p className="font-bold text-cyan-400 text-sm mt-0.5">{formData.mileage ? `${parseInt(formData.mileage, 10).toLocaleString()} km` : "—"}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Price, Condition, City Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                                            Asking Price ({formData.currency}) *
                                        </label>
                                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="carq-input" placeholder="e.g. 185000" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                                            Vehicle Condition *
                                        </label>
                                        <select name="condition" value={formData.condition} onChange={handleInputChange} className="carq-select">
                                            <option value="USED">Pre-Owned / Used</option>
                                            <option value="NEW">Brand New</option>
                                            <option value="CERTIFIED">Agency Certified Pre-Owned</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                                            {formData.region === "Europe" ? "City Location" : "Market City *"}
                                        </label>
                                        {formData.region === "Europe" ? (
                                            <input
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                className="carq-input"
                                                placeholder={`e.g. Munich (${formData.country || "Europe"})`}
                                            />
                                        ) : (
                                            <select name="city" value={formData.city} onChange={handleInputChange} required className="carq-select">
                                                <option value="">Select City</option>
                                                {getCitiesForMarket(formData.region as Market).map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
                                        Vehicle Description & Selling Points *
                                    </label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="carq-textarea" placeholder="Present high-value features, maintenance history, condition details..." />
                                </div>

                                {/* Features & Amenities */}
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-3">
                                        Key Equipment & Factory Options
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {COMMON_FEATURES.map(f => {
                                            const active = selectedFeatures.includes(f);
                                            return (
                                                <button
                                                    key={f}
                                                    type="button"
                                                    onClick={() => toggleFeature(f)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                                        active
                                                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                                                            : "bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10"
                                                    }`}
                                                >
                                                    {active ? "✓ " : "+ "}{f}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2 max-w-md">
                                        <input 
                                            type="text" 
                                            value={customFeature} 
                                            onChange={(e) => setCustomFeature(e.target.value)} 
                                            onKeyPress={(e) => e.key === "Enter" && addCustomFeature()} 
                                            className="carq-input !h-10 text-xs" 
                                            placeholder="Add custom option (e.g. Carbon Package)..." 
                                        />
                                        <button type="button" onClick={addCustomFeature} className="px-4 h-10 cyber-btn-primary rounded-xl text-xs font-bold shrink-0">
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Gallery images */}
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-3">
                                        Listing Photos
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {listingPreviews.map((p, i) => (
                                            <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-cyan-400/30 group bg-[#030914] shadow-md">
                                                <img src={p} alt="Listing photo" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeListingImage(i)} 
                                                    className="absolute top-1 right-1 h-6 w-6 bg-rose-500/90 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Remove Image"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {listingPreviews.length < 5 && (
                                            <label className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-cyan-500/25 hover:border-cyan-400/60 rounded-xl cursor-pointer bg-white/[0.02] hover:bg-cyan-500/[0.04] transition-all group">
                                                <Upload className="size-5 text-cyan-400/60 group-hover:text-cyan-400 mb-1" />
                                                <span className="text-[10px] font-mono text-slate-400">Add Photo</span>
                                                <input type="file" onChange={handleListingImageUpload} className="hidden" multiple accept="image/*" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Publication Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button 
                                type="button" 
                                onClick={() => handleSubmitListing("DRAFT")} 
                                disabled={loading} 
                                className="flex-1 h-14 cyber-btn-secondary rounded-xl font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                <Save className="size-4" /> {loading ? "Saving Draft..." : "Save Offline Draft"}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleSubmitListing("ACTIVE")} 
                                disabled={loading} 
                                className="flex-1 h-14 cyber-btn-primary rounded-xl font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                            >
                                <Send className="size-4" /> {loading ? "Publishing to Matrix..." : "Publish Live to Matrix"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
