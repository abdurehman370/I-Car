"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Zap, Gavel, MapPin, Gauge, Calendar, Wifi, WifiOff } from "lucide-react";

interface DisplayBid {
    id: number;
    label: string;
    amount: number;
    source: string;
    createdAt: string;
    isHighest: boolean;
}

interface DisplayAuction {
    id: number;
    title: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    variant: string | null;
    region: string;
    city: string | null;
    venue: string | null;
    auctionType: string;
    status: string;
    outcome: string | null;
    startAt: string;
    endAt: string;
    currency: string;
    startingBid: number;
    minIncrement: number;
    currentHighestBid: number | null;
    minNextBid: number;
    hasReserve: boolean;
    reserveMet: boolean | null;
    image: string | null;
    totalBids: number;
}

const POLL_MS = 1500;

function fmt(n: number) {
    return n.toLocaleString();
}

function pad(n: number) {
    return String(Math.max(0, n)).padStart(2, "0");
}

function Countdown({ target, offsetMs, danger }: { target: string; offsetMs: number; danger?: boolean }) {
    const [, force] = useState(0);
    useEffect(() => {
        const t = setInterval(() => force((v) => v + 1), 250);
        return () => clearInterval(t);
    }, []);

    const remaining = new Date(target).getTime() - (Date.now() + offsetMs);
    const total = Math.max(0, Math.floor(remaining / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const isDanger = danger && remaining < 2 * 60 * 1000;

    return (
        <div className={`font-mono font-black tracking-tight tabular-nums ${isDanger ? "text-red-400 animate-pulse" : "text-white"}`}>
            {d > 0 && <span>{d}d </span>}
            {pad(h)}:{pad(m)}:{pad(s)}
        </div>
    );
}

function DisplayInner() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [auction, setAuction] = useState<DisplayAuction | null>(null);
    const [bids, setBids] = useState<DisplayBid[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [offsetMs, setOffsetMs] = useState(0); // serverTime - clientTime
    const [connected, setConnected] = useState(true);
    const [flash, setFlash] = useState(false);
    const [extendedFlash, setExtendedFlash] = useState(false);

    const prevHighestRef = useRef<number | null>(null);
    const prevEndAtRef = useRef<string | null>(null);

    const fetchState = useCallback(async () => {
        try {
            const res = await fetch(`/api/auction-display/${id}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to load auction");
                setConnected(false);
                return;
            }
            setError(null);
            setConnected(true);
            setOffsetMs(new Date(data.serverTime).getTime() - Date.now());

            // Flash when a new highest bid arrives
            if (
                prevHighestRef.current !== null &&
                data.auction.currentHighestBid !== null &&
                data.auction.currentHighestBid > prevHighestRef.current
            ) {
                setFlash(true);
                setTimeout(() => setFlash(false), 1200);
            }
            prevHighestRef.current = data.auction.currentHighestBid;

            // Show "time extended" when endAt moves forward (anti-sniping)
            if (prevEndAtRef.current && data.auction.endAt !== prevEndAtRef.current &&
                new Date(data.auction.endAt) > new Date(prevEndAtRef.current)) {
                setExtendedFlash(true);
                setTimeout(() => setExtendedFlash(false), 5000);
            }
            prevEndAtRef.current = data.auction.endAt;

            setAuction(data.auction);
            setBids(data.bids);
        } catch {
            setConnected(false);
        }
    }, [id, token]);

    useEffect(() => {
        fetchState();
        const t = setInterval(fetchState, POLL_MS);
        return () => clearInterval(t);
    }, [fetchState]);

    if (error && !auction) {
        return (
            <div className="fixed inset-0 bg-[#020d1a] flex flex-col items-center justify-center gap-4 text-center p-8">
                <Gavel className="size-16 text-gray-600" />
                <h1 className="text-3xl font-black text-white">Display Unavailable</h1>
                <p className="text-gray-400">{error}</p>
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="fixed inset-0 bg-[#020d1a] flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />
            </div>
        );
    }

    const isLive = auction.status === "LIVE";
    const isScheduled = auction.status === "SCHEDULED";
    const isClosed = auction.status === "CLOSED";
    const isCancelled = auction.status === "CANCELLED";

    return (
        <div className="fixed inset-0 bg-[#020d1a] text-white flex flex-col overflow-hidden select-none">
            {/* Header */}
            <header className="flex items-center justify-between px-10 py-5 border-b border-white/10 bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.45)]">
                        <Zap className="h-7 w-7 text-black" strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-2xl font-black tracking-tight leading-none">CarQ <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Live Auction</span></p>
                        {auction.venue && (
                            <p className="mt-1.5 text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">{auction.venue}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Status pill */}
                    {isLive && (
                        <span className="flex items-center gap-3 px-5 py-2 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-black tracking-[0.3em] text-sm">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                        </span>
                    )}
                    {isScheduled && (
                        <span className="px-5 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black tracking-[0.3em] text-sm">
                            STARTING SOON
                        </span>
                    )}
                    {isClosed && (
                        <span className="px-5 py-2 rounded-full bg-gray-500/15 border border-gray-500/40 text-gray-300 font-black tracking-[0.3em] text-sm">
                            ENDED
                        </span>
                    )}
                    {isCancelled && (
                        <span className="px-5 py-2 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-black tracking-[0.3em] text-sm">
                            CANCELLED
                        </span>
                    )}
                    {connected
                        ? <Wifi className="size-5 text-cyan-400/60" />
                        : <WifiOff className="size-5 text-red-400 animate-pulse" />}
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-0">
                {/* Left: vehicle */}
                <div className="lg:col-span-3 flex flex-col p-10 gap-6 min-h-0">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 font-mono text-xs text-cyan-400 uppercase tracking-[0.3em]">
                                Lot #{auction.id}
                            </span>
                            <span className="font-mono text-xs text-gray-500 uppercase tracking-[0.3em]">
                                {auction.auctionType} Auction
                            </span>
                        </div>
                        <h1 className="text-4xl xl:text-6xl 2xl:text-7xl font-black tracking-tighter leading-[1.05]">
                            {auction.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-5">
                            <span className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-200 text-lg xl:text-xl font-bold">
                                <Calendar className="size-5 text-cyan-400" /> {auction.year}
                            </span>
                            <span className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-200 text-lg xl:text-xl font-bold tabular-nums">
                                <Gauge className="size-5 text-cyan-400" /> {fmt(auction.mileage)} KM
                            </span>
                            <span className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-200 text-lg xl:text-xl font-bold">
                                <MapPin className="size-5 text-cyan-400" /> {auction.city || auction.region}
                            </span>
                            {auction.variant && (
                                <span className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 text-lg xl:text-xl font-bold">
                                    {auction.variant}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 bg-black/40 min-h-0 relative">
                        {auction.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={auction.image} alt={auction.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                <Gavel className="size-32" />
                            </div>
                        )}

                        {/* Closed overlay */}
                        {(isClosed || isCancelled) && (
                            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                {auction.outcome === "sold" ? (
                                    <>
                                        <p className="text-7xl xl:text-8xl font-black text-green-400 tracking-tight drop-shadow-[0_0_40px_rgba(74,222,128,0.4)]">SOLD</p>
                                        <p className="text-3xl xl:text-4xl font-black text-white">
                                            {auction.currency} {auction.currentHighestBid ? fmt(auction.currentHighestBid) : ""}
                                        </p>
                                    </>
                                ) : isCancelled ? (
                                    <p className="text-6xl font-black text-red-400 tracking-tight">CANCELLED</p>
                                ) : auction.outcome === "reserve_not_met" ? (
                                    <>
                                        <p className="text-5xl xl:text-6xl font-black text-amber-400 tracking-tight">RESERVE NOT MET</p>
                                        <p className="text-2xl font-bold text-gray-300">
                                            Highest bid: {auction.currency} {auction.currentHighestBid ? fmt(auction.currentHighestBid) : "—"}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-6xl font-black text-gray-300 tracking-tight">NO SALE</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: bidding panel */}
                <div className="lg:col-span-2 border-l border-white/10 bg-white/[0.02] flex flex-col min-h-0">
                    {/* Current bid */}
                    <div className={`p-10 border-b border-white/10 transition-colors duration-500 ${flash ? "bg-cyan-500/20" : "bg-gradient-to-br from-cyan-500/[0.06] to-transparent"}`}>
                        <p className="font-mono text-sm text-cyan-400/80 uppercase tracking-[0.4em] mb-4">
                            {auction.currentHighestBid ? "Current Highest Bid" : "Starting Bid"}
                        </p>
                        <p className={`text-7xl xl:text-8xl font-black tracking-tighter tabular-nums leading-none transition-transform duration-300 ${flash ? "text-cyan-300 scale-105 origin-left drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]" : "text-white"}`}>
                            <span className="text-3xl xl:text-4xl font-bold text-gray-500 mr-3 align-top mt-2 inline-block">{auction.currency}</span>
                            {fmt(auction.currentHighestBid ?? auction.startingBid)}
                        </p>
                        {isLive && (
                            <p className="mt-6 text-xl xl:text-2xl text-gray-300 font-semibold">
                                Next bid: <span className="text-cyan-400 font-black tabular-nums">{auction.currency} {fmt(auction.minNextBid)}</span>
                                <span className="text-gray-500 text-base ml-3 font-medium">+{fmt(auction.minIncrement)} min</span>
                            </p>
                        )}
                        {auction.hasReserve && !isClosed && (
                            <span className={`inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full border text-sm font-black uppercase tracking-widest ${auction.reserveMet
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                                {auction.reserveMet ? "✓ Reserve met" : "Reserve not yet met"}
                            </span>
                        )}
                    </div>

                    {/* Countdown */}
                    <div className="px-10 py-8 border-b border-white/10">
                        {isScheduled && (
                            <>
                                <p className="font-mono text-sm text-amber-400 uppercase tracking-[0.4em] mb-3">Bidding opens in</p>
                                <div className="text-6xl xl:text-7xl"><Countdown target={auction.startAt} offsetMs={offsetMs} /></div>
                            </>
                        )}
                        {isLive && (
                            <>
                                <div className="flex items-center gap-4 mb-3">
                                    <p className="font-mono text-sm text-gray-400 uppercase tracking-[0.4em]">Time remaining</p>
                                    {extendedFlash && (
                                        <span className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-black tracking-widest animate-pulse">
                                            ⏱ TIME EXTENDED
                                        </span>
                                    )}
                                </div>
                                <div className="text-6xl xl:text-7xl"><Countdown target={auction.endAt} offsetMs={offsetMs} danger /></div>
                            </>
                        )}
                        {(isClosed || isCancelled) && (
                            <p className="text-3xl font-black text-gray-500 tracking-tight uppercase">Bidding closed</p>
                        )}
                    </div>

                    {/* Bid feed */}
                    <div className="flex-1 overflow-hidden p-10 pt-6 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <p className="font-mono text-sm text-gray-400 uppercase tracking-[0.4em]">Bid Activity</p>
                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-sm font-bold text-gray-300 tabular-nums">
                                {auction.totalBids} bid{auction.totalBids === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className="space-y-3 overflow-hidden">
                            {bids.length === 0 ? (
                                <div className="px-6 py-8 rounded-2xl border border-dashed border-white/10 text-center">
                                    <p className="text-gray-500 text-xl font-semibold">Waiting for the first bid…</p>
                                </div>
                            ) : (
                                bids.map((bid) => (
                                    <div
                                        key={bid.id}
                                        className={`flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${bid.isHighest
                                            ? "bg-cyan-500/10 border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                                            : "bg-white/[0.03] border-white/5 opacity-80"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <span className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${bid.source === "floor"
                                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                                : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                                }`}>
                                                {bid.source === "floor" ? "Floor" : "Online"}
                                            </span>
                                            <span className={`font-bold text-xl truncate ${bid.isHighest ? "text-white" : "text-gray-300"}`}>{bid.label}</span>
                                            {bid.isHighest && (
                                                <span className="shrink-0 px-2.5 py-1 rounded-md bg-cyan-400/15 text-cyan-300 text-[10px] font-black uppercase tracking-widest">
                                                    Leading
                                                </span>
                                            )}
                                        </div>
                                        <span className={`font-black text-2xl tabular-nums shrink-0 tracking-tight ${bid.isHighest ? "text-cyan-300" : "text-gray-400"}`}>
                                            <span className="text-sm font-bold mr-1.5 opacity-60">{auction.currency}</span>{fmt(bid.amount)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuctionDisplayPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 bg-[#020d1a] flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />
            </div>
        }>
            <DisplayInner />
        </Suspense>
    );
}
