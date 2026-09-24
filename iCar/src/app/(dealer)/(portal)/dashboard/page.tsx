"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Car, Sparkles,
  ArrowUpRight, MapPin, Gauge, Calendar, Eye, Activity,
  PlusCircle, Edit2, Trash2, Loader2, CheckCircle, AlertCircle
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { AnimatedNumber } from "@/components/ui/animated-number";
import ListingEditModal, {
  type DealerListing,
  type ListingEditForm,
  listingToEditForm,
} from "@/components/dealer/ListingEditModal";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface Listing extends DealerListing {
  createdAt: string;
  images: ListingImage[];
}

export default function DealerDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState<ListingEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dealer/listings');
      const data = await res.json();
      if (data.success) setListings(data.listings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const openEdit = (l: Listing) => {
    setEditTarget(l);
    setEditForm(listingToEditForm(l));
  };

  const handleToggleStatus = async (listing: Listing) => {
    if (listing.status === "SOLD" || listing.status === "EXPIRED") {
      showToast("Cannot toggle sold or expired listings", "error");
      return;
    }

    const nextStatus = listing.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setToggling(listing.id);
    try {
      const res = await fetch(`/api/dealer/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, toggleStatus: true }),
      });
      const data = await res.json();
      if (data.success) {
        setListings((prev) => prev.map((l) => (l.id === listing.id ? data.listing : l)));
        showToast(
          nextStatus === "ACTIVE" ? "Listing is now active" : "Listing is now inactive",
          "success"
        );
      } else {
        showToast(data.message || "Failed to update status", "error");
      }
    } finally {
      setToggling(null);
    }
  };

  const handleSave = async () => {
    if (!editTarget || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dealer/listings/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setListings(prev => prev.map(l => l.id === editTarget.id ? data.listing : l));
        setEditTarget(null);
        setEditForm(null);
        showToast("Listing updated!", "success");
      } else {
        showToast(data.message || "Update failed", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/dealer/listings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setListings(prev => prev.filter(l => l.id !== id));
        showToast("Listing deleted", "success");
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } finally {
      setDeleting(null);
    }
  };

  const activeListings = listings.filter(l => l.status === 'ACTIVE');
  const totalValue = activeListings.reduce((sum, l) => sum + l.price, 0);

  // Real dashboard analytics derived from the dealer's own listings
  // (replaces the previous hardcoded mock activity/trend data).
  const { trendData, activityFeed, addedLast7, avgDaysListed } = useMemo(() => {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();

    // 12 rolling month buckets ending with the current month.
    const buckets = Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      return {
        month: MONTHS[d.getMonth()],
        start: d.getTime(),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
        added: 0,
      };
    });

    for (const l of listings) {
      const t = new Date(l.createdAt).getTime();
      const b = buckets.find(bk => t >= bk.start && t < bk.end);
      if (b) b.added += 1;
    }

    const trend = buckets.map(b => ({
      month: b.month,
      added: b.added,
      // cumulative inventory: listings created on or before the end of this month
      total: listings.filter(l => new Date(l.createdAt).getTime() < b.end).length,
    }));

    const feed = [...listings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        type: l.status === 'ACTIVE' ? 'valuation' : 'edit',
        text: `${l.make} ${l.model} ${l.year} · ${l.currency} ${l.price.toLocaleString()}`,
        time: relativeTime(l.createdAt),
      }));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const added7 = listings.filter(l => new Date(l.createdAt).getTime() >= weekAgo).length;

    const active = listings.filter(l => l.status === 'ACTIVE');
    const avgDays = active.length
      ? Math.round(active.reduce((s, l) => s + (Date.now() - new Date(l.createdAt).getTime()) / 86_400_000, 0) / active.length)
      : 0;

    return { trendData: trend, activityFeed: feed, addedLast7: added7, avgDaysListed: avgDays };
  }, [listings]);

  const inactiveCount = listings.length - activeListings.length;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* HERO INTELLIGENCE PANEL */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-[#07162b]/90 via-[#040e1d]/95 to-[#020712] p-6 md:p-10 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8)]"
      >
        {/* Luminous top border accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-teal-400 pointer-events-none" />
        
        {/* Radial Ambient Glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />

        {/* Micro cyber grid */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          {/* Left — Welcome & Action CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-300 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                LIVE MATRIX FEED · 2.4 GHZ
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Dealer Command <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Automotive Intelligence
                </span>
              </h1>
              <p className="text-slate-400 mt-3 max-w-lg text-sm leading-relaxed">
                {loading
                  ? "Synchronizing dealership matrix data…"
                  : listings.length === 0
                    ? "Portfolio empty — activate your first live appraisal or vehicle listing."
                    : <>You have <span className="text-cyan-300 font-semibold">{activeListings.length} active</span> {activeListings.length === 1 ? "asset" : "assets"} deployed across regional markets
                      {addedLast7 > 0 ? <> · <span className="text-teal-300 font-medium">+{addedLast7} newly indexed</span> this week</> : null}.</>}
              </p>
            </div>

            <div className="flex flex-wrap gap-3.5">
              <Link href="/list-vehicle">
                <button className="h-11 px-6 rounded-xl cyber-btn-primary flex items-center gap-2.5 font-bold transition-all text-sm">
                  <Sparkles className="h-4 w-4" /> AI List Vehicle
                </button>
              </Link>
              <Link href="/listings">
                <button className="h-11 px-6 rounded-xl cyber-btn-secondary flex items-center gap-2 font-semibold transition-all text-sm">
                  View Full Inventory <ArrowUpRight className="h-4 w-4 text-cyan-400" />
                </button>
              </Link>
            </div>
          </div>

          {/* Right — Telemetry KPI Cluster */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
            <HeroKpi 
              label="ACTIVE ASSETS" 
              value={loading ? 0 : activeListings.length} 
              delta={addedLast7 > 0 ? `+${addedLast7} this week` : "Stable"} 
              trend="up" 
            />
            <HeroKpi 
              label="PORTFOLIO VALUE" 
              value={loading ? 0 : totalValue} 
              prefix="AED " 
              delta={activeListings.length > 0 ? `${activeListings.length} listed` : "0 listed"} 
              trend="up" 
            />
            <HeroKpi 
              label="TOTAL INDEXED" 
              value={loading ? 0 : listings.length} 
              delta={inactiveCount > 0 ? `${inactiveCount} drafts` : "All active"} 
              trend="up" 
            />
            <HeroKpi 
              label="AVG. DAYS ON LOT" 
              value={loading ? 0 : avgDaysListed} 
              suffix="d" 
              delta="Real-time" 
              trend="up" 
            />
          </div>
        </div>
      </motion.section>

      {/* FLOATING ANALYTICS — asymmetric grid */}
      <section className="grid grid-cols-12 gap-5 md:gap-6">
        {/* Big Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1, duration: 0.4 }}
          className="col-span-12 lg:col-span-8 rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-[#061426]/80 to-[#030a14]/90 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-[0.25em] text-cyan-400 uppercase font-semibold">TELEMETRY</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">12-MONTH TRAJECTORY</span>
              </div>
              <h3 className="text-xl font-bold mt-1 text-white tracking-tight">Inventory Growth Dynamics</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Added
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" /> Total Portfolio
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyberG1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cyberG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#061527",
                    borderColor: "rgba(34,211,238,0.3)",
                    borderRadius: "0.75rem",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                  }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Area type="monotone" dataKey="added" stroke="#22d3ee" strokeWidth={2.5} fill="url(#cyberG1)" dot={false} />
                <Area type="monotone" dataKey="total" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#cyberG2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Real-time Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15, duration: 0.4 }}
          className="col-span-12 lg:col-span-4 rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-[#061426]/80 to-[#030a14]/90 p-6 flex flex-col backdrop-blur-xl shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[9px] tracking-[0.25em] text-cyan-400 uppercase font-semibold">FEED</p>
              <h3 className="text-lg font-bold mt-0.5 text-white tracking-tight">Dealership Telemetry</h3>
            </div>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] no-scrollbar">
            {activityFeed.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  {loading ? "Acquiring telemetry data…" : "No active events logged"}
                </p>
              </div>
            )}
            {activityFeed.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
              >
                <div className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 transition-all group-hover:scale-125 ${
                  a.type === "valuation" ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : a.type === "alert" ? "bg-teal-400 shadow-[0_0_10px_#2dd4bf]" : "bg-blue-400 shadow-[0_0_10px_#60a5fa]"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-slate-300 group-hover:text-white transition-colors font-medium">{a.text}</p>
                  <p className="text-[10px] font-mono text-slate-500 tracking-wider mt-1 uppercase">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FEATURED INVENTORY SHOWCASE */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-mono text-[9px] tracking-[0.25em] text-cyan-400 uppercase font-semibold">CATALOG</span>
            <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Active Showroom Matrix</h2>
          </div>
          <Link href="/listings" className="text-xs font-mono tracking-wider text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 uppercase font-semibold transition-colors">
            Access Full Matrix <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="size-10 text-cyan-400 animate-spin" />
            <p className="font-mono text-xs text-slate-500 tracking-wider uppercase">Loading inventory records...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cyan-500/20 bg-[#061426]/40 p-12 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
              <Car className="size-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No Vehicles Currently Listed</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Your dealership lot is ready. Launch the AI-powered appraisal wizard to price and publish your initial inventory.
            </p>
            <Link href="/list-vehicle">
               <button className="px-6 py-3 cyber-btn-primary rounded-xl font-bold transition-all text-sm flex items-center gap-2 mx-auto">
                <PlusCircle className="size-4" /> Initialize Vehicle Listing
               </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((l, i) => (
              <VehicleCard 
                key={l.id} 
                v={l} 
                delay={i * 0.04} 
                onEdit={() => openEdit(l)}
                onToggleStatus={() => handleToggleStatus(l)}
                onDelete={() => handleDelete(l.id)}
                deleting={deleting === l.id}
                toggling={toggling === l.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success'
            ? 'bg-[#061f1b]/95 border-teal-500/30 text-teal-300 shadow-[0_10px_30px_rgba(20,184,166,0.2)]'
            : 'bg-[#220c14]/95 border-rose-500/30 text-rose-300 shadow-[0_10px_30px_rgba(244,63,94,0.2)]'
          }`}>
          {toast.type === 'success'
            ? <CheckCircle className="size-4 text-teal-400" />
            : <AlertCircle className="size-4 text-rose-400" />}
          <span className="font-semibold text-xs tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && editForm && (
        <ListingEditModal
          listing={editTarget}
          form={editForm}
          saving={saving}
          onClose={() => {
            setEditTarget(null);
            setEditForm(null);
          }}
          onSave={handleSave}
          onChange={setEditForm}
        />
      )}
    </div>
  );
}

function HeroKpi({ label, value, delta, trend, prefix, suffix }: any) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden group transition-all duration-300 border border-cyan-500/15 bg-gradient-to-br from-[#081b33]/70 to-[#040e1d]/90 hover:border-cyan-400/40 shadow-lg">
      {/* Specular top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
      
      <p className="font-mono text-[9px] font-semibold tracking-[0.25em] text-slate-400 mb-2 uppercase">{label}</p>
      <p className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      {delta ? (
        <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
          trend === "up" ? "text-cyan-300 bg-cyan-500/10 border border-cyan-400/20" : "text-rose-400 bg-rose-500/10 border border-rose-400/20"
        }`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      ) : null}
      <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

function VehicleCard({ v, delay, onEdit, onToggleStatus, onDelete, deleting, toggling }: any) {
  const primaryImage = v.images?.find((i: any) => i.isPrimary)?.url || v.images?.[0]?.url || '/car-placeholder.jpg';
  const isActive = v.status === 'ACTIVE';
  const canToggle = v.status === 'ACTIVE' || v.status === 'DRAFT';
  const [imgSrc, setImgSrc] = useState(primaryImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group rounded-2xl overflow-hidden border border-cyan-500/15 bg-gradient-to-b from-[#07192e]/80 via-[#051324]/90 to-[#020914] hover:border-cyan-400/40 transition-all duration-300 shadow-lg hover:shadow-[0_12px_36px_rgba(0,0,0,0.7)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#030914]">
        <Image
          src={imgSrc}
          alt={`${v.make} ${v.model}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-108"
          onError={() => setImgSrc('/car-placeholder.jpg')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#051324] via-transparent to-black/40 pointer-events-none" />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-semibold backdrop-blur-md border ${
            v.status === "ACTIVE"
              ? "bg-teal-500/20 text-teal-300 border-teal-400/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
              : "bg-slate-800/80 text-slate-400 border-white/10"
          }`}>
            {v.status === "DRAFT" ? "INACTIVE" : v.status.toUpperCase()}
          </span>
        </div>
        
        {/* Action Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="h-8 w-8 rounded-lg bg-[#051324]/90 border border-white/15 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-400/40 text-slate-200 hover:text-cyan-300 transition-all"
                title="Edit Listing"
            >
                <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                disabled={deleting}
                className="h-8 w-8 rounded-lg bg-[#051324]/90 border border-white/15 flex items-center justify-center hover:bg-rose-500/20 hover:border-rose-400/40 text-slate-200 hover:text-rose-400 transition-all disabled:opacity-50"
                title="Delete Listing"
            >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <h4 className="font-bold text-sm tracking-tight truncate text-white drop-shadow-md">{v.make} {v.model}</h4>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Price & view */}
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold tracking-tight text-white font-sans">
            <span className="text-xs text-cyan-400 mr-1 font-mono font-normal">{v.currency}</span>
            {v.price.toLocaleString()}
          </span>
          <Link href={`/listings/${v.id}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="text-slate-400 hover:text-cyan-300 transition-colors p-1.5 rounded-lg hover:bg-cyan-500/10">
                <Eye className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Status Toggle Switch */}
        {canToggle && (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isActive ? "text-teal-300" : "text-slate-500"}`}>
              {isActive ? "LIVE ONLINE" : "OFFLINE DRAFT"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              disabled={toggling}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                isActive ? "bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        {/* Specs Pill Row */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/[0.06]">
          <span className="flex items-center gap-1 text-slate-400">
            <Calendar className="h-3 w-3 text-cyan-400" /> {v.year}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Gauge className="h-3 w-3 text-cyan-400" /> {(v.mileage / 1000).toFixed(0)}k km
          </span>
          <span className="flex items-center gap-1 text-slate-400 truncate max-w-[80px]">
            <MapPin className="h-3 w-3 text-cyan-400 shrink-0" /> {v.city}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

