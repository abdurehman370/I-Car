"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, PlusCircle, Save, Send, Car, DollarSign, FileText, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";
import { MileageFields } from "@/components/dealer/MileageFields";
import { ValuationReport } from "@/components/dealer/ValuationReport";
import { formatMileageDisplay } from "@/lib/mileage";
// --- Types & Constants ---
const COMMON_FEATURES = [
    "Air Conditioning", "Power Steering", "Power Windows", "ABS", "Airbags",
    "Alloy Wheels", "Bluetooth", "Cruise Control", "Leather Seats", "Sunroof",
    "Parking Sensors", "Rear Camera", "Navigation System", "Keyless Entry", "Push Start",
];
const REGION_CITIES: Record<string, string[]> = {
    UAE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
    Lebanon: ["Beirut", "Tripoli", "Sidon", "Tyre", "Jounieh", "Byblos", "Zahle"],
    Europe: [
        "Berlin", "Munich", "Hamburg"
    ]
};

const EUROPE_COUNTRIES = [
    "Germany"
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
        city: "",
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

            const regionValue = formData.region === "Europe" && formData.country
                ? `${formData.country}`
                : formData.region;

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
            if (!formData.make || !formData.model || !formData.year || !formData.mileage ||
                !formData.price || !formData.description || !formData.city) {
                setError("Please fill in all required fields in Step 2");
                setLoading(false);
                return;
            }

            const imageData = await convertImagesToBase64();

            const payload = {
                ...formData,
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
                {/* Header with Progress */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
                            NEW ASSET · VALUATION
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            List Your <span className="text-gradient">Vehicle</span>
                        </h1>
                    </div>
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Progress</span>
                            <div className="flex gap-1.5">
                                <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-white/5'}`} />
                                <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-white/5'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shared Error/Success */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <p className="text-green-600 dark:text-green-400">{success}</p>
                    </div>
                )}

                {/* --- Step 1: Valuation --- */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">
                        <div className="panel p-8 border-white/5">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-10 w-10 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                                    <Car className="size-5 text-cyan-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Vehicle Details</h2>
                            </div>

                            <form onSubmit={handleGetValuation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono uppercase tracking-[0.1em] text-gray-400 ml-1">Region *</label>
                                    <select name="region" value={formData.region} onChange={handleInputChange} required className="icar-select">
                                        <option value="UAE">UAE</option>
                                        <option value="Lebanon">Lebanon</option>
                                        <option value="Europe">Europe</option>
                                    </select>
                                </div>
                                {formData.region === "Europe" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country *</label>
                                        <select name="country" value={formData.country} onChange={handleInputChange} required className="icar-select">
                                            <option value="">Select Country</option>
                                            {EUROPE_COUNTRIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="col-span-1 md:col-span-2">
                                    <CarTaxonomyDropdowns
                                        selectedMake={formData.make}
                                        selectedModel={formData.model}
                                        selectedVariant={formData.variant}
                                        onChange={handleTaxonomyChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year *</label>
                                    <input type="number" name="year" value={formData.year} onChange={handleInputChange} required className="icar-input" placeholder="e.g. 2022" />
                                </div>
                                <MileageFields
                                    mode="single"
                                    label="Mileage *"
                                    mileageKm={formData.mileage}
                                    onMileageKmChange={(v) => setFormData(prev => ({ ...prev, mileage: v }))}
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Specs</label>
                                    <select name="specs" value={formData.specs} onChange={handleInputChange} className="icar-select">
                                        <option value="GCC">GCC</option>
                                        <option value="Import">Import</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
                                    <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className="icar-textarea" placeholder="Service history, warranty, accidents, repaint, owners, etc." />
                                </div>

                                {/* Image Upload Step 1 (Mandatory 1-5) */}
                                <div className="col-span-1 md:col-span-2 space-y-2 mt-4">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Photos * (1-5 required)</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {valuationPreviews.map((p, i) => (
                                            <div key={i} className="relative group">
                                                <img src={p} alt="Preview" className="w-full h-20 object-cover rounded-lg" />
                                                <button type="button" onClick={() => removeValuationImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="size-3" /></button>
                                            </div>
                                        ))}
                                        {valuationPreviews.length < 5 && (
                                            <label className="w-full h-20 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-cyan-500">
                                                <PlusCircle className="size-6 text-gray-400" />
                                                <input type="file" onChange={handleValuationImageUpload} className="hidden" multiple accept="image/*" />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading || !canGetValuation}
                                        className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold transition-all hover:scale-[1.01] disabled:opacity-50 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : null}
                                        {loading ? "Analyzing with AI..." : "Get Valuation"}
                                    </button>
                                    {valuationImages.length === 0 && (
                                        <p className="text-[10px] font-mono text-amber-400/70 mt-3 text-center tracking-widest uppercase">Upload 1–5 photos to enable valuation</p>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Valuation Results (AI Markdown Report) */}
                        {valuationMarkdown && (
                            <div className="space-y-4">
                                <ValuationReport markdown={valuationMarkdown} />
                                <button
                                    onClick={proceedToStep2}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                                >
                                    Proceed to List Vehicle <ChevronRight className="size-5" />
                                </button>
                            </div>
                        )}
                        {/* Skip Valuation Link */}
                        <div className="text-center">
                            <button onClick={proceedToStep2} className="text-sm text-gray-500 hover:text-cyan-400 underline">
                                Skip valuation and list directly
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Step 2: Listing --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                        <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                            <ArrowLeft className="size-4" /> Back to Valuation
                        </button>

                        <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="size-5 text-cyan-500" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Listing Details</h2>
                            </div>

                            {/* Read-only recap of Step 1 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div><span className="text-xs text-gray-500">Make</span><p className="font-semibold dark:text-white">{formData.make}</p></div>
                                <div><span className="text-xs text-gray-500">Model</span><p className="font-semibold dark:text-white">{formData.model}</p></div>
                                <div><span className="text-xs text-gray-500">Variant</span><p className="font-semibold dark:text-white">{formData.variant || "—"}</p></div>
                                <div><span className="text-xs text-gray-500">Year</span><p className="font-semibold dark:text-white">{formData.year}</p></div>
                                <div><span className="text-xs text-gray-500">Mileage</span><p className="font-semibold dark:text-white">{formData.mileage ? formatMileageDisplay(parseInt(formData.mileage, 10)) : "—"}</p></div>
                            </div>

                            <div className="space-y-4">
                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price *</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="icar-input" placeholder="e.g. 65000" />
                                </div>
                                {/* Condition */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition *</label>
                                    <select name="condition" value={formData.condition} onChange={handleInputChange} className="icar-select">
                                        <option value="NEW">New</option>
                                        <option value="USED">Used</option>
                                        <option value="CERTIFIED">Certified Pre-Owned</option>
                                    </select>
                                </div>
                                {/* City */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                                    <select name="city" value={formData.city} onChange={handleInputChange} className="icar-select">
                                        <option value="">Select City</option>
                                        {(REGION_CITIES[formData.region] || []).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={6} className="icar-textarea" placeholder="Describe your vehicle..." />
                                </div>
                                {/* Features */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                        {COMMON_FEATURES.map(f => (
                                            <label key={f} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={selectedFeatures.includes(f)} onChange={() => toggleFeature(f)} className="w-4 h-4 text-cyan-500 rounded" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{f}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={customFeature} onChange={(e) => setCustomFeature(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addCustomFeature()} className="icar-input flex-1 !h-11" placeholder="Add custom feature..." />
                                        <button type="button" onClick={addCustomFeature} className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-xl"><PlusCircle className="size-5" /></button>
                                    </div>
                                </div>
                                {/* Images */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {listingPreviews.map((p, i) => (
                                            <div key={i} className="relative group">
                                                <img src={p} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                                                <button type="button" onClick={() => removeListingImage(i)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="size-4" /></button>
                                            </div>
                                        ))}
                                        {listingPreviews.length < 5 && (
                                            <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer hover:border-cyan-500">
                                                <Upload className="size-8 text-gray-400 mb-2" />
                                                <span className="text-xs text-gray-500">Upload Images</span>
                                                <input type="file" onChange={handleListingImageUpload} className="hidden" multiple accept="image/*" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button type="button" onClick={() => handleSubmitListing("DRAFT")} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50">
                                <Save className="size-5" /> {loading ? "Saving..." : "Save Draft"}
                            </button>
                            <button type="button" onClick={() => handleSubmitListing("ACTIVE")} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold hover:from-indigo-700 transition-colors disabled:opacity-50">
                                <Send className="size-5" /> {loading ? "Publishing..." : "Publish Listing"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
