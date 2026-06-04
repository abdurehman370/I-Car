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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
            WORKSPACE · INVENTORY
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Your <span className="text-gradient">Inventory</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg text-sm">
            Manage, track and optimize your vehicle listings with real-time market data.
          </p>
        </div>
        <Link href="/list-vehicle">
          <button className="h-12 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold flex items-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <Plus className="h-5 w-5" /> Add New Listing
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by make, model or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-2xl glass-strong border border-white/10 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 text-foreground transition-all outline-none"
          />
        </div>
        <div className="md:col-span-4 flex items-center gap-3 min-w-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="icar-select h-14 rounded-2xl flex-1 min-w-0 w-full max-w-full"
            aria-label="Filter by status"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Inactive</option>
            <option value="SOLD">Sold</option>
          </select>
          <button
            type="button"
            className="h-14 w-14 shrink-0 rounded-2xl glass border border-white/10 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

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
            We couldn&apos;t find any listings matching your current search or filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
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
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border z-50 animate-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success"
              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span className="font-bold text-sm tracking-wide">{toast.msg}</span>
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
    v.images?.find((i) => i.isPrimary)?.url || v.images?.[0]?.url || "/car-placeholder.png";
  const [imgSrc, setImgSrc] = useState(primaryImage);
  const isActive = v.status === "ACTIVE";
  const canToggle = v.status === "ACTIVE" || v.status === "DRAFT";

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
          onError={() => setImgSrc("/car-placeholder.png")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest backdrop-blur-md border ${
              v.status === "ACTIVE"
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                : v.status === "SOLD"
                  ? "bg-teal-500/20 text-teal-400 border-teal-500/40"
                  : "bg-gray-500/20 text-gray-400 border-white/10"
            }`}
          >
            {v.status === "DRAFT" ? "INACTIVE" : v.status.toUpperCase()}
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
          <h4 className="font-bold text-[#ffffff] text-lg tracking-tight truncate">
            {v.make} {v.model}
          </h4>
          <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
            {v.variant || "Standard Edition"}
          </p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {v.currency} {v.price.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5">
              <Calendar className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-[10px] font-bold text-foreground/70">{v.year}</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5">
              <Gauge className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-[10px] font-bold text-foreground/70">
                {(v.mileage / 1000).toFixed(0)}K KM
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5">
              <MapPin className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-[10px] font-bold text-foreground/70 truncate w-full text-center">
                {v.city}
              </span>
            </div>
          </div>
        </div>

        {canToggle && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Listing visibility
              </p>
              <p className={`text-xs font-bold ${isActive ? "text-cyan-400" : "text-gray-400"}`}>
                {isActive ? "Active · visible to buyers" : "Inactive · hidden"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={isActive ? "Set listing inactive" : "Set listing active"}
              disabled={toggling}
              onClick={onToggleStatus}
              className={`relative h-7 w-12 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                isActive ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
              {toggling && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-black/50" />
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Link href={`/listings/${v.id}`} className="flex-1">
            <button
              type="button"
              className="w-full h-10 rounded-xl glass border border-white/10 text-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
          </Link>
          <button
            type="button"
            onClick={onEdit}
            title="Edit listing"
            className="h-10 w-10 rounded-xl glass border border-white/10 text-muted-foreground hover:text-cyan-500 flex items-center justify-center transition-all"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title="Delete listing"
            className="h-10 w-10 rounded-xl glass border border-white/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
