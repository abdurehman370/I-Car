"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Car, PlusCircle, DollarSign, BarChart3, Edit2, Trash2,
    X, Loader2, CheckCircle, AlertCircle, MapPin, Calendar,
    Gauge, ChevronRight, Eye, EyeOff
} from "lucide-react";

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

interface EditForm {
    make: string;
    model: string;
    year: string;
    mileage: string;
    variant: string;
    price: string;
    currency: string;
    description: string;
    condition: string;
    city: string;
    region: string;
    status: string;
}

export default function DealerDashboard() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Listing | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [saving, setSaving] = useState(false);
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

    const openEdit = (l: Listing) => {
        setEditTarget(l);
        setEditForm({
            make: l.make,
            model: l.model,
            year: String(l.year),
            mileage: String(l.mileage),
            variant: l.variant || "",
            price: String(l.price),
            currency: l.currency,
            description: l.description,
            condition: l.condition,
            city: l.city,
            region: l.region,
            status: l.status,
        });
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
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage your active inventory</p>
                    </div>
                    <Link
                        href="/list-vehicle"
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <PlusCircle className="size-5" />
                        List a Vehicle
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        icon={<Car className="size-6 text-indigo-600 dark:text-indigo-400" />}
                        iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                        label="Active Listings"
                        value={loading ? "—" : String(activeListings.length)}
                    />
                    <StatCard
                        icon={<DollarSign className="size-6 text-green-600 dark:text-green-400" />}
                        iconBg="bg-green-100 dark:bg-green-900/30"
                        label="Total Inventory Value"
                        value={loading ? "—" : `AED ${totalValue.toLocaleString()}`}
                    />
                    <StatCard
                        icon={<BarChart3 className="size-6 text-purple-600 dark:text-purple-400" />}
                        iconBg="bg-purple-100 dark:bg-purple-900/30"
                        label="Total Listings"
                        value={loading ? "—" : String(listings.length)}
                    />
                </div>

                {/* Listings */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="size-10 text-indigo-500 animate-spin" />
                    </div>
                ) : listings.length === 0 ? (
                    <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-12 border border-gray-200 dark:border-white/5 shadow-sm text-center">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Car className="size-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No listings yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                            Start building your inventory by listing your first vehicle.
                        </p>
                        <Link
                            href="/list-vehicle"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <PlusCircle className="size-5" />
                            Start Listing
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Listings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {listings.map(l => (
                                <ListingCard
                                    key={l.id}
                                    listing={l}
                                    deleting={deleting === l.id}
                                    onEdit={() => openEdit(l)}
                                    onDelete={() => handleDelete(l.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

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

            {/* Edit Modal */}
            {editTarget && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0a1526] rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Edit Listing</h2>
                                <p className="text-sm text-gray-400 mt-0.5">{editTarget.make} {editTarget.model} {editTarget.year}</p>
                            </div>
                            <button
                                onClick={() => { setEditTarget(null); setEditForm(null); }}
                                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Make" value={editForm.make} onChange={v => setEditForm(f => ({ ...f!, make: v }))} />
                            <Field label="Model" value={editForm.model} onChange={v => setEditForm(f => ({ ...f!, model: v }))} />
                            <Field label="Year" value={editForm.year} onChange={v => setEditForm(f => ({ ...f!, year: v }))} type="number" />
                            <Field label="Mileage (KM)" value={editForm.mileage} onChange={v => setEditForm(f => ({ ...f!, mileage: v }))} type="number" />
                            <Field label="Variant" value={editForm.variant} onChange={v => setEditForm(f => ({ ...f!, variant: v }))} />
                            <Field label="Price" value={editForm.price} onChange={v => setEditForm(f => ({ ...f!, price: v }))} type="number" />
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Currency</label>
                                <select
                                    value={editForm.currency}
                                    onChange={e => setEditForm(f => ({ ...f!, currency: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="AED">AED</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="LBP">LBP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condition</label>
                                <select
                                    value={editForm.condition}
                                    onChange={e => setEditForm(f => ({ ...f!, condition: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="USED">Used</option>
                                    <option value="NEW">New</option>
                                    <option value="CERTIFIED">Certified</option>
                                </select>
                            </div>
                            <Field label="City" value={editForm.city} onChange={v => setEditForm(f => ({ ...f!, city: v }))} />
                            <Field label="Region" value={editForm.region} onChange={v => setEditForm(f => ({ ...f!, region: v }))} />
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(f => ({ ...f!, status: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="DRAFT">Draft</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f!, description: e.target.value }))}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-indigo-500 resize-none placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-white/10">
                            <button
                                onClick={() => { setEditTarget(null); setEditForm(null); }}
                                className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
    return (
        <div className="bg-white dark:bg-[#0a1526] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 ${iconBg} rounded-2xl`}>{icon}</div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-indigo-500 placeholder:text-gray-600"
            />
        </div>
    );
}

function ListingCard({ listing, deleting, onEdit, onDelete }: {
    listing: Listing;
    deleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const primaryImage = listing.images.find(i => i.isPrimary)?.url || listing.images[0]?.url || '/car-placeholder.png';
    const isActive = listing.status === 'ACTIVE';
    const [imgSrc, setImgSrc] = useState(primaryImage);

    return (
        <div className="group bg-white dark:bg-[#0a1526] rounded-[2rem] overflow-hidden border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 dark:shadow-lg transition-all duration-300 flex flex-col">
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-[#020d1a]">
                <Image
                    src={imgSrc}
                    alt={`${listing.make} ${listing.model}`}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => setImgSrc('/car-placeholder.png')}
                />
                {/* Status badge */}
                <div className="absolute top-3 left-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${isActive
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                        {isActive ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {listing.status}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col flex-1">
                <div className="mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                        {listing.year} {listing.make} {listing.model}
                        {listing.variant && <span className="text-gray-400 font-normal"> · {listing.variant}</span>}
                    </h3>
                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-lg mt-1">
                        {listing.currency} {listing.price.toLocaleString()}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Gauge className="size-3.5" /> {listing.mileage.toLocaleString()} KM</span>
                    <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {listing.city}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> {listing.condition}</span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                    <Link
                        href={`/listings/${listing.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        View <ChevronRight className="size-3.5" />
                    </Link>
                    <div className="flex-1" />
                    <button
                        onClick={onEdit}
                        className="p-2.5 bg-white/5 hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-400 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all"
                    >
                        <Edit2 className="size-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={deleting}
                        className="p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl border border-white/5 hover:border-red-500/30 transition-all disabled:opacity-40"
                    >
                        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
