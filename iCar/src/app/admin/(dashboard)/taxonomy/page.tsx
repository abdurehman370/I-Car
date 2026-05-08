"use client";

import { useEffect, useState } from "react";
import {
    Car, Plus, Trash2, Loader2, ChevronRight,
    Layers, Package, Type
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import toast from "react-hot-toast";

interface TaxonomyItem {
    id: number;
    name: string;
}

export default function AdminTaxonomyPage() {
    const [makes, setMakes] = useState<TaxonomyItem[]>([]);
    const [models, setModels] = useState<TaxonomyItem[]>([]);
    const [variants, setVariants] = useState<TaxonomyItem[]>([]);

    const [selectedMake, setSelectedMake] = useState<TaxonomyItem | null>(null);
    const [selectedModel, setSelectedModel] = useState<TaxonomyItem | null>(null);

    const [loading, setLoading] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingVariants, setLoadingVariants] = useState(false);

    const [newMake, setNewMake] = useState("");
    const [newModel, setNewModel] = useState("");
    const [newVariant, setNewVariant] = useState("");

    const [submitting, setSubmitting] = useState(false);

    // Fetch Makes
    const fetchMakes = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/taxonomy/makes");
            if (res.ok) setMakes(await res.json());
        } catch (err) {
            toast.error("Failed to fetch makes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMakes();
    }, []);

    // Fetch Models
    useEffect(() => {
        if (!selectedMake) {
            setModels([]);
            setSelectedModel(null);
            return;
        }

        const fetchModels = async () => {
            setLoadingModels(true);
            try {
                const res = await fetch(`/api/taxonomy/models/${selectedMake.id}`);
                if (res.ok) setModels(await res.json());
            } catch (err) {
                toast.error("Failed to fetch models");
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, [selectedMake]);

    // Fetch Variants
    useEffect(() => {
        if (!selectedModel) {
            setVariants([]);
            return;
        }

        const fetchVariants = async () => {
            setLoadingVariants(true);
            try {
                const res = await fetch(`/api/taxonomy/variants/${selectedModel.id}`);
                if (res.ok) setVariants(await res.json());
            } catch (err) {
                toast.error("Failed to fetch variants");
            } finally {
                setLoadingVariants(false);
            }
        };
        fetchVariants();
    }, [selectedModel]);

    // CRUD Handlers
    const handleAddMake = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMake.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/taxonomy/makes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newMake }),
            });
            if (res.ok) {
                toast.success("Make added");
                setNewMake("");
                fetchMakes();
            }
        } catch (err) {
            toast.error("Error adding make");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModel.trim() || !selectedMake) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/taxonomy/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newModel, makeId: selectedMake.id }),
            });
            if (res.ok) {
                toast.success("Model added");
                setNewModel("");
                const data = await res.json();
                setModels(prev => [...prev, data.model].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (err) {
            toast.error("Error adding model");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVariant.trim() || !selectedModel) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/taxonomy/variants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newVariant, modelId: selectedModel.id }),
            });
            if (res.ok) {
                toast.success("Variant added");
                setNewVariant("");
                const data = await res.json();
                setVariants(prev => [...prev, data.variant].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (err) {
            toast.error("Error adding variant");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (type: 'make' | 'model' | 'variant', id: number) => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        try {
            const res = await fetch(`/api/admin/taxonomy/${type}s`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
                if (type === 'make') {
                    setMakes(prev => prev.filter(m => m.id !== id));
                    if (selectedMake?.id === id) setSelectedMake(null);
                } else if (type === 'model') {
                    setModels(prev => prev.filter(m => m.id !== id));
                    if (selectedModel?.id === id) setSelectedModel(null);
                } else {
                    setVariants(prev => prev.filter(v => v.id !== id));
                }
            }
        } catch (err) {
            toast.error(`Failed to delete ${type}`);
        }
    };

    return (
        <>
            <Breadcrumb pageName="Car Taxonomy Management" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Makes Column */}
                <div className="flex flex-col panel border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2 tracking-tight">
                            <Package className="size-5 text-cyan-400" />
                            Makes
                        </h3>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{makes.length} items</span>
                    </div>

                    <div className="p-4 border-b border-white/5">
                        <form onSubmit={handleAddMake} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Make..."
                                value={newMake}
                                onChange={(e) => setNewMake(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 outline-none"
                            />
                            <button disabled={submitting} className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-lg hover:scale-105 transition-all">
                                <Plus className="size-5" />
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
                        ) : (
                            makes.map((make) => (
                                <button
                                    key={make.id}
                                    onClick={() => setSelectedMake(make)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedMake?.id === make.id
                                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                            : "hover:bg-white/5 text-gray-400 border border-transparent"
                                        }`}
                                >
                                    <span className="font-medium text-sm capitalize">{make.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Trash2
                                            onClick={(e) => { e.stopPropagation(); handleDelete('make', make.id); }}
                                            className="size-4 text-gray-400 hover:text-red-500 transition-colors"
                                        />
                                        <ChevronRight className={`size-4 ${selectedMake?.id === make.id ? "opacity-100" : "opacity-0"}`} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Models Column */}
                <div className="flex flex-col panel border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2 tracking-tight">
                            <Layers className="size-5 text-cyan-400" />
                            Models {selectedMake && <span className="text-gray-500 font-normal">for {selectedMake.name}</span>}
                        </h3>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{models.length} items</span>
                    </div>

                    <div className="p-4 border-b border-white/5">
                        <form onSubmit={handleAddModel} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Model..."
                                disabled={!selectedMake}
                                value={newModel}
                                onChange={(e) => setNewModel(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 outline-none disabled:opacity-30"
                            />
                            <button disabled={submitting || !selectedMake} className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-lg hover:scale-105 transition-all disabled:opacity-30">
                                <Plus className="size-5" />
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
                        {!selectedMake ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Package className="size-10 mb-2 opacity-20" />
                                <p className="text-sm">Select a make first</p>
                            </div>
                        ) : loadingModels ? (
                            <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
                        ) : (
                            models.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedModel(model)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedModel?.id === model.id
                                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                            : "hover:bg-white/5 text-gray-400 border border-transparent"
                                        }`}
                                >
                                    <span className="font-medium text-sm">{model.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Trash2
                                            onClick={(e) => { e.stopPropagation(); handleDelete('model', model.id); }}
                                            className="size-4 text-gray-400 hover:text-red-500 transition-colors"
                                        />
                                        <ChevronRight className={`size-4 ${selectedModel?.id === model.id ? "opacity-100" : "opacity-0"}`} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Variants Column */}
                <div className="flex flex-col panel border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2 tracking-tight">
                            <Type className="size-5 text-cyan-400" />
                            Variants {selectedModel && <span className="text-gray-500 font-normal">for {selectedModel.name}</span>}
                        </h3>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{variants.length} items</span>
                    </div>

                    <div className="p-4 border-b border-white/5">
                        <form onSubmit={handleAddVariant} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Variant..."
                                disabled={!selectedModel}
                                value={newVariant}
                                onChange={(e) => setNewVariant(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 outline-none disabled:opacity-30"
                            />
                            <button disabled={submitting || !selectedModel} className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-lg hover:scale-105 transition-all disabled:opacity-30">
                                <Plus className="size-5" />
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
                        {!selectedModel ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Layers className="size-10 mb-2 opacity-20" />
                                <p className="text-sm">Select a model first</p>
                            </div>
                        ) : loadingVariants ? (
                            <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
                        ) : (
                            variants.map((variant) => (
                                <div
                                    key={variant.id}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-gray-400 transition-all border border-transparent"
                                >
                                    <span className="font-medium text-sm">{variant.name}</span>
                                    <Trash2
                                        onClick={() => handleDelete('variant', variant.id)}
                                        className="size-4 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
