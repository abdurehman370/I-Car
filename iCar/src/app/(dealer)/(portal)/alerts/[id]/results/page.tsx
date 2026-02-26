"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft, Loader2, AlertCircle, Car, MapPin,
    Calendar, Gauge, ExternalLink, RefreshCw, Bell,
    ArrowUpDown, Filter, Search, Info,
} from "lucide-react";

interface AlertInfo {
    id: number;
    make: string;
    model: string;
    yearMin: number | null;
    yearMax: number | null;
    variant: string | null;
    region: string;
    frequency: string;
    createdAt: string;
}

interface MatchResult {
    source: 'iCar' | 'External';
    id: string | null;
    title: string;
    price: number | string | null;
    currency: string;
    year: number | string | null;
    mileage: number | string | null;
    location: string;
    image: string | null;
    url: string | null;
    dealer: string | null;
    createdAt?: string;
}

type SortOption = 'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc';

export default function AlertResultsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [alert, setAlert] = useState<AlertInfo | null>(null);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>('year-desc');
    const [filterSource, setFilterSource] = useState<'all' | 'iCar' | 'External'>('all');

    const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/dealer/alerts/${id}/results`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Failed to fetch results");
                return;
            }
            setAlert(data.alert);
            setResults(data.results);
        } catch {
            setError("An error occurred while fetching results");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchResults();
    }, [id]);

    const filteredAndSortedResults = useMemo(() => {
        let filtered = results.filter(r => {
            const matchesSource = filterSource === 'all' || r.source === filterSource;
            const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.location && r.location.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSource && matchesSearch;
        });

        return filtered.sort((a, b) => {
            const priceA = Number(a.price) || 0;
            const priceB = Number(b.price) || 0;
            const yearA = Number(a.year) || 0;
            const yearB = Number(b.year) || 0;
            const mileageA = Number(a.mileage) || 0;
            const mileageB = Number(b.mileage) || 0;

            switch (sortBy) {
                case 'price-asc': return priceA - priceB;
                case 'price-desc': return priceB - priceA;
                case 'year-desc': return yearB - yearA;
                case 'mileage-asc': return mileageA - mileageB;
                default: return 0;
            }
        });
    }, [results, searchQuery, sortBy, filterSource]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
            {/* Navigation Header */}
            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={() => router.push('/alerts')}
                    className="group flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors py-2"
                >
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 group-hover:bg-indigo-50 dark:group-hover:bg-white/10 border border-gray-200 dark:border-white/5 transition-colors">
                        <ChevronLeft className="size-4" />
                    </div>
                    <span className="text-sm font-medium">Back to Alerts</span>
                </button>
                <button
                    onClick={fetchResults}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-white/10 transition-all font-medium active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Alert Detail Hero */}
            {alert && (
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-600/20 dark:to-purple-600/20 rounded-[2.5rem] p-8 md:p-10 border border-gray-200 dark:border-white/10 shadow-2xl">
                    <div className="absolute top-0 right-0 -m-8 size-64 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 -m-8 size-64 bg-purple-500/20 dark:bg-purple-500/10 blur-[100px] rounded-full" />

                    <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/20 shadow-sm">
                                    <Bell className="size-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-400/10 px-3 py-1 rounded-full">Active Search</span>
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {alert.make} {alert.model}
                                    {alert.variant && <span className="block text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-medium mt-1">{alert.variant}</span>}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">
                                    <span className="flex items-center gap-1.5"><MapPin className="size-4 text-indigo-500 dark:text-indigo-400" /> {alert.region}</span>
                                    <span className="hidden md:block bg-gray-300 dark:bg-white/10 w-px h-4" />
                                    <span className="flex items-center gap-1.5"><Calendar className="size-4 text-indigo-500 dark:text-indigo-400" /> {(alert.yearMin || alert.yearMax) ? `${alert.yearMin ?? 'Any'} – ${alert.yearMax ?? 'Any'}` : 'All Years'}</span>
                                    <span className="hidden md:block bg-gray-300 dark:bg-white/10 w-px h-4" />
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{results.length} Matches Found</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            {!loading && results.length > 0 && (
                <div className="flex flex-col lg:flex-row items-center gap-4 bg-white dark:bg-white/5 backdrop-blur-md p-3 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg">
                    <div className="relative flex-1 w-full group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="size-4 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search results by title or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500/50 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 flex-1 lg:flex-initial">
                            <Filter className="size-4 text-gray-400 dark:text-gray-500 ml-2" />
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value as any)}
                                className="flex-1 lg:w-32 py-2.5 px-3 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-2xl text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <option value="all">All Sources</option>
                                <option value="iCar">iCar Only</option>
                                <option value="External">Market Only</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 flex-1 lg:flex-initial">
                            <ArrowUpDown className="size-4 text-gray-400 dark:text-gray-500" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="flex-1 lg:w-40 py-2.5 px-3 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-2xl text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <option value="year-desc">Newest Year</option>
                                <option value="price-asc">Lowest Price</option>
                                <option value="price-desc">Highest Price</option>
                                <option value="mileage-asc">Lowest Mileage</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Area */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-red-500/5 rounded-[2.5rem] border border-red-500/10">
                    <div className="p-4 bg-red-500/10 rounded-full mb-6">
                        <AlertCircle className="size-16 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                    <p className="text-gray-400 max-w-sm mb-8">{error}</p>
                    <button onClick={fetchResults} className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95">
                        Try Again
                    </button>
                </div>
            ) : filteredAndSortedResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 px-6 text-center bg-white/5 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <div className="p-6 bg-white/5 rounded-full mb-6">
                        <Car className="size-20 text-gray-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">No matches found</h2>
                    <p className="text-gray-400 max-w-sm">
                        {searchQuery ? "Try adjusting your search query or filters." : "We couldn't find any listings matching your criteria. We'll alert you as soon as someone lists a matching car."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {filteredAndSortedResults.map((r, i) => (
                        <ResultCard key={r.id || i} result={r} />
                    ))}
                </div>
            )}

            {/* Info Footer */}
            {!loading && results.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-2xl">
                    <Info className="size-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 uppercase font-bold tracking-widest leading-relaxed">
                        Data is aggregated in real-time. Prices may vary based on merchant updates and market fluctuations.
                    </p>
                </div>
            )}
        </div>
    );
}

function ResultCard({ result }: { result: MatchResult }) {
    const isInternal = result.source === 'iCar';
    const href = isInternal && result.id ? `/listings/${result.id}` : (result.url ?? '#');
    const isExternal = !isInternal && result.url;
    const [imgSrc, setImgSrc] = useState<string>(result.image || '/car-placeholder.png');

    return (
        <div className="group relative bg-white dark:bg-[#0a1526] rounded-[2rem] overflow-hidden border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col h-full">
            {/* Image Section */}
            <div className="relative aspect-[16/10] overflow-hidden bg-[#020d1a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imgSrc}
                    alt={result.title}
                    className={`w-full h-full object-cover transition-transform duration-700 ${imgSrc === '/car-placeholder.png' ? 'opacity-60' : 'group-hover:scale-110'}`}
                    onError={() => setImgSrc('/car-placeholder.png')}
                />

                {/* Source Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white/90 dark:from-[#0a1526]/90 to-transparent">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter backdrop-blur-md border ${isInternal
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                        : 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30'
                        }`}>
                        {result.source} Listing
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight line-clamp-2 h-12 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {result.title}
                    </h3>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {result.price ? `${result.currency} ${Number(result.price).toLocaleString()}` : 'Price N/A'}
                    </span>
                    {result.price && <span className="text-xs text-gray-500 font-medium font-bold">Est. Total</span>}
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-8 border-y border-gray-100 dark:border-white/5 py-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="size-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="text-xs font-bold tracking-tight">{result.year || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Gauge className="size-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="text-xs font-bold tracking-tight">{result.mileage ? `${Number(result.mileage).toLocaleString()} KM` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 col-span-2">
                        <MapPin className="size-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="text-xs font-bold tracking-tight line-clamp-1 italic">{result.location || 'Unknown Location'}</span>
                    </div>
                </div>

                {/* Footer / CTA */}
                <div className="mt-auto pt-2">
                    {isExternal ? (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-black rounded-2xl text-sm font-black transition-all shadow-lg active:scale-95"
                        >
                            Review on External Site <ExternalLink className="size-4" />
                        </a>
                    ) : (
                        <Link
                            href={href}
                            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            Manage iCar Listing
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-[#0a1526] rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-lg flex flex-col h-full animate-pulse">
            <div className="aspect-[16/10] bg-gray-100 dark:bg-white/5" />
            <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 bg-gray-100 dark:bg-white/5 rounded-lg" />
                <div className="h-8 w-1/2 bg-gray-100 dark:bg-white/5 rounded-lg" />
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 dark:border-white/5">
                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded" />
                    <div className="h-4 bg-gray-100 dark:bg-white/5 rounded" />
                    <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded col-span-2" />
                </div>
                <div className="h-12 bg-gray-100 dark:bg-white/5 rounded-2xl" />
            </div>
        </div>
    );
}
