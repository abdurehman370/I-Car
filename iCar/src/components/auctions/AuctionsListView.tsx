"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gavel, Loader2, Calendar, Clock, ChevronRight } from "lucide-react";

type Props = {
  /** Base path for auction detail links, e.g. "/user/auctions" or "/auctions" */
  detailBasePath: string;
  variant?: "user" | "dealer";
};

export function AuctionsListView({ detailBasePath, variant = "dealer" }: Props) {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const res = await fetch("/api/dealer/auctions");
        const data = await res.json();
        if (data.auctions) setAuctions(data.auctions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAuctions();
  }, []);

  const isUser = variant === "user";

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full glass border text-[10px] font-mono tracking-[0.25em] mb-4 ${
            isUser
              ? "border-violet-400/30 text-violet-400"
              : "border-cyan-400/30 text-cyan-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full animate-glow ${isUser ? "bg-violet-400" : "bg-cyan-400"}`}
          />
          {isUser ? "USER PORTAL · AUCTIONS" : "DEALER · AUCTIONS"}
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
          Vehicle <span className="text-gradient">Auctions</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {isUser
            ? "Browse live and upcoming vehicle auctions. Place bids on vehicles you want to win."
            : "Browse and participate in platform vehicle auctions."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className={`h-10 w-10 animate-spin ${isUser ? "text-violet-400" : "text-cyan-500"}`} />
        </div>
      ) : auctions.length === 0 ? (
        <div className="panel border-white/5 p-12 text-center">
          <Gavel className="mx-auto h-16 w-16 text-gray-500 opacity-40" />
          <h3 className="mt-4 text-lg font-semibold text-white">No active auctions</h3>
          <p className="mt-2 text-gray-400 text-sm max-w-md mx-auto">
            There are no vehicle auctions right now. Check back soon or turn on auction alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-400">
            {auctions.length} available auction{auctions.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {auctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                href={`${detailBasePath}/${auction.id}`}
                accent={isUser ? "violet" : "cyan"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionCard({
  auction,
  href,
  accent,
}: {
  auction: any;
  href: string;
  accent: "violet" | "cyan";
}) {
  const primaryImage =
    auction.images?.find((i: any) => i.isPrimary)?.url ||
    auction.images?.[0]?.url ||
    "/car-placeholder.jpg";
  const [imgSrc, setImgSrc] = useState(primaryImage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE":
        return "bg-green-500/20 text-green-400 border-green-500/40";
      case "SCHEDULED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "CLOSED":
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
      default:
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    }
  };

  const currentHighest = auction.currentHighestBid
    ? parseFloat(auction.currentHighestBid)
    : 0;
  const iconClass = accent === "violet" ? "text-violet-400" : "text-cyan-400";

  return (
    <Link
      href={href}
      className="group panel border-white/5 overflow-hidden flex flex-col bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        <Image
          src={imgSrc}
          alt={auction.title}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgSrc("/car-placeholder.jpg")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest backdrop-blur-md border ${getStatusColor(auction.status)}`}
          >
            {auction.status.toUpperCase()}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h4 className="font-bold text-white text-lg tracking-tight truncate">
            {auction.year} {auction.make} {auction.model}
          </h4>
          <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase truncate mt-1">
            {auction.title}
          </p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="mb-4">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              {auction.status === "LIVE"
                ? "Current Bid"
                : auction.status === "CLOSED"
                  ? "Final Bid"
                  : "Starting Bid"}
            </span>
            <p className="text-2xl font-bold tracking-tight text-white">
              {auction.currency}{" "}
              {currentHighest > 0
                ? currentHighest.toLocaleString()
                : auction.startingBid.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5">
              <Calendar className={`h-3.5 w-3.5 ${iconClass}`} />
              <span className="text-[10px] font-bold text-gray-300">
                Starts: {new Date(auction.startAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5">
              <Clock className={`h-3.5 w-3.5 ${iconClass}`} />
              <span className="text-[10px] font-bold text-gray-300">
                Ends: {new Date(auction.endAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="h-10 rounded-xl glass border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-white/10 transition-all">
          {auction.status === "LIVE" ? "Join Auction" : "View Details"}
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
