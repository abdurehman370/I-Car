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
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="carq-input rounded-2xl placeholder:text-gray-500"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-2 rounded-[2rem] border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
                <h2 className="text-xl font-bold text-foreground">Edit Listing</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
              {listing.make} {listing.model} {listing.year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Make" value={form.make} onChange={(v) => onChange({ ...form, make: v })} />
          <Field label="Model" value={form.model} onChange={(v) => onChange({ ...form, model: v })} />
          <Field label="Year" value={form.year} onChange={(v) => onChange({ ...form, year: v })} type="number" />
          <Field
            label="Mileage (KM)"
            value={form.mileage}
            onChange={(v) => onChange({ ...form, mileage: v })}
            type="number"
          />
          <Field label="Variant" value={form.variant} onChange={(v) => onChange({ ...form, variant: v })} />
          <Field label="Price" value={form.price} onChange={(v) => onChange({ ...form, price: v })} type="number" />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => onChange({ ...form, currency: e.target.value })}
              className="carq-select !h-auto py-3 rounded-2xl"
            >
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="LBP">LBP</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Condition
            </label>
            <select
              value={form.condition}
              onChange={(e) => onChange({ ...form, condition: e.target.value })}
              className="carq-select !h-auto py-3 rounded-2xl"
            >
              <option value="USED">Used</option>
              <option value="NEW">New</option>
              <option value="CERTIFIED">Certified</option>
            </select>
          </div>
          <Field label="City" value={form.city} onChange={(v) => onChange({ ...form, city: v })} />
          <Field label="Region" value={form.region} onChange={(v) => onChange({ ...form, region: v })} />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Listing visibility
            </label>
            <select
              value={form.status}
              onChange={(e) => onChange({ ...form, status: e.target.value })}
              disabled={statusLocked}
              className="carq-select !h-auto py-3 rounded-2xl disabled:opacity-50"
            >
              <option value="ACTIVE">Active (visible)</option>
              <option value="DRAFT">Inactive (draft)</option>
              {statusLocked && <option value={listing.status}>{listing.status}</option>}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              Active listings appear in search. Inactive listings are hidden from buyers.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              rows={4}
              className="carq-textarea rounded-2xl placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
