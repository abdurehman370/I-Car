"use client";

import { useState, useEffect } from "react";
import {
    Bell, Plus, Trash2, Calendar, Car, MapPin,
    AlertCircle, Loader2, X, Pencil, Search, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";

interface Alert {
    id: number;
    make: string;
    model: string;
    yearMin: number | null;
    yearMax: number | null;
    variant: string | null;
    region: string;
    frequency: string;
    enabled: boolean;
    lastRun: string | null;
    createdAt: string;
}

type FormData = {
    make: string;
    model: string;
    yearMin: string;
    yearMax: string;
    variant: string;
    region: string;
    frequency: string;
};

const BLANK_FORM: FormData = {
    make: "",
    model: "",
    yearMin: "",
    yearMax: "",
    variant: "",
    region: "UAE",
    frequency: "daily",
};

const REGIONS = ["UAE", "Lebanon", "Europe"];
const FREQUENCIES = [
    { value: "every5min", label: "Every 5 Min" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
];

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
    const [formData, setFormData] = useState<FormData>(BLANK_FORM);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await fetch("/api/dealer/alerts");
            const data = await res.json();
            if (res.ok) {
                setAlerts(data.data);
            } else {
                toast.error(data.message || "Failed to fetch alerts");
            }
        } catch {
            toast.error("An error occurred while fetching alerts");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingAlert(null);
        setFormData(BLANK_FORM);
        setShowModal(true);
    };

    const openEditModal = (alert: Alert) => {
        setEditingAlert(alert);
        setFormData({
            make: alert.make,
            model: alert.model,
            yearMin: alert.yearMin?.toString() ?? "",
            yearMax: alert.yearMax?.toString() ?? "",
            variant: alert.variant ?? "",
            region: alert.region,
            frequency: alert.frequency,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAlert(null);
        setFormData(BLANK_FORM);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEdit = !!editingAlert;
            const url = isEdit ? `/api/dealer/alerts/${editingAlert!.id}` : "/api/dealer/alerts";
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(isEdit ? "Alert updated successfully" : "Alert created successfully");
                if (isEdit) {
                    setAlerts((prev) => prev.map((a) => a.id === editingAlert!.id ? data.data : a));
                } else {
                    setAlerts((prev) => [data.data, ...prev]);
                }
                closeModal();
            } else {
                toast.error(data.message || (isEdit ? "Failed to update alert" : "Failed to create alert"));
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (alert: Alert) => {
        const newEnabled = !(alert.enabled ?? true);
        setTogglingId(alert.id);
        try {
            const res = await fetch(`/api/dealer/alerts/${alert.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: newEnabled }),
            });
            const data = await res.json();
            if (res.ok) {
                setAlerts((prev) => prev.map((a) => (a.id === alert.id ? data.data : a)));
                toast.success(newEnabled ? "Alert resumed" : "Alert paused");
            } else {
                toast.error(data.message || "Failed to update alert");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this alert?")) return;
        try {
            const res = await fetch(`/api/dealer/alerts/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Alert deleted");
                setAlerts((prev) => prev.filter((a) => a.id !== id));
            } else {
                toast.error("Failed to delete alert");
            }
        } catch {
            toast.error("An error occurred while deleting alert");
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
                            MARKET MONITOR · ALERTS
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Car <span className="text-gradient">Alerts</span>
                        </h1>
                        <p className="text-gray-400 mt-2 max-w-lg text-sm">
                            Get real-time notifications when vehicles matching your criteria hit the market.
                        </p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="h-12 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold flex items-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                    >
                        <Plus className="size-5" />
                        Create New Alert
                    </button>
                </div>

                {/* Alerts Grid */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="size-10 text-indigo-600 animate-spin" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-12 border border-gray-200 dark:border-white/5 shadow-sm text-center">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell className="size-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No alerts yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                            Set up your first alert to stay informed about new car listings that interest you.
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="size-5" />
                            Add Your First Alert
                        </button>
                    </div>
                ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`panel p-6 border-white/5 hover:border-cyan-400/30 transition-all relative group bg-white/[0.02] hover:bg-white/[0.04] shadow-xl shadow-black/20 ${(alert.enabled ?? true) === false ? "opacity-60 saturate-50" : ""
                                    }`}
                            >
                                {/* Toggle + Action buttons */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(alert)}
                                        className="p-2 h-9 w-9 rounded-xl glass border border-white/10 text-gray-400 hover:text-cyan-400 transition-all"
                                        title="Edit alert"
                                    >
                                        <Pencil className="size-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(alert.id)}
                                        className="p-2 h-9 w-9 rounded-xl glass border border-white/10 text-gray-400 hover:text-red-400 transition-all"
                                        title="Delete alert"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-12 w-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                        <Car className="size-6 text-cyan-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg tracking-tight truncate">
                                            {alert.make} {alert.model}
                                        </h3>
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                                            {alert.yearMin || alert.yearMax
                                                ? `${alert.yearMin || "Any"} - ${alert.yearMax || "Any"}`
                                                : "Any Year"} • {alert.variant || "Any Variant"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Region</span>
                                        <span className="text-xs font-bold text-gray-200">{alert.region}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Frequency</span>
                                        <span className="text-xs font-bold text-gray-200">{FREQUENCIES.find(f => f.value === alert.frequency)?.label ?? alert.frequency}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => handleToggle(alert)}
                                        disabled={togglingId === alert.id}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                            (alert.enabled ?? true) 
                                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]" 
                                                : "bg-white/5 text-gray-500 border border-white/5"
                                        )}
                                    >
                                        <div className={cn("h-1.5 w-1.5 rounded-full", (alert.enabled ?? true) ? "bg-cyan-400 animate-pulse" : "bg-gray-600")} />
                                        {(alert.enabled ?? true) ? "Active" : "Paused"}
                                    </button>

                                    <Link
                                        href={`/alerts/${alert.id}/results`}
                                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 group/link"
                                    >
                                        View Matches <ArrowUpRight className="size-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create / Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#0a1526] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingAlert ? "Edit Alert" : "Create New Alert"}
                                </h2>
                                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
                                    <X className="size-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="space-y-4">
                                    <CarTaxonomyDropdowns
                                        selectedMake={formData.make}
                                        selectedModel={formData.model}
                                        selectedVariant={formData.variant}
                                        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year Min</label>
                                        <input
                                            type="number"
                                            name="yearMin"
                                            value={formData.yearMin}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 2018"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year Max</label>
                                        <input
                                            type="number"
                                            name="yearMax"
                                            value={formData.yearMax}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 2024"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Region *</label>
                                    <select
                                        name="region"
                                        value={formData.region}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-[#020d1a] dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {REGIONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notify Me *</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {FREQUENCIES.map((f) => (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, frequency: f.value }))}
                                                className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${formData.frequency === f.value
                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                                    : "bg-gray-100 dark:bg-[#152033] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1a2942]"
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <Loader2 className="size-5 animate-spin" />
                                        ) : editingAlert ? (
                                            <><Pencil className="size-4" /> Save Changes</>
                                        ) : (
                                            <><Plus className="size-4" /> Create Alert</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
