"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Car, DollarSign, Bell, Sparkles,
  ArrowUpRight, MapPin, Gauge, Calendar, Eye, MoreHorizontal, Activity, Plus,
  PlusCircle, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, ChevronRight
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { AnimatedNumber } from "@/components/ui/animated-number";
import ListingEditModal, {
  type DealerListing,
  type ListingEditForm,
  listingToEditForm,
} from "@/components/dealer/ListingEditModal";
import { activity, trendData } from "@/lib/mock-data";

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

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
      {/* HERO INTELLIGENCE PANEL */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative panel-elevated border-luminous overflow-hidden"
      >
        <div className="absolute inset-0 bg-hero opacity-90" />
        <div className="absolute inset-0 bg-hud-grid opacity-30" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative p-6 md:p-10 grid lg:grid-cols-12 gap-8">
          {/* Left — welcome */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/30 text-[10px] font-mono tracking-[0.25em] text-primary mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-glow" />
                LIVE · MARKET FEED
              </span>
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight text-foreground">
                Welcome back,<br />
                <span className="text-gradient capitalize">Dealer</span>
              </h1>
              <p className="text-muted-foreground mt-3 max-w-lg text-sm">
                Your inventory is up <span className="text-success font-medium">12.4%</span> this week.
                3 new market matches arrived overnight.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/list-vehicle">
                <button className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black glow-primary hover:opacity-90 flex items-center gap-2 font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  <Sparkles className="h-4 w-4" /> AI List Vehicle
                </button>
              </Link>
              <Link href="/listings">
                <button className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center gap-2 font-semibold transition-all">
                  View Inventory <ArrowUpRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Right — hero KPI cluster */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <HeroKpi label="ACTIVE LISTINGS" value={loading ? 0 : activeListings.length} delta="+8" trend="up" />
            <HeroKpi label="PORTFOLIO VALUE" value={loading ? 0 : totalValue} prefix="AED " delta="+12.4%" trend="up" />
            <HeroKpi label="ALERTS TODAY" value={7} delta="3 new" trend="up" />
            <HeroKpi label="AVG. DAYS LISTED" value={18} suffix="d" delta="-3" trend="down" />
          </div>
        </div>
      </motion.section>

      {/* FLOATING ANALYTICS — asymmetric */}
      <section className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Big chart card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-8 panel border-luminous p-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Performance · 12M</p>
              <h3 className="text-xl font-semibold mt-1">Listings & Valuations</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Listings</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Valuations</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(188 95% 55%)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(188 95% 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(174 80% 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(174 80% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="listings" stroke="#22d3ee" strokeWidth={3} fill="url(#g1)" />
                <Area type="monotone" dataKey="valuations" stroke="#2dd4bf" strokeWidth={3} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="col-span-12 lg:col-span-4 panel border-luminous p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Real-Time</p>
              <h3 className="text-lg font-semibold mt-1">Activity</h3>
            </div>
            <Activity className="h-4 w-4 text-primary animate-glow" />
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] no-scrollbar">
            {activity.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 transition-all group-hover:scale-125 ${
                  a.type === "valuation" ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : a.type === "alert" ? "bg-teal-400 shadow-[0_0_8px_#2dd4bf]" : "bg-gray-500"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground/80 group-hover:text-foreground transition-colors">{a.text}</p>
                  <p className="text-[10px] font-mono text-gray-500 tracking-widest mt-0.5 uppercase">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FEATURED INVENTORY */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Showcase</p>
            <h2 className="text-2xl font-semibold mt-1">Your Inventory</h2>
          </div>
          <Link href="/listings" className="text-sm text-primary hover:text-accent flex items-center gap-1 font-medium transition-colors">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-10 text-cyan-500 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="panel border-luminous p-12 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Car className="size-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No listings yet</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Start building your inventory by listing your first vehicle.
            </p>
            <Link href="/list-vehicle">
               <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 mx-auto">
                <PlusCircle className="size-5" /> Start Listing
               </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {listings.map((l, i) => (
              <VehicleCard 
                key={l.id} 
                v={l} 
                delay={i * 0.05} 
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          {toast.type === 'success'
            ? <CheckCircle className="size-5" />
            : <AlertCircle className="size-5" />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

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
    <div className="relative panel p-4 overflow-hidden group hover:border-cyan-400/40 transition-all border border-white/10 shadow-lg shadow-black/20">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-gray-400 mb-2 uppercase">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-foreground group-hover:text-cyan-400 transition-colors">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-mono ${trend === "up" ? "text-cyan-400" : "text-red-400"}`}>
        {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {delta}
      </div>
      <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-cyan-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function VehicleCard({ v, delay, onEdit, onToggleStatus, onDelete, deleting, toggling }: any) {
  const primaryImage = v.images?.find((i: any) => i.isPrimary)?.url || v.images?.[0]?.url || '/car-placeholder.png';
  const isActive = v.status === 'ACTIVE';
  const canToggle = v.status === 'ACTIVE' || v.status === 'DRAFT';
  const [imgSrc, setImgSrc] = useState(primaryImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="group panel border-luminous overflow-hidden cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
        <Image
          src={imgSrc}
          alt={`${v.make} ${v.model}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgSrc('/car-placeholder.png')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-md text-[10px] font-mono tracking-widest backdrop-blur-md border ${
            v.status === "ACTIVE"
              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
              : "bg-gray-500/40 text-gray-400 border-white/10"
          }`}>
            {v.status === "DRAFT" ? "INACTIVE" : v.status.toUpperCase()}
          </span>
        </div>
        
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="h-8 w-8 rounded-lg glass-strong flex items-center justify-center hover:bg-cyan-500/20 text-white transition-colors"
            >
                <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                disabled={deleting}
                className="h-8 w-8 rounded-lg glass-strong flex items-center justify-center hover:bg-red-500/20 text-white transition-colors disabled:opacity-50"
            >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="font-semibold text-sm tracking-tight truncate text-white">{v.make} {v.model}</h4>
        </div>
      </div>
      <div className="p-4 space-y-4 bg-white/5 dark:bg-black/20">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-foreground">{v.currency} {v.price.toLocaleString()}</span>
          <Link href={`/listings/${v.id}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="text-gray-400 hover:text-cyan-400 transition-colors p-1 rounded-lg hover:bg-white/5">
                <Eye className="h-5 w-5" />
            </button>
          </Link>
        </div>

        {canToggle && (
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-cyan-400" : "text-gray-500"}`}>
              {isActive ? "Active" : "Inactive"}
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
              className={`relative h-6 w-10 rounded-full transition-colors disabled:opacity-50 ${
                isActive ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 text-[12px] text-gray-300 font-medium tracking-wide">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5"><Calendar className="h-3.5 w-3.5 text-cyan-400" />{v.year}</span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5"><Gauge className="h-3.5 w-3.5 text-cyan-400" />{(v.mileage / 1000).toFixed(0)}K</span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5"><MapPin className="h-3.5 w-3.5 text-cyan-400" />{v.city}</span>
        </div>
      </div>
    </motion.div>
  );
}

