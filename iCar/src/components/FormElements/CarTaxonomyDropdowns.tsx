"use client";

import { useEffect, useState } from "react";

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

const SELECT_CLASS = "icar-select";

const CHEVRON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
);

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

    useEffect(() => {
        if (!selectedMake) {
            setModels([]);
            return;
        }

        const makeObj = makes.find((m) => m.name === selectedMake);
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

    useEffect(() => {
        if (!selectedModel) {
            setVariants([]);
            return;
        }

        const modelObj = models.find((m) => m.name === selectedModel);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Make *
                </label>
                <div className="relative group">
                    <select
                        name="make"
                        value={selectedMake}
                        onChange={(e) => {
                            onChange("make", e.target.value);
                            onChange("model", "");
                            onChange("variant", "");
                        }}
                        required
                        className={SELECT_CLASS}
                    >
                        <option value="">{loadingMakes ? "Loading..." : "Select Make"}</option>
                        {makes.map((make) => (
                            <option key={make.id} value={make.name}>
                                {make.name.charAt(0).toUpperCase() + make.name.slice(1)}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                        {CHEVRON}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Model *
                </label>
                <div className="relative group">
                    <select
                        name="model"
                        value={selectedModel}
                        onChange={(e) => {
                            onChange("model", e.target.value);
                            onChange("variant", "");
                        }}
                        required
                        disabled={!selectedMake || loadingModels}
                        className={SELECT_CLASS}
                    >
                        <option value="">
                            {!selectedMake
                                ? "Select Make First"
                                : loadingModels
                                  ? "Loading..."
                                  : "Select Model"}
                        </option>
                        {models.map((model) => (
                            <option key={model.id} value={model.name}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                        {CHEVRON}
                    </div>
                </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-[0.15em] ml-1">
                    Variant
                </label>
                <div className="relative group">
                    <select
                        name="variant"
                        value={selectedVariant}
                        onChange={(e) => onChange("variant", e.target.value)}
                        disabled={!selectedModel || loadingVariants}
                        className={SELECT_CLASS}
                    >
                        <option value="">
                            {!selectedModel
                                ? "Select Model First"
                                : loadingVariants
                                  ? "Loading..."
                                  : "Select Variant (Optional)"}
                        </option>
                        {variants.map((variant) => (
                            <option key={variant.id} value={variant.name}>
                                {variant.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400 group-focus-within:text-cyan-400 transition-colors">
                        {CHEVRON}
                    </div>
                </div>
            </div>

            {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
        </div>
    );
}
