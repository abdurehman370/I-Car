"use client";

import { Loader2, X } from "lucide-react";

export interface DealerListing {
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
}

export interface ListingEditForm {
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

export function listingToEditForm(l: DealerListing): ListingEditForm {
  return {
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
  };
}

interface ListingEditModalProps {
  listing: DealerListing;
  form: ListingEditForm;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: ListingEditForm) => void;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="carq-input !h-11 rounded-xl placeholder:text-slate-500 text-sm"
      />
    </div>
  );
}

export default function ListingEditModal({
  listing,
  form,
  saving,
  onClose,
  onSave,
  onChange,
}: ListingEditModalProps) {
  const statusLocked = listing.status === "SOLD" || listing.status === "EXPIRED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#071b33]/95 via-[#041122]/95 to-[#020814] shadow-[0_20px_70px_rgba(0,0,0,0.9)] w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
        {/* Top specular accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-teal-400 pointer-events-none" />

        <div className="flex items-center justify-between p-6 border-b border-cyan-500/10">
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-mono text-cyan-400 tracking-widest uppercase font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              INVENTORY MATRIX · ASSET CONFIGURATION
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
              Edit {listing.make} {listing.model}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              ASSET ID: {listing.id.slice(0, 12)} · {listing.year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vehicle Make" value={form.make} onChange={(v) => onChange({ ...form, make: v })} />
          <Field label="Vehicle Model" value={form.model} onChange={(v) => onChange({ ...form, model: v })} />
          <Field label="Model Year" value={form.year} onChange={(v) => onChange({ ...form, year: v })} type="number" />
          <Field
            label="Odometer (KM)"
            value={form.mileage}
            onChange={(v) => onChange({ ...form, mileage: v })}
            type="number"
          />
          <Field label="Variant / Trim" value={form.variant} onChange={(v) => onChange({ ...form, variant: v })} />
          <Field label="Asking Price" value={form.price} onChange={(v) => onChange({ ...form, price: v })} type="number" />
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Trading Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => onChange({ ...form, currency: e.target.value })}
              className="carq-select !h-11 rounded-xl text-sm"
            >
              <option value="AED">AED (Emirati Dirham)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="LBP">LBP (Lebanese Pound)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Condition Grade
            </label>
            <select
              value={form.condition}
              onChange={(e) => onChange({ ...form, condition: e.target.value })}
              className="carq-select !h-11 rounded-xl text-sm"
            >
              <option value="USED">Pre-Owned / Used</option>
              <option value="NEW">Brand New</option>
              <option value="CERTIFIED">Certified Pre-Owned</option>
            </select>
          </div>
          <Field label="Location City" value={form.city} onChange={(v) => onChange({ ...form, city: v })} />
          <Field label="Region Market" value={form.region} onChange={(v) => onChange({ ...form, region: v })} />
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Public Visibility Status
            </label>
            <select
              value={form.status}
              onChange={(e) => onChange({ ...form, status: e.target.value })}
              disabled={statusLocked}
              className="carq-select !h-11 rounded-xl disabled:opacity-50 text-sm"
            >
              <option value="ACTIVE">ACTIVE · Live on regional showroom</option>
              <option value="DRAFT">DRAFT · Offline / unlisted</option>
              {statusLocked && <option value={listing.status}>{listing.status}</option>}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Description & Highlights
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={4}
              className="carq-textarea rounded-xl placeholder:text-slate-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-cyan-500/10 bg-[#020814]/60">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.04] font-semibold transition-colors text-xs uppercase tracking-wider font-mono"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl cyber-btn-primary font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(34,211,238,0.25)]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving Changes..." : "Commit Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
