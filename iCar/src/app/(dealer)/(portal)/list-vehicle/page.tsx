"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, PlusCircle, Save, Send, Car, DollarSign, MapPin, FileText } from "lucide-react";

const COMMON_FEATURES = [
    "Air Conditioning",
    "Power Steering",
    "Power Windows",
    "ABS",
    "Airbags",
    "Alloy Wheels",
    "Bluetooth",
    "Cruise Control",
    "Leather Seats",
    "Sunroof",
    "Parking Sensors",
    "Rear Camera",
    "Navigation System",
    "Keyless Entry",
    "Push Start",
];

const UAE_CITIES = [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"
];

export default function ListVehicle() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        make: "",
        model: "",
        year: "",
        mileage: "",
        variant: "",
        price: "",
        currency: "AED",
        description: "",
        condition: "USED",
        city: "",
        region: "UAE",
    });

    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [customFeature, setCustomFeature] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleFeature = (feature: string) => {
        setSelectedFeatures(prev =>
            prev.includes(feature)
                ? prev.filter(f => f !== feature)
                : [...prev, feature]
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 8) {
            setError("Maximum 8 images allowed");
            return;
        }

        setImages(prev => [...prev, ...files]);

        // Create previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const convertImagesToBase64 = async (): Promise<string[]> => {
        const promises = images.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });
        return Promise.all(promises);
    };

    const handleSubmit = async (status: "DRAFT" | "ACTIVE") => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // Validation
            if (!formData.make || !formData.model || !formData.year || !formData.mileage ||
                !formData.price || !formData.description || !formData.city) {
                setError("Please fill in all required fields");
                setLoading(false);
                return;
            }

            // Convert images to base64
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
                headers: {
                    "Content-Type": "application/json",
                },
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">List Your Vehicle</h1>
                    <p className="text-gray-500 dark:text-gray-400">Create a listing to sell your car</p>
                </div>

                {/* Error/Success Messages */}
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

                {/* Form */}
                <div className="space-y-6">
                    {/* Vehicle Information */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Car className="size-5 text-indigo-500" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Vehicle Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Make *
                                </label>
                                <input
                                    type="text"
                                    name="make"
                                    value={formData.make}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., Toyota"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Model *
                                </label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., Camry"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Year *
                                </label>
                                <input
                                    type="number"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleInputChange}
                                    min="1990"
                                    max={new Date().getFullYear() + 1}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., 2021"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mileage (KM) *
                                </label>
                                <input
                                    type="number"
                                    name="mileage"
                                    value={formData.mileage}
                                    onChange={handleInputChange}
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., 45000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Variant
                                </label>
                                <input
                                    type="text"
                                    name="variant"
                                    value={formData.variant}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., SE, Sport"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Condition *
                                </label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="NEW">New</option>
                                    <option value="USED">Used</option>
                                    <option value="CERTIFIED">Certified Pre-Owned</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <DollarSign className="size-5 text-indigo-500" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pricing</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Price *
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., 65000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Currency
                                </label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="AED">AED</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <MapPin className="size-5 text-indigo-500" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    City *
                                </label>
                                <select
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select City</option>
                                    {UAE_CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Region
                                </label>
                                <input
                                    type="text"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., UAE"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <FileText className="size-5 text-indigo-500" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Description</h2>
                        </div>

                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Describe your vehicle in detail..."
                        />
                    </div>

                    {/* Features */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Features</h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            {COMMON_FEATURES.map(feature => (
                                <label
                                    key={feature}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFeatures.includes(feature)}
                                        onChange={() => toggleFeature(feature)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customFeature}
                                onChange={(e) => setCustomFeature(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && addCustomFeature()}
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#020d1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Add custom feature..."
                            />
                            <button
                                type="button"
                                onClick={addCustomFeature}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <PlusCircle className="size-5" />
                            </button>
                        </div>

                        {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).map(feature => (
                                    <span
                                        key={feature}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                                    >
                                        {feature}
                                        <button
                                            type="button"
                                            onClick={() => removeFeature(feature)}
                                            className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Images */}
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Vehicle Images</h2>

                        <div className="space-y-4">
                            <label className="block">
                                <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                                    <Upload className="size-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                                        Click to upload images
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                        Maximum 8 images (JPG, PNG)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>

                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-xl"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="size-4" />
                                            </button>
                                            {index === 0 && (
                                                <span className="absolute bottom-2 left-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={() => handleSubmit("DRAFT")}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="size-5" />
                            {loading ? "Saving..." : "Save as Draft"}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSubmit("ACTIVE")}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="size-5" />
                            {loading ? "Publishing..." : "Publish Listing"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
