"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Search, Car, MapPin, Calendar, Gauge, DollarSign,
    ExternalLink, Loader2, SlidersHorizontal, X,
    ChevronDown, Phone, Building2, Filter, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

import { CarTaxonomyDropdowns } from "@/components/FormElements/CarTaxonomyDropdowns";

interface SearchResult {
    source: "iCar" | "External";
    id: string | null;
    title: string;
    make: string | null;
    model: string | null;
    year: number | string | null;
    mileage: number | string | null;
    price: number | string | null;
    currency: string;
    location: string;
    image: string | null;
    url: string | null;
    dealer: string | null;
    phone: string | null;
    condition: string | null;
}

interface SearchForm {
    make: string;
    model: string;
    variant: string;
    region: string;
    yearMin: string;
    yearMax: string;
    mileageMax: string;
    priceMin: string;
    priceMax: string;
}

interface SearchMeta {
    total: number;
    internal: number;
    external: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REGIONS = ["UAE", "Lebanon", "Europe"];

const BLANK_FORM: SearchForm = {
    make: "", model: "", variant: "",
    region: "UAE",
    yearMin: "", yearMax: "",
    mileageMax: "",
    priceMin: "", priceMax: "",
};

const CONDITION_COLORS: Record<string, string> = {
    NEW: "bg-green-500/20 text-green-400 border-green-500/30",
    USED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    CERTIFIED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DealerToolsPage() {
    const [form, setForm] = useState<SearchForm>(BLANK_FORM);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [meta, setMeta] = useState<SearchMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [filterSource, setFilterSource] = useState<"all" | "iCar" | "External">("all");
    const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "year_desc" | "mileage_asc">("default");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setForm(BLANK_FORM);
        setResults([]);
        setMeta(null);
        setSearched(false);
        setFilterSource("all");
        setSortBy("default");
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.make && !form.model && !form.region) {
            toast.error("Please enter at least a make, model, or region");
            return;
        }
        setLoading(true);
        setSearched(false);
        try {
            const res = await fetch("/api/dealer/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || "Search failed");
                return;
            }
            setResults(data.results);
            setMeta({ total: data.total, internal: data.internal, external: data.external });
            setSearched(true);
            if (data.total === 0) toast("No listings found for your criteria", { icon: "🔍" });
        } catch {
            toast.error("An error occurred during search");
        } finally {
            setLoading(false);
        }
    };

    // Client-side filter + sort
    const displayed = results
        .filter((r) => filterSource === "all" || r.source === filterSource)
        .sort((a, b) => {
            if (sortBy === "price_asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
            if (sortBy === "price_desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
            if (sortBy === "year_desc") return (Number(b.year) || 0) - (Number(a.year) || 0);
            if (sortBy === "mileage_asc") return (Number(a.mileage) || 0) - (Number(b.mileage) || 0);
            return 0;
        });

    const iCarCount = results.filter((r) => r.source === "iCar").length;
    const externalCount = results.filter((r) => r.source === "External").length;

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ── Header ── */}
                <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
                        GLOBAL SEARCH · DEALER TOOLS
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                        Market <span className="text-gradient">Intelligence</span>
                    </h1>
                    <p className="text-gray-400 mt-2 max-w-lg text-sm">
                        Search vehicle listings across iCar inventory and aggregated live market sources worldwide.
                    </p>
                </div>

                {/* ── Search Form ── */}
                <form
                    onSubmit={handleSearch}
                    className="panel p-8 border-white/5 space-y-6"
                >
                    <div className="space-y-6">
                        <CarTaxonomyDropdowns
                            selectedMake={form.make}
                            selectedModel={form.model}
                            selectedVariant={form.variant}
                            onChange={(field, value) => setForm(prev => ({ ...prev, [field]: value }))}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Region */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500 ml-1">
                                    Region *
                                </label>
                                <select
                                    name="region"
                                    value={form.region}
                                    onChange={handleChange}
                                    className="w-full h-12 px-4 rounded-xl glass border border-white/10 text-white outline-none focus:border-cyan-400/30 transition-all"
                                >
                                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Advanced filters toggle */}
                    <div className="px-6 pb-2">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((v) => !v)}
                            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                            <SlidersHorizontal className="size-4" />
                            {filtersOpen ? "Hide" : "Show"} advanced filters
                            <ChevronDown className={`size-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                        </button>
                    </div>

                    {/* Advanced filters */}
                    {filtersOpen && (
                        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-gray-100 dark:border-white/5 pt-4">
                            {/* Year range */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Year Range
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        name="yearMin"
                                        value={form.yearMin}
                                        onChange={handleChange}
                                        placeholder="From"
                                        min={1990}
                                        max={2030}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020d1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                                    <input
                                        type="number"
                                        name="yearMax"
                                        value={form.yearMax}
                                        onChange={handleChange}
                                        placeholder="To"
                                        min={1990}
                                        max={2030}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020d1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <Field label="Max Mileage (KM)" name="mileageMax" value={form.mileageMax} onChange={handleChange} placeholder="e.g. 80000" type="number" />

                            {/* Price range */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Price Range
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        name="priceMin"
                                        value={form.priceMin}
                                        onChange={handleChange}
                                        placeholder="Min"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020d1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                                    <input
                                        type="number"
                                        name="priceMax"
                                        value={form.priceMax}
                                        onChange={handleChange}
                                        placeholder="Max"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020d1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-10 h-14 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                        >
                            {loading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
                            {loading ? "SEARCHING…" : "SEARCH MARKET"}
                        </button>
                        {searched && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="flex items-center justify-center gap-2 px-6 h-14 glass border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all"
                            >
                                <RotateCcw className="size-4" />
                                RESET
                            </button>
                        )}
                    </div>
                </form>

                {/* ── Loading state ── */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="size-12 text-indigo-600 animate-spin" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Searching iCar inventory and live market sources…
                        </p>
                    </div>
                )}

                {/* ── Results ── */}
                {!loading && searched && (
                    <div className="space-y-6">
                        {/* Stats + controls bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-gray-900 dark:text-white font-bold text-lg">
                                    {meta?.total ?? 0} results
                                </span>
                                <span
                                    onClick={() => setFilterSource("iCar")}
                                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterSource === "iCar"
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                        }`}
                                >
                                    iCar: {iCarCount}
                                </span>
                                <span
                                    onClick={() => setFilterSource("External")}
                                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterSource === "External"
                                            ? "bg-yellow-500 text-yellow-900 border-yellow-500"
                                            : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                                        }`}
                                >
                                    Market: {externalCount}
                                </span>
                                {filterSource !== "all" && (
                                    <button
                                        onClick={() => setFilterSource("all")}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        <X className="size-3" /> Clear filter
                                    </button>
                                )}
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-2">
                                <Filter className="size-4 text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a1526] text-gray-700 dark:text-gray-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="default">Sort: Default</option>
                                    <option value="price_asc">Price: Low → High</option>
                                    <option value="price_desc">Price: High → Low</option>
                                    <option value="year_desc">Year: Newest First</option>
                                    <option value="mileage_asc">Mileage: Lowest First</option>
                                </select>
                            </div>
                        </div>

                        {/* No results */}
                        {displayed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-[#0a1526] rounded-3xl border border-gray-200 dark:border-white/5">
                                <Car className="size-14 text-gray-300 dark:text-gray-700" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    No listings match your current filters
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {displayed.map((result, i) => (
                                    <ResultCard key={result.id ?? i} result={result} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Field helper
// ---------------------------------------------------------------------------
function Field({
    label, name, value, onChange, placeholder, type = "text",
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {label}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020d1a] text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Result Card
// ---------------------------------------------------------------------------
function ResultCard({ result }: { result: SearchResult }) {
    const [imgError, setImgError] = useState(false);
    const isInternal = result.source === "iCar";
    const href = isInternal && result.id ? `/listings/${result.id}` : (result.url ?? "#");

    return (
        <div className="bg-white dark:bg-[#0a1526] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-200 flex flex-col group">

            {/* Image */}
            <div className="relative aspect-[16/10] bg-gray-100 dark:bg-[#020d1a] overflow-hidden">
                {result.image && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={result.image}
                        alt={result.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Car className="size-12 text-gray-300 dark:text-gray-700" />
                    </div>
                )}

                {/* Source badge */}
                <span className={`absolute top-3 left-3 px-2.5 py-0.5 text-[11px] font-bold rounded-full ${isInternal
                        ? "bg-indigo-600 text-white"
                        : "bg-yellow-400 text-yellow-900"
                    }`}>
                    {result.source}
                </span>

                {/* Condition badge */}
                {result.condition && (
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${CONDITION_COLORS[result.condition] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}>
                        {result.condition}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
                    {result.title}
                </h3>

                {result.price ? (
                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-base">
                        {result.currency} {Number(result.price).toLocaleString()}
                    </p>
                ) : (
                    <p className="text-gray-400 text-sm italic">Price not listed</p>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {result.year && (
                        <span className="flex items-center gap-1">
                            <Calendar className="size-3" /> {result.year}
                        </span>
                    )}
                    {result.mileage && (
                        <span className="flex items-center gap-1">
                            <Gauge className="size-3" /> {Number(result.mileage).toLocaleString()} KM
                        </span>
                    )}
                    {result.location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="size-3" /> {result.location}
                        </span>
                    )}
                </div>

                {/* Dealer info (iCar only) */}
                {result.dealer && (
                    <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Building2 className="size-3 flex-shrink-0" />
                            {result.dealer}
                        </p>
                        {result.phone && (
                            <a
                                href={`tel:${result.phone}`}
                                className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 hover:underline"
                            >
                                <Phone className="size-3 flex-shrink-0" />
                                {result.phone}
                            </a>
                        )}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-2">
                    {isInternal ? (
                        <Link
                            href={href}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
                        >
                            View Listing
                        </Link>
                    ) : (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-2xl text-sm font-semibold transition-colors"
                        >
                            View on Site <ExternalLink className="size-3.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
