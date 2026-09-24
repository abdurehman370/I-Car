"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Search, Plus,
  MapPin, Gauge, Calendar, Eye, Edit2, Trash2,
  Loader2, CheckCircle, AlertCircle, SlidersHorizontal
} from "lucide-react";
import ListingEditModal, {
  type DealerListing,
  type ListingEditForm,
  listingToEditForm,
} from "@/components/dealer/ListingEditModal";

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface Listing extends DealerListing {
  createdAt: string;
  images: ListingImage[];
}

export default function InventoryPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState<ListingEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dealer/listings");
      const data = await res.json();
      if (data.success) setListings(data.listings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const openEdit = (l: Listing) => {
    setEditTarget(l);
    setEditForm(listingToEditForm(l));
  };

  const handleSave = async () => {
    if (!editTarget || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dealer/listings/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setListings((prev) => prev.map((l) => (l.id === editTarget.id ? data.listing : l)));
        setEditTarget(null);
        setEditForm(null);
        showToast("Listing updated", "success");
      } else {
        showToast(data.message || "Update failed", "error");
      }
    } finally {
      setSaving(false);
    }
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/dealer/listings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        showToast("Listing deleted", "success");
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } finally {
      setDeleting(null);
    }
  };

  const filteredListings = listings.filter((l) => {
    const matchesSearch = (l.make + " " + l.model)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-0">
      {/* Top Header Deck */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-300 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            INVENTORY MATRIX · LIVE REPOSITORY
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Vehicle <span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">Showroom</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-lg text-sm">
            Manage live showroom units, inspect real-time valuations, and deploy vehicles across international markets.
          </p>
        </div>
        <Link href="/list-vehicle">
          <button className="h-12 px-7 rounded-xl cyber-btn-primary flex items-center gap-2.5 font-bold transition-all text-sm shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            <Plus className="h-4 w-4" /> Initialize Vehicle Listing
          </button>
        </Link>
      </div>

      {/* Filter and Search HUD */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-r from-[#061529]/80 via-[#041021]/80 to-[#030a17]/90 p-4 backdrop-blur-xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
          {[
            { id: "ALL", label: "All Units", count: listings.length },
            { id: "ACTIVE", label: "Active", count: listings.filter(l => l.status === "ACTIVE").length },
            { id: "DRAFT", label: "Drafts", count: listings.filter(l => l.status === "DRAFT").length },
            { id: "SOLD", label: "Sold", count: listings.filter(l => l.status === "SOLD").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                statusFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                  : "bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                statusFilter === tab.id ? "bg-cyan-400/30 text-cyan-200" : "bg-white/10 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search make, model, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#030914]/80 border border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 text-sm text-slate-100 placeholder:text-slate-500 transition-all outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">Synchronizing Showroom Matrix...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cyan-500/20 bg-[#061426]/40 p-16 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-5">
            <Car className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No vehicles found in criteria</h3>
          <p className="text-slate-400 max-w-sm mx-auto mb-6 text-sm">
            No matching inventory matched your search terms or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-semibold text-xs hover:bg-cyan-500/20 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredListings.map((l, i) => (
              <InventoryCard
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
          </AnimatePresence>
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

      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success"
              ? "bg-[#061f1b]/95 border-teal-500/30 text-teal-300 shadow-[0_10px_30px_rgba(20,184,166,0.2)]"
              : "bg-[#220c14]/95 border-rose-500/30 text-rose-300 shadow-[0_10px_30px_rgba(244,63,94,0.2)]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="size-4 text-teal-400" />
          ) : (
            <AlertCircle className="size-4 text-rose-400" />
          )}
          <span className="font-semibold text-xs tracking-wide">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function InventoryCard({
  v,
  delay,
  onEdit,
  onToggleStatus,
  onDelete,
  deleting,
  toggling,
}: {
  v: Listing;
  delay: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  deleting: boolean;
  toggling: boolean;
}) {
  const primaryImage =
    v.images?.find((i) => i.isPrimary)?.url || v.images?.[0]?.url || "/car-placeholder.jpg";
  const [imgSrc, setImgSrc] = useState(primaryImage);
  const isActive = v.status === "ACTIVE";
  const canToggle = v.status === "ACTIVE" || v.status === "DRAFT";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.28 }}
      whileHover={{ y: -5 }}
      className="group rounded-2xl overflow-hidden border border-cyan-500/15 bg-gradient-to-b from-[#07192e]/80 via-[#051324]/90 to-[#020914] hover:border-cyan-400/40 transition-all duration-300 shadow-lg hover:shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex flex-col justify-between"
    >
      <div>
        <div className="relative aspect-[16/10] overflow-hidden bg-[#030914]">
          <Image
            src={imgSrc}
            alt={`${v.make} ${v.model}`}
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-108"
            onError={() => setImgSrc("/car-placeholder.jpg")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#051324] via-transparent to-black/40 pointer-events-none" />

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-semibold backdrop-blur-md border ${
                v.status === "ACTIVE"
                  ? "bg-teal-500/20 text-teal-300 border-teal-400/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                  : v.status === "SOLD"
                    ? "bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-slate-800/80 text-slate-400 border-white/10"
              }`}
            >
              {v.status === "DRAFT" ? "INACTIVE" : v.status.toUpperCase()}
            </span>
          </div>

          {/* Vehicle Name Overlay */}
          <div className="absolute bottom-2.5 left-3 right-3">
            <h4 className="font-bold text-white text-base tracking-tight truncate drop-shadow-md">
              {v.make} {v.model}
            </h4>
            <p className="text-[10px] text-cyan-400/80 font-mono tracking-wider uppercase">
              {v.variant || "Standard Trim"}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Price Tag */}
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-white font-sans">
              <span className="text-xs text-cyan-400 mr-1 font-mono font-normal">{v.currency}</span>
              {v.price.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              ASKING PRICE
            </span>
          </div>

          {/* Specs Micro Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono font-semibold text-slate-200">{v.year}</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono font-semibold text-slate-200">
                {(v.mileage / 1000).toFixed(0)}k km
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono font-semibold text-slate-200 truncate w-full text-center">
                {v.city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions & Toggle Footer */}
      <div className="p-4 pt-0 space-y-3">
        {canToggle && (
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
            <div>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                LIVE STATUS
              </p>
              <p className={`text-xs font-bold ${isActive ? "text-teal-300" : "text-slate-400"}`}>
                {isActive ? "Published Live" : "Draft · Offline"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={isActive ? "Set listing inactive" : "Set listing active"}
              disabled={toggling}
              onClick={onToggleStatus}
              className={`relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                isActive ? "bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
              {toggling && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-black/60" />
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Link href={`/listings/${v.id}`} className="flex-1">
            <button
              type="button"
              className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-slate-200 hover:text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Eye className="h-3.5 w-3.5" /> View Unit
            </button>
          </Link>
          <button
            type="button"
            onClick={onEdit}
            title="Edit listing"
            className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title="Delete listing"
            className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/10 hover:border-rose-400/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
