"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Gavel,
  Plus,
  Loader2,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Auction {
  id: number;
  title: string;
  make: string;
  model: string;
  year: number;
  startingBid: string;
  currentHighestBid: string | null;
  currency: string;
  status: string;
  startAt: string;
  endAt: string;
  images?: { url: string; isPrimary: boolean }[];
  _count: { bids: number };
}

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const res = await fetch("/api/admin/auctions");
        const data = await res.json();
        if (data.auctions) {
          setAuctions(data.auctions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAuctions();
  }, []);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <Breadcrumb pageName="Live Auctions" />
        <Link
          href="/admin/auctions/create"
          className="mt-4 sm:mt-0 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-cyan-500/40"
        >
          <Plus className="h-4 w-4" />
          Create Auction
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        </div>
      ) : auctions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center shadow-sm backdrop-blur-md">
          <Gavel className="mx-auto h-16 w-16 text-gray-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">
            No auctions found
          </h3>
          <p className="mt-2 text-gray-400">
            There are currently no vehicle auctions in the system.
          </p>
          <Link
            href="/admin/auctions/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/20 border border-white/5"
          >
            Create your first auction
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-400">
            {auctions.length} total auction{auctions.length !== 1 ? "s" : ""}
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {auctions.map((auction) => (
              <AdminAuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function AdminAuctionCard({ auction }: { auction: Auction }) {
  const primaryImage =
    auction.images?.find((i) => i.isPrimary)?.url ||
    auction.images?.[0]?.url ||
    "/car-placeholder.jpg";
  const [imgSrc, setImgSrc] = useState(primaryImage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE": return "bg-green-500/20 text-green-400 border-green-500/40";
      case "SCHEDULED": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "CLOSED": return "bg-gray-500/20 text-gray-400 border-gray-500/40";
      case "CANCELLED": return "bg-red-500/20 text-red-400 border-red-500/40";
      default: return "bg-amber-500/20 text-amber-400 border-amber-500/40"; // DRAFT
    }
  };

  const currentHighest = auction.currentHighestBid ? parseFloat(auction.currentHighestBid) : 0;

  return (
    <Link
      href={`/admin/auctions/${auction.id}`}
      className="group panel border-white/5 overflow-hidden flex flex-col bg-white/[0.02] hover:bg-white/[0.04] transition-all relative"
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
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest backdrop-blur-md border ${getStatusColor(auction.status)}`}>
            {auction.status.toUpperCase()}
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
            <h4 className="font-bold text-white text-lg tracking-tight truncate">{auction.year} {auction.make} {auction.model}</h4>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase truncate mt-1">
                {auction.title}
            </p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
            <div className="flex items-baseline justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Highest Bid</span>
                  <span className="text-2xl font-bold tracking-tight text-white">{auction.currency} {currentHighest.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Bids</span>
                  <span className="text-lg font-bold text-cyan-400">{auction._count?.bids || 0}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">
                      Starts: {new Date(auction.startAt).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">
                      Ends: {new Date(auction.endAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex items-center pt-2">
            <div className="flex-1 h-10 rounded-xl glass border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all group/btn">
                Manage Auction <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </div>
        </div>
      </div>
    </Link>
  );
}
