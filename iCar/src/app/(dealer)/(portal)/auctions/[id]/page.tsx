"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Clock, Info, AlertTriangle, CheckCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";

export default function DealerAuctionBiddingPage() {
  const { id } = useParams();
  const pathname = usePathname();
  const isUserPortal = pathname.startsWith("/user/");
  const backHref = isUserPortal ? "/user/auctions" : "/auctions";
  const [auction, setAuction] = useState<any>(null);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [activeImage, setActiveImage] = useState<string>("");

  const fetchAuction = async () => {
    try {
      const res = await fetch(`/api/dealer/auctions/${id}`);
      const data = await res.json();
      if (data.auction) {
        setAuction(data.auction);
        setMyBids(data.myBids || []);
        if (!bidAmount) {
          setBidAmount(data.auction.minNextBid.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuction();

    const interval = setInterval(() => {
      if (auction?.status === "LIVE" || auction?.status === "SCHEDULED") {
        fetchAuction();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, auction?.status]);

  useEffect(() => {
    if (!auction) {
      setLoading(false);
      return;
    }

    if (auction.images && auction.images.length > 0) {
      const primary = auction.images.find((i: any) => i.isPrimary) || auction.images[0];
      if (!activeImage) setActiveImage(primary.url);
    } else {
      if (!activeImage) setActiveImage("/car-placeholder.jpg");
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      let target = 0;
      if (auction.status === "SCHEDULED") target = new Date(auction.startAt).getTime();
      else if (auction.status === "LIVE") target = new Date(auction.endAt).getTime();
      else {
        setTimeLeft("Auction Ended");
        clearInterval(timer);
        return;
      }

      const distance = target - now;
      if (distance < 0) {
        setTimeLeft(auction.status === "SCHEDULED" ? "Starting soon..." : "Ending soon...");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction]);

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidding(true);
    setError("");

    try {
      const res = await fetch(`/api/dealer/auctions/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: bidAmount }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to place bid");
      }

      // Success
      setBidAmount("");
      fetchAuction();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBidding(false);
    }
  };

  if (loading || !auction) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`h-10 w-10 animate-spin ${isUserPortal ? "text-violet-400" : "text-cyan-500"}`} />
      </div>
    );
  }

  const currentHighest = auction.currentHighestBid ? parseFloat(auction.currentHighestBid) : 0;
  const isWinning = myBids.length > 0 && myBids[0].status === "winning";
  const isOutbid = myBids.length > 0 && myBids[0].status === "outbid";
  const isActive = myBids.length > 0 && myBids[0].status === "active";

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={backHref}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Breadcrumb pageName="Live Auction" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="panel border-white/5 bg-white/[0.02] overflow-hidden rounded-2xl">
            <div className="relative aspect-video w-full bg-black/50">
              <Image src={activeImage || "/car-placeholder.jpg"} alt={auction.title || "Vehicle"} fill className="object-cover" />
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest backdrop-blur-md border ${
                  auction.status === "LIVE" ? "bg-green-500/80 text-white border-green-400" :
                  auction.status === "SCHEDULED" ? "bg-blue-500/80 text-white border-blue-400" :
                  "bg-gray-500/80 text-white border-gray-400"
                }`}>
                  {auction.status === "LIVE" ? "LIVE NOW" : auction.status}
                </span>
              </div>
            </div>

            {auction.images && auction.images.length > 1 && (
              <div className="flex gap-3 p-4 bg-black/20 overflow-x-auto custom-scrollbar">
                {auction.images.map((img: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImage(img.url)}
                    className={`relative w-24 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shrink-0 ${activeImage === img.url ? 'border-cyan-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <Image src={img.url} alt={`Thumbnail ${idx}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{auction.year} {auction.make} {auction.model} {auction.variant}</h1>
              <p className="text-gray-400 text-sm mb-6">{auction.region} • {auction.city}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Mileage</span>
                  <span className="text-white font-semibold">{auction.mileage.toLocaleString()} KM</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Starting Bid</span>
                  <span className="text-white font-semibold">{parseFloat(auction.startingBid).toLocaleString()} {auction.currency}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Start Time</span>
                  <span className="text-white font-semibold text-sm">{new Date(auction.startAt).toLocaleString()}</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">End Time</span>
                  <span className="text-white font-semibold text-sm">{new Date(auction.endAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-3">Description</h3>
                <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{auction.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Bidding Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            
            {/* Timer */}
            <div className="flex flex-col items-center justify-center py-4 border-b border-white/10 mb-6">
              <span className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                {auction.status === "SCHEDULED" ? "Starts In" : auction.status === "LIVE" ? "Ends In" : "Status"}
              </span>
              <div className="text-3xl font-mono font-bold text-cyan-400 flex items-center gap-2">
                {auction.status !== "CLOSED" && auction.status !== "CANCELLED" && <Clock className="h-6 w-6" />}
                {timeLeft}
              </div>
            </div>

            {/* Current Bid */}
            <div className="mb-8">
              <span className="text-sm text-gray-400 block mb-1">Current Highest Bid</span>
              <div className="text-4xl font-bold text-white tracking-tight">
                {currentHighest > 0 ? `${currentHighest.toLocaleString()} ${auction.currency}` : "No Bids"}
              </div>
              {isActive && <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold"><CheckCircle className="h-3.5 w-3.5" /> You are the highest bidder!</div>}
              {isOutbid && <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold"><AlertTriangle className="h-3.5 w-3.5" /> You have been outbid!</div>}
              {isWinning && <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">🎉 You won this auction!</div>}
            </div>

            {/* Bid Form */}
            {auction.status === "LIVE" && (
              <form onSubmit={handleBid} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Your Bid Amount ({auction.currency})</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={auction.minNextBid}
                      step={auction.minIncrement}
                      className="w-full bg-black/20 border border-cyan-500/30 rounded-xl px-4 py-4 text-xl text-white font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-mono">
                      Min: {auction.minNextBid.toLocaleString()}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Min increment is {parseFloat(auction.minIncrement).toLocaleString()} {auction.currency}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={bidding || isActive}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex justify-center items-center gap-2
                    bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bidding ? <Loader2 className="h-6 w-6 animate-spin" /> : "Place Bid"}
                </button>
              </form>
            )}

            {auction.status === "SCHEDULED" && (
              <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400">
                Bidding has not started yet.
              </div>
            )}

            {auction.status === "CLOSED" && (
              <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400">
                This auction is closed.
              </div>
            )}
          </div>

          {/* My Bid History */}
          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">My Bids</h3>
            {myBids.length === 0 ? (
              <p className="text-gray-500 text-sm">You haven't placed any bids.</p>
            ) : (
              <div className="space-y-3">
                {myBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                    <div>
                      <div className="font-bold text-white">{parseFloat(bid.amount).toLocaleString()} {bid.currency}</div>
                      <div className="text-xs text-gray-500">{new Date(bid.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest ${
                      bid.status === 'active' || bid.status === 'winning' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {bid.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
