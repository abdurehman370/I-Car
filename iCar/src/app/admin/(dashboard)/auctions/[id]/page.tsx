"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Play, XCircle, CheckCircle, Clock, Monitor, Copy, Gavel, Pencil, Trash2, Rocket, StopCircle } from "lucide-react";
import { formatAuctionDateTime, getAuctionTimezoneLabel } from "@/lib/auction-datetime";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  SCHEDULED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  LIVE: "bg-red-500/15 text-red-400 border-red-500/40",
  CLOSED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/30",
};

const BTN = "h-11 px-5 rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

export default function AdminAuctionMonitorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // Floor bid entry (physical auction operator)
  const [floorAmount, setFloorAmount] = useState("");
  const [floorPaddle, setFloorPaddle] = useState("");
  const [floorSubmitting, setFloorSubmitting] = useState(false);
  const [floorError, setFloorError] = useState("");
  const [floorSuccess, setFloorSuccess] = useState("");
  const [copied, setCopied] = useState(false);

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
    }, auction?.status === "LIVE" ? 2000 : 5000);

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

  const minNextBid = auction
    ? (auction.currentHighestBid
      ? Number(auction.currentHighestBid) + Number(auction.minIncrement)
      : Number(auction.startingBid))
    : 0;

  const handleFloorBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setFloorError("");
    setFloorSuccess("");
    const amount = parseFloat(floorAmount);
    if (isNaN(amount) || amount <= 0) {
      setFloorError("Enter a valid amount");
      return;
    }
    setFloorSubmitting(true);
    try {
      const res = await fetch(`/api/admin/auctions/${id}/floor-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paddleNumber: floorPaddle || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFloorError(data.error || "Failed to record floor bid");
      } else {
        setFloorSuccess(
          `Recorded ${amount.toLocaleString()} ${auction.currency}` +
          (floorPaddle ? ` — Paddle ${floorPaddle}` : "") +
          (data.extended ? " · time extended" : "")
        );
        setFloorAmount("");
        fetchAuction();
        fetchBids();
        setTimeout(() => setFloorSuccess(""), 4000);
      }
    } catch {
      setFloorError("An error occurred");
    } finally {
      setFloorSubmitting(false);
    }
  };

  const displayUrl = auction?.displayToken
    ? `/auction-display/${id}?token=${auction.displayToken}`
    : null;

  const copyDisplayUrl = async () => {
    if (!displayUrl) return;
    const absoluteUrl = `${window.location.origin}${displayUrl}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(absoluteUrl);
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
      {/* ── Header ── */}
      <div className="mb-8 space-y-5">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/auctions"
            className="mt-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 transition-all shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white truncate">
                {auction.title}
              </h1>
              <span className={`px-3 py-1 rounded-full border text-[11px] font-black tracking-[0.2em] uppercase inline-flex items-center gap-2 shrink-0 ${STATUS_STYLES[auction.status] ?? STATUS_STYLES.DRAFT}`}>
                {auction.status === "LIVE" && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                {auction.status}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-gray-500 uppercase tracking-[0.25em]">
              Lot #{auction.id} · {auction.auctionType || "ONLINE"} Auction{auction.venue ? ` · ${auction.venue}` : ""}
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {displayUrl && (
            <div className="flex items-center rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BTN} rounded-none bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25`}
              >
                <Monitor className="h-4 w-4" /> Big Screen
              </a>
              <button
                onClick={copyDisplayUrl}
                title="Copy display link"
                className="h-11 px-3.5 bg-cyan-500/10 text-cyan-400/80 hover:bg-cyan-500/20 hover:text-cyan-300 border-l border-cyan-500/20 transition-all"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          {auction.status === "DRAFT" && (
            <>
              <Link href={`/admin/auctions/${id}/edit`} className={`${BTN} bg-white/[0.06] border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <button onClick={() => handleAction('publish', 'Publish')} disabled={!!actionLoading} className={`${BTN} bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:brightness-110 shadow-lg shadow-cyan-500/25`}>
                {actionLoading === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publish
              </button>
            </>
          )}

          {auction.status === "SCHEDULED" && (
            <button onClick={() => handleAction('start', 'Start')} disabled={!!actionLoading} className={`${BTN} bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-500/25`}>
              {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Force Start
            </button>
          )}

          {(auction.status === "LIVE" || auction.status === "SCHEDULED") && (
            <>
              <button onClick={() => handleAction('close', 'Close')} disabled={!!actionLoading} className={`${BTN} bg-white/[0.06] border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white`}>
                {actionLoading === 'close' ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />} Close Now
              </button>
              <button onClick={() => handleAction('cancel', 'Cancel')} disabled={!!actionLoading} className={`${BTN} bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10`}>
                {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel
              </button>
            </>
          )}

          <div className="flex-1" />

          <button onClick={handleDelete} disabled={!!actionLoading} className={`${BTN} bg-transparent border border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:text-red-400`}>
            {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-1">
              {auction.currentHighestBid ? "Current Highest Bid" : "Awaiting First Bid"}
            </p>
            <p className="text-3xl xl:text-4xl font-black tracking-tight text-white tabular-nums">
              {auction.currentHighestBid
                ? <><span className="text-lg text-gray-500 mr-2">{auction.currency}</span>{Number(auction.currentHighestBid).toLocaleString()}</>
                : <span className="text-gray-500">—</span>}
            </p>
            {auction.status === "LIVE" && (
              <p className="mt-2 text-sm text-gray-400">
                Next bid: <span className="text-cyan-400 font-bold">{minNextBid.toLocaleString()} {auction.currency}</span>
              </p>
            )}
            {auction.outcome && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">Outcome</span>
                <span className={`text-sm font-black tracking-wide ${auction.outcome === 'sold' ? 'text-green-400' : 'text-amber-400'}`}>
                  {auction.outcome.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-4 border-b border-white/10 pb-3">Auction Details</p>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Type</span><span className="text-white font-bold">{auction.auctionType || "ONLINE"}</span></div>
              {auction.venue && (
                <div className="flex justify-between gap-4"><span className="text-gray-500">Venue</span><span className="text-white font-semibold text-right">{auction.venue}</span></div>
              )}
              <div className="flex justify-between gap-4"><span className="text-gray-500">Start</span><span className="text-white font-semibold text-right">{formatAuctionDateTime(auction.startAt, auction.region)} <span className="text-gray-500 text-xs font-normal">({getAuctionTimezoneLabel(auction.region)})</span></span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">End</span><span className="text-white font-semibold text-right">{formatAuctionDateTime(auction.endAt, auction.region)} <span className="text-gray-500 text-xs font-normal">({getAuctionTimezoneLabel(auction.region)})</span></span></div>
              <div className="h-px bg-white/5 my-1" />
              <div className="flex justify-between gap-4"><span className="text-gray-500">Starting Bid</span><span className="text-white font-bold tabular-nums">{Number(auction.startingBid).toLocaleString()} {auction.currency}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Reserve Price</span><span className="text-white font-bold tabular-nums">{auction.reservePrice ? `${Number(auction.reservePrice).toLocaleString()} ${auction.currency}` : "None"}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Min Increment</span><span className="text-white font-bold tabular-nums">{Number(auction.minIncrement).toLocaleString()} {auction.currency}</span></div>
            </div>
          </div>
        </div>

        {/* Bids Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floor Bid Entry — physical auction operator console */}
          {auction.status === "LIVE" && (
            <div className="panel border-amber-500/20 bg-amber-500/[0.04] p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Gavel className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Floor Bid Entry</h3>
                <span className="ml-auto text-xs text-gray-400">
                  Min next bid: <span className="text-amber-400 font-bold">{minNextBid.toLocaleString()} {auction.currency}</span>
                </span>
              </div>
              <form onSubmit={handleFloorBid} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="any"
                    value={floorAmount}
                    onChange={(e) => setFloorAmount(e.target.value)}
                    placeholder={`Amount (${auction.currency})`}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <input
                  value={floorPaddle}
                  onChange={(e) => setFloorPaddle(e.target.value)}
                  placeholder="Paddle #"
                  className="w-full sm:w-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={floorSubmitting}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {floorSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Gavel className="h-4 w-4" /> Record Bid</>}
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mt-3">
                {[1, 2, 5].map((mult) => {
                  const quick = minNextBid + (mult - 1) * Number(auction.minIncrement);
                  return (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setFloorAmount(String(quick))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                    >
                      {quick.toLocaleString()}
                    </button>
                  );
                })}
              </div>
              {floorError && <p className="mt-3 text-sm text-red-400 font-semibold">{floorError}</p>}
              {floorSuccess && <p className="mt-3 text-sm text-green-400 font-semibold">✓ {floorSuccess}</p>}
            </div>
          )}

          <div className="panel border-white/5 bg-white/[0.02] p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">Bid History</p>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 tabular-nums">
                {bids.length} bid{bids.length === 1 ? "" : "s"}
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                  <Clock className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-semibold text-gray-400">No bids have been placed yet</p>
                <p className="text-xs text-gray-500 mt-1">Bids from dealers and the floor will appear here in real time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Time</th>
                      <th className="pb-3 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Bidder</th>
                      <th className="pb-3 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Amount</th>
                      <th className="pb-3 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Status</th>
                      <th className="pb-3 font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bids.map((bid) => (
                      <tr key={bid.id} className="text-gray-300 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 font-mono text-xs text-gray-400 tabular-nums whitespace-nowrap">{new Date(bid.createdAt).toLocaleTimeString()}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-widest shrink-0 border ${
                              bid.source === 'floor'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
                            }`}>
                              {bid.source === 'floor' ? 'Floor' : 'Online'}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-white font-bold truncate">{bid.bidderName}</span>
                              <span className="text-[11px] text-gray-500 truncate">{bid.source === 'floor' ? (bid.paddleNumber ? `Paddle ${bid.paddleNumber}` : 'In-room bidder') : bid.bidderEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-black text-base text-cyan-400 tabular-nums whitespace-nowrap">
                          {Number(bid.amount).toLocaleString()} <span className="text-xs font-bold text-cyan-400/60">{bid.currency}</span>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-1 rounded-md text-[9px] uppercase font-black tracking-widest border ${
                            bid.status === 'winning' ? 'bg-green-500/15 text-green-400 border-green-500/25'
                              : bid.status === 'active' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25'
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          }`}>
                            {bid.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {auction.status !== "CLOSED" && auction.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleAwardBid(bid.id, bid.bidderName)}
                              disabled={!!actionLoading}
                              className="px-3.5 py-2 rounded-lg bg-transparent border border-green-500/40 text-green-400 hover:bg-green-500/15 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                              {actionLoading === `award-${bid.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Gavel className="h-3.5 w-3.5" /> Award</>}
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
