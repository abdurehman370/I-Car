"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Search, Filter, Plus, ArrowUpRight, 
  MapPin, Gauge, Calendar, Eye, Edit2, Trash2,
  Loader2, CheckCircle, AlertCircle, X, ChevronRight, SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface Listing {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  variant: string | null;
  price: number;
  currency: string;
  description: string;
  condition: string;
  city: string;
  region: string;
  status: string;
  createdAt: string;
  images: ListingImage[];
}

export default function InventoryPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const filteredListings = listings.filter(l => {
    const matchesSearch = (l.make + " " + l.model).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
            WORKSPACE · INVENTORY
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Your <span className="text-gradient">Inventory</span>
          </h1>
          <p className="text-gray-400 mt-2 max-w-lg text-sm">
            Manage, track and optimize your vehicle listings with real-time market data.
          </p>
        </div>
        <Link href="/list-vehicle">
          <button className="h-12 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold flex items-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <Plus className="h-5 w-5" /> Add New Listing
          </button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by make, model or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-2xl glass-strong border border-white/5 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 text-white transition-all outline-none"
          />
        </div>
        <div className="md:col-span-4 flex gap-4">
          <div className="flex-1 relative">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-14 pl-11 pr-4 rounded-2xl glass border border-white/5 text-white appearance-none outline-none focus:border-cyan-400/30"
             >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="SOLD">Sold</option>
             </select>
          </div>
          <button className="h-14 w-14 rounded-2xl glass border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
          <p className="text-cyan-400/60 font-mono text-xs tracking-widest uppercase">Loading Assets...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="panel border-white/5 p-20 text-center bg-white/[0.02]">
           <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Car className="h-10 w-10 text-gray-600" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No vehicles found</h3>
           <p className="text-gray-500 max-w-sm mx-auto mb-8">
              We couldn't find any listings matching your current search or filters.
           </p>
           <button 
             onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }}
             className="text-cyan-400 font-bold hover:underline"
           >
             Clear all filters
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredListings.map((l, i) => (
              <InventoryCard 
                key={l.id} 
                v={l} 
                delay={i * 0.05} 
                onDelete={() => handleDelete(l.id)}
                deleting={deleting === l.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success'
            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          {toast.type === 'success'
            ? <CheckCircle className="size-5" />
            : <AlertCircle className="size-5" />}
          <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function InventoryCard({ v, delay, onDelete, deleting }: any) {
  const primaryImage = v.images?.find((i: any) => i.isPrimary)?.url || v.images?.[0]?.url || '/car-placeholder.png';
  const [imgSrc, setImgSrc] = useState(primaryImage);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -6 }}
      className="group panel border-white/5 overflow-hidden flex flex-col bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        <Image
          src={imgSrc}
          alt={`${v.make} ${v.model}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgSrc('/car-placeholder.png')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest backdrop-blur-md border ${
            v.status === "ACTIVE"
              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
              : v.status === "SOLD"
              ? "bg-teal-500/20 text-teal-400 border-teal-500/40"
              : "bg-gray-500/20 text-gray-400 border-white/10"
          }`}>
            {v.status.toUpperCase()}
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
            <h4 className="font-bold text-white text-lg tracking-tight truncate">{v.make} {v.model}</h4>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">{v.variant || "Standard Edition"}</p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
            <div className="flex items-baseline justify-between mb-4">
                <span className="text-2xl font-bold tracking-tight text-white">{v.currency} {v.price.toLocaleString()}</span>
                <span className="text-[10px] font-mono text-cyan-400/70">AED {(v.price / 3.67).toFixed(0)} USD equivalent</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">{v.year}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">{(v.mileage / 1000).toFixed(0)}K KM</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center">{v.city}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
            <Link href={`/listings/${v.id}`} className="flex-1">
                <button className="w-full h-10 rounded-xl glass border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all group/btn">
                    <Eye className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform" /> View
                </button>
            </Link>
            <button className="h-10 w-10 rounded-xl glass border border-white/10 text-gray-400 hover:text-cyan-400 flex items-center justify-center transition-all">
                <Edit2 className="h-4 w-4" />
            </button>
            <button 
                onClick={onDelete}
                disabled={deleting}
                className="h-10 w-10 rounded-xl glass border border-white/10 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all disabled:opacity-50"
            >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
        </div>
      </div>
    </motion.div>
  );
}
