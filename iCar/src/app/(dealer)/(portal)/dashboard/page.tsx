"use client";

import { useState } from "react";
import { Car, Upload, X, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

interface ValuationResult {
    status: string;
    region: string;
    currency: string;
    valuation?: {
        estimated_valuation: number;
        price_range: {
            min: number;
            max: number;
        };
        market_average: number;
        market_median: number;
        listings_count: number;
    } | null;
}

export default function DealerDashboard() {
    const [formData, setFormData] = useState({
        region: "UAE",
        country: "",
        make: "",
        model: "",
        year: "",
        mileage: "",
        variant: "",
    });

    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ValuationResult | null>(null);
    const [error, setError] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setImages((prev) => [...prev, ...files]);

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const payload: any = {
                region: formData.region,
                make: formData.make,
                model: formData.model,
                year: parseInt(formData.year),
                mileage: parseInt(formData.mileage),
            };

            if (formData.variant) payload.variant = formData.variant;
            if (formData.region === "Europe" && formData.country) {
                payload.country = formData.country;
            }

            const response = await fetch("http://localhost:8000/api/evaluate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.message || "Failed to get valuation");
            }
        } catch (err) {
            setError("Failed to connect to valuation service. Please ensure the Python API is running.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Car Valuation</h1>
                        <p className="text-gray-500 dark:text-gray-400">Get instant market valuations for your vehicles</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Valuation Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                <Car className="size-5 text-indigo-500" />
                                Vehicle Information
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Region & Country */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Region *</label>
                                        <select
                                            name="region"
                                            value={formData.region}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                        >
                                            <option value="UAE">UAE (Dubizzle)</option>
                                            <option value="Lebanon">Lebanon (OLX)</option>
                                            <option value="Europe">Europe (AutoScout24)</option>
                                        </select>
                                    </div>

                                    {formData.region === "Europe" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country *</label>
                                            <select
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                            >
                                                <option value="">Select Country</option>
                                                <option value="Germany">Germany</option>
                                                <option value="France">France</option>
                                                <option value="Italy">Italy</option>
                                                <option value="Spain">Spain</option>
                                                <option value="Netherlands">Netherlands</option>
                                                <option value="Belgium">Belgium</option>
                                                <option value="Austria">Austria</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Make & Model */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Make *</label>
                                        <input
                                            type="text"
                                            name="make"
                                            value={formData.make}
                                            onChange={handleInputChange}
                                            placeholder="e.g. BMW"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model *</label>
                                        <input
                                            type="text"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            placeholder="e.g. i8"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Year & Mileage */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year *</label>
                                        <input
                                            type="number"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleInputChange}
                                            placeholder="e.g. 2020"
                                            required
                                            min="1900"
                                            max={new Date().getFullYear() + 1}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mileage (KM) *</label>
                                        <input
                                            type="number"
                                            name="mileage"
                                            value={formData.mileage}
                                            onChange={handleInputChange}
                                            placeholder="e.g. 45000"
                                            required
                                            min="0"
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Variant */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Variant (Optional)</label>
                                    <input
                                        type="text"
                                        name="variant"
                                        value={formData.variant}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Roadster, SE, Sport"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Images (Optional)</label>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-xl border border-gray-200 dark:border-white/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {imagePreviews.length < 8 && (
                                            <label className="w-full h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                                                <Upload className="size-6 text-gray-400 mb-1" />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Upload</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 rounded-2xl text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Analyzing Market..." : "Get Valuation"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="space-y-6">
                        {result && result.valuation ? (
                            <>
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 shadow-xl">
                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign className="size-6 text-white" />
                                        <h3 className="text-lg font-semibold text-white">Estimated Value</h3>
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {formatCurrency(result.valuation.estimated_valuation, result.currency)}
                                    </div>
                                    <p className="text-indigo-100 text-sm">Based on {result.valuation.listings_count} listings</p>
                                </div>

                                <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="size-5 text-indigo-500" />
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Price Range</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Minimum</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(result.valuation.price_range.min, result.currency)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Maximum</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(result.valuation.price_range.max, result.currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 className="size-5 text-indigo-500" />
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Market Statistics</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Market Average</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(result.valuation.market_average, result.currency)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Market Median</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(result.valuation.market_median, result.currency)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Region</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{result.region}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm text-center">
                                <Car className="size-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Results Yet</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Fill in the vehicle details and click "Get Valuation" to see market analysis
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
