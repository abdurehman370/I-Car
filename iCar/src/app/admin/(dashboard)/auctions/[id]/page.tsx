"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Play, XCircle, CheckCircle, Clock } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { formatAuctionDateTime, getAuctionTimezoneLabel } from "@/lib/auction-datetime";

export default function AdminAuctionMonitorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const fetchAuction = async () => {
    try {
      const res = await fetch(`/api/admin/auctions/${id}`);
      const data = await res.json();
      if (data.auction) {
        setAuction(data.auction);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBids = async () => {
    try {
      const res = await fetch(`/api/admin/auctions/${id}/bids`);
      const data = await res.json();
      if (data.bids) {
        setBids(data.bids);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const interval = setInterval(() => {
      if (auction?.status === "LIVE" || auction?.status === "SCHEDULED") {
        fetchAuction();
        fetchBids();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, auction?.status]);

  useEffect(() => {
    if (!auction) {
      setLoading(false);
    }
  }, [auction]);

  const handleAction = async (actionPath: string, actionName: string) => {
    if (!confirm(`Are you sure you want to ${actionName} this auction?`)) return;
    setActionLoading(actionPath);
    try {
      const res = await fetch(`/api/admin/auctions/${id}/${actionPath}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchAuction();
        fetchBids();
      } else {
        alert(data.error || `Failed to ${actionName}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this auction? This action cannot be undone.")) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/admin/auctions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        router.push("/admin/auctions");
      } else {
        alert(data.error || "Failed to delete auction");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the auction.");
    } finally {
      setActionLoading("");
    }
  };

  const handleAwardBid = async (bidId: string, bidderName: string) => {
    if (!confirm(`Are you sure you want to award this auction to ${bidderName}? This will close the auction immediately.`)) return;
    setActionLoading(`award-${bidId}`);
    try {
      const res = await fetch(`/api/admin/auctions/${id}/award`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId })
      });
      const data = await res.json();
      if (res.ok) {
        fetchAuction();
        fetchBids();
      } else {
        alert(data.error || "Failed to award bid");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while awarding the bid.");
    } finally {
      setActionLoading("");
    }
  };

  if (loading || !auction) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/auctions"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Breadcrumb pageName={`Auction: ${auction.title}`} />
        </div>

        <div className="flex items-center gap-2">
          {auction.status === "DRAFT" && (
            <>
              <Link href={`/admin/auctions/${id}/edit`} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors">Edit</Link>
              <button onClick={() => handleAction('publish', 'Publish')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-colors">
                Publish
              </button>
            </>
          )}
          {auction.status === "SCHEDULED" && (
            <>
              <button onClick={() => handleAction('start', 'Start')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold transition-colors">
                Force Start
              </button>
            </>
          )}
          {(auction.status === "LIVE" || auction.status === "SCHEDULED") && (
            <>
              <button onClick={() => handleAction('cancel', 'Cancel')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={() => handleAction('close', 'Close')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-gray-500 hover:bg-gray-400 text-white font-semibold transition-colors">
                Close Now
              </button>
            </>
          )}
          <button onClick={handleDelete} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors ml-1">
            {actionLoading === 'delete' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Current Status</span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold tracking-widest bg-cyan-500/20 text-cyan-400">
                  {auction.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Highest Bid</span>
                <span className="text-xl font-bold text-white">
                  {auction.currentHighestBid ? `${auction.currentHighestBid} ${auction.currency}` : "No Bids"}
                </span>
              </div>
              {auction.outcome && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Outcome</span>
                  <span className="text-sm font-bold text-white">{auction.outcome.replace('_', ' ').toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Start Time</span><span className="text-white">{formatAuctionDateTime(auction.startAt, auction.region)} <span className="text-gray-500 text-xs">({getAuctionTimezoneLabel(auction.region)})</span></span></div>
              <div className="flex justify-between"><span className="text-gray-400">End Time</span><span className="text-white">{formatAuctionDateTime(auction.endAt, auction.region)} <span className="text-gray-500 text-xs">({getAuctionTimezoneLabel(auction.region)})</span></span></div>
              <div className="flex justify-between"><span className="text-gray-400">Starting Bid</span><span className="text-white">{auction.startingBid} {auction.currency}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Reserve Price</span><span className="text-white">{auction.reservePrice ? `${auction.reservePrice} ${auction.currency}` : "None"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Min Increment</span><span className="text-white">{auction.minIncrement} {auction.currency}</span></div>
            </div>
          </div>
        </div>

        {/* Bids Card */}
        <div className="lg:col-span-2">
          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl h-full min-h-[500px]">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Bid History ({bids.length})</h3>
            
            {bids.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>No bids have been placed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400 border-b border-white/5">
                    <tr>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Bidder</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bids.map((bid) => (
                      <tr key={bid.id} className="text-gray-300">
                        <td className="py-3">{new Date(bid.createdAt).toLocaleTimeString()}</td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{bid.bidderName}</span>
                            <span className="text-xs text-gray-500">{bid.bidderEmail}</span>
                          </div>
                        </td>
                        <td className="py-3 font-bold text-cyan-400">{bid.amount} {bid.currency}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest ${
                            bid.status === 'active' || bid.status === 'winning' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {bid.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {auction.status !== "CLOSED" && auction.status !== "CANCELLED" && (
                            <button 
                              onClick={() => handleAwardBid(bid.id, bid.bidderName)}
                              disabled={!!actionLoading}
                              className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-bold transition-colors disabled:opacity-50 inline-flex items-center"
                            >
                              {actionLoading === `award-${bid.id}` ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Award Winner'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
