"use client";

import { useEffect, useRef, useState } from "react";
import {
    FileText, Upload, Loader2, CheckCircle2, Archive,
    AlertTriangle, ShieldCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

interface RuleEntry {
    fuelCategory: string;
    minMileageKm?: number | null;
    maxMileageKm?: number | null;
    customsRate?: number | null;
    vatRate?: number | null;
    daribehRate?: number | null;
    totalRate: number;
    notes?: string | null;
}

interface RulesJson {
    region: string;
    version: string;
    currency: string;
    effectiveDate?: string | null;
    rules: RuleEntry[];
    rawSummary: string;
}

interface RuleDocument {
    id: number;
    region: string;
    originalFileName: string;
    fileUrl: string;
    sizeBytes: number;
    rulesJson: RulesJson | null;
    status: "draft" | "active" | "archived";
    version: string;
    createdAt: string;
    activatedAt: string | null;
    uploadedBy?: { username: string } | null;
}

interface ActiveInfo {
    ruleVersion: string;
    isDefaultRules: boolean;
    documentId: number | null;
    rules: RulesJson;
}

const STATUS_STYLES: Record<string, string> = {
    draft: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    active: "bg-green-500/15 text-green-400 border-green-500/25",
    archived: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function formatPercent(rate: number | null | undefined): string {
    if (rate === null || rate === undefined) return "—";
    return `${Math.round(rate * 1000) / 10}%`;
}

function formatFuel(fuel: string): string {
    return fuel.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function formatMileageWindow(rule: RuleEntry): string {
    const hasMin = rule.minMileageKm !== null && rule.minMileageKm !== undefined;
    const hasMax = rule.maxMileageKm !== null && rule.maxMileageKm !== undefined;
    if (!hasMin && !hasMax) return "Any";
    if (hasMin && hasMax) return `${rule.minMileageKm!.toLocaleString()} – ${rule.maxMileageKm!.toLocaleString()} km`;
    if (hasMin) return `> ${rule.minMileageKm!.toLocaleString()} km`;
    return `≤ ${rule.maxMileageKm!.toLocaleString()} km`;
}

function RulesTable({ rules }: { rules: RuleEntry[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Fuel</th>
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Mileage</th>
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Customs</th>
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">VAT</th>
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Daribeh</th>
                        <th className="pb-2 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {rules.map((rule, i) => (
                        <tr key={i} className="text-gray-300">
                            <td className="py-2.5 text-white font-semibold">{formatFuel(rule.fuelCategory)}</td>
                            <td className="py-2.5 tabular-nums">{formatMileageWindow(rule)}</td>
                            <td className="py-2.5 tabular-nums">{formatPercent(rule.customsRate)}</td>
                            <td className="py-2.5 tabular-nums">{formatPercent(rule.vatRate)}</td>
                            <td className="py-2.5 tabular-nums">{formatPercent(rule.daribehRate)}</td>
                            <td className="py-2.5 font-black text-cyan-400 tabular-nums">{formatPercent(rule.totalRate)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ImportRulesPage() {
    const [documents, setDocuments] = useState<RuleDocument[]>([]);
    const [active, setActive] = useState<ActiveInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [actionId, setActionId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAll = async () => {
        try {
            const [listRes, activeRes] = await Promise.all([
                fetch("/api/admin/import-rules?region=LEBANON"),
                fetch("/api/admin/import-rules/active?region=LEBANON"),
            ]);
            const listData = await listRes.json();
            const activeData = await activeRes.json();
            if (listRes.ok) setDocuments(listData.documents);
            if (activeRes.ok) setActive(activeData);
        } catch {
            toast.error("Failed to load import rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleUpload = async (file: File) => {
        if (file.type !== "application/pdf") {
            toast.error("Please select a PDF file");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("PDF too large (max 10 MB)");
            return;
        }

        setUploading(true);
        try {
            const fileData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await fetch("/api/admin/import-rules/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, fileData, region: "LEBANON" }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "PDF uploaded and rules extracted");
                setExpandedId(data.document?.id ?? null);
                fetchAll();
            } else {
                toast.error(data.message || "Upload failed");
            }
        } catch {
            toast.error("An error occurred during upload");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleActivate = async (doc: RuleDocument) => {
        if (!confirm(`Activate rules ${doc.version}? The currently active rules will be archived.`)) return;
        setActionId(doc.id);
        try {
            const res = await fetch(`/api/admin/import-rules/${doc.id}/activate`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Rules activated");
                fetchAll();
            } else {
                toast.error(data.message || "Failed to activate");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionId(null);
        }
    };

    const handleArchive = async (doc: RuleDocument) => {
        if (!confirm(`Archive ${doc.version}?${doc.status === "active" ? " Default built-in rules will be used until a new document is activated." : ""}`)) return;
        setActionId(doc.id);
        try {
            const res = await fetch(`/api/admin/import-rules/${doc.id}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Document archived");
                fetchAll();
            } else {
                toast.error(data.message || "Failed to archive");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
                        VALUATION · LEBANON
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Import Rules</h1>
                    <p className="text-gray-400 mt-1 text-sm max-w-lg">
                        Upload the official Lebanon customs/import PDF. Rules are extracted, versioned, and applied
                        deterministically to rare-car fallback valuations.
                    </p>
                </div>

                <label className={`h-11 px-5 rounded-xl font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-all bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:brightness-110 shadow-lg shadow-cyan-500/25 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Extracting rules…" : "Upload PDF"}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                        }}
                    />
                </label>
            </div>

            {/* Active rules banner */}
            {active && (
                <div className={`panel p-5 rounded-2xl flex items-start gap-4 ${active.isDefaultRules ? "border-amber-500/25 bg-amber-500/[0.04]" : "border-green-500/20 bg-green-500/[0.03]"}`}>
                    {active.isDefaultRules
                        ? <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                        : <ShieldCheck className="h-6 w-6 text-green-400 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                        <p className="font-bold text-white">
                            {active.isDefaultRules
                                ? "Using built-in default rules"
                                : `Active rules: ${active.ruleVersion}`}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {active.isDefaultRules
                                ? "No PDF has been activated yet. Valuations use the built-in Lebanon rule set — upload and activate the latest customs PDF."
                                : active.rules.rawSummary}
                        </p>
                        {active.isDefaultRules && (
                            <div className="mt-3"><RulesTable rules={active.rules.rules} /></div>
                        )}
                    </div>
                </div>
            )}

            {/* Documents list */}
            <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
                <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-4 border-b border-white/10 pb-3">
                    Uploaded Documents
                </p>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <FileText className="mx-auto h-10 w-10 opacity-40 mb-3" />
                        <p className="font-semibold text-gray-400">No rule documents uploaded yet</p>
                        <p className="text-xs text-gray-500 mt-1">Upload the Lebanon customs PDF to replace the built-in defaults.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div key={doc.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                <div className="p-4 flex items-center gap-4 flex-wrap">
                                    <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5 text-cyan-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="font-bold text-white truncate">{doc.originalFileName}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-widest border ${STATUS_STYLES[doc.status]}`}>
                                                {doc.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">
                                            {doc.version} · {(doc.sizeBytes / 1024).toFixed(0)} KB · {new Date(doc.createdAt).toLocaleString()}
                                            {doc.uploadedBy?.username ? ` · by ${doc.uploadedBy.username}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                                            className="h-9 px-3.5 rounded-lg bg-white/[0.06] border border-white/10 text-gray-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                        >
                                            {expandedId === doc.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            Rules
                                        </button>
                                        {doc.status === "draft" && (
                                            <button
                                                onClick={() => handleActivate(doc)}
                                                disabled={actionId === doc.id}
                                                className="h-9 px-3.5 rounded-lg bg-green-500 text-black hover:bg-green-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                                            >
                                                {actionId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                Activate
                                            </button>
                                        )}
                                        {doc.status !== "archived" && (
                                            <button
                                                onClick={() => handleArchive(doc)}
                                                disabled={actionId === doc.id}
                                                className="h-9 px-3.5 rounded-lg bg-transparent border border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                                            >
                                                <Archive className="h-3.5 w-3.5" /> Archive
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedId === doc.id && (
                                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                                        {doc.rulesJson ? (
                                            <>
                                                <p className="text-sm text-gray-400 italic">{doc.rulesJson.rawSummary}</p>
                                                <RulesTable rules={doc.rulesJson.rules} />
                                            </>
                                        ) : (
                                            <p className="text-sm text-red-400">No structured rules were extracted from this document.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
