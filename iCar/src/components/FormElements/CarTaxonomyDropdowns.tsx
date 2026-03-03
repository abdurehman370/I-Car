"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";

interface TaxonomyItem {
    id: number;
    name: string;
}

interface Props {
    selectedMake: string;
    selectedModel: string;
    selectedVariant: string;
    onChange: (field: string, value: string) => void;
    error?: string;
}

export function CarTaxonomyDropdowns({
    selectedMake,
    selectedModel,
    selectedVariant,
    onChange,
    error,
}: Props) {
    const [makes, setMakes] = useState<TaxonomyItem[]>([]);
    const [models, setModels] = useState<TaxonomyItem[]>([]);
    const [variants, setVariants] = useState<TaxonomyItem[]>([]);

    const [loadingMakes, setLoadingMakes] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingVariants, setLoadingVariants] = useState(false);

    // Fetch Makes on mount
    useEffect(() => {
        async function fetchMakes() {
            setLoadingMakes(true);
            try {
                const res = await fetch("/api/taxonomy/makes");
                if (res.ok) {
                    const data = await res.json();
                    setMakes(data);
                }
            } catch (err) {
                console.error("Failed to fetch makes:", err);
            } finally {
                setLoadingMakes(false);
            }
        }
        fetchMakes();
    }, []);

    // Fetch Models when selectedMake changes
    useEffect(() => {
        if (!selectedMake) {
            setModels([]);
            return;
        }

        const makeObj = makes.find(m => m.name === selectedMake);
        if (!makeObj) return;

        async function fetchModels() {
            setLoadingModels(true);
            try {
                const res = await fetch(`/api/taxonomy/models/${makeObj?.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setModels(data);
                }
            } catch (err) {
                console.error("Failed to fetch models:", err);
            } finally {
                setLoadingModels(false);
            }
        }
        fetchModels();
    }, [selectedMake, makes]);

    // Fetch Variants when selectedModel changes
    useEffect(() => {
        if (!selectedModel) {
            setVariants([]);
            return;
        }

        const modelObj = models.find(m => m.name === selectedModel);
        if (!modelObj) return;

        async function fetchVariants() {
            setLoadingVariants(true);
            try {
                const res = await fetch(`/api/taxonomy/variants/${modelObj?.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setVariants(data);
                }
            } catch (err) {
                console.error("Failed to fetch variants:", err);
            } finally {
                setLoadingVariants(false);
            }
        }
        fetchVariants();
    }, [selectedModel, models]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Make */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Make *
                </label>
                <div className="relative">
                    <select
                        name="make"
                        value={selectedMake}
                        onChange={(e) => {
                            onChange("make", e.target.value);
                            onChange("model", ""); // Reset model and variant
                            onChange("variant", "");
                        }}
                        required
                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">{loadingMakes ? "Loading..." : "Select Make"}</option>
                        {makes.map((make) => (
                            <option key={make.id} value={make.name}>
                                {make.name.charAt(0).toUpperCase() + make.name.slice(1)}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            {/* Model */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Model *
                </label>
                <div className="relative">
                    <select
                        name="model"
                        value={selectedModel}
                        onChange={(e) => {
                            onChange("model", e.target.value);
                            onChange("variant", ""); // Reset variant
                        }}
                        required
                        disabled={!selectedMake || loadingModels}
                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    >
                        <option value="">
                            {!selectedMake ? "Select Make First" : loadingModels ? "Loading..." : "Select Model"}
                        </option>
                        {models.map((model) => (
                            <option key={model.id} value={model.name}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            {/* Variant */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Variant
                </label>
                <div className="relative">
                    <select
                        name="variant"
                        value={selectedVariant}
                        onChange={(e) => onChange("variant", e.target.value)}
                        disabled={!selectedModel || loadingVariants}
                        className="w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    >
                        <option value="">
                            {!selectedModel ? "Select Model First" : loadingVariants ? "Loading..." : "Select Variant (Optional)"}
                        </option>
                        {variants.map((variant) => (
                            <option key={variant.id} value={variant.name}>
                                {variant.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
