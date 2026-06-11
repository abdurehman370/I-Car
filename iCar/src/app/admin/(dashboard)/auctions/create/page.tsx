"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function CreateAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    mileage: "",
    variant: "",
    region: "Dubai",
    city: "Dubai",
    description: "",
    startingBid: "",
    reservePrice: "",
    minIncrement: "500",
    currency: "AED",
    startAt: "",
    endAt: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create auction");

      router.push(`/admin/auctions/${data.auction.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/auctions"
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Breadcrumb pageName="Create Auction" />
      </div>

      <div className="panel border-white/5 bg-white/[0.02] p-6 lg:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight border-b border-white/10 pb-2">
              General Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-300">Auction Title *</label>
                <input
                  required
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. 2023 Toyota Land Cruiser VXR"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Make *</label>
                <input
                  required
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="e.g. Toyota"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Model *</label>
                <input
                  required
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g. Land Cruiser"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Year *</label>
                <input
                  required
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Mileage (KM) *</label>
                <input
                  required
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  min={0}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Variant (Optional)</label>
                <input
                  name="variant"
                  value={formData.variant}
                  onChange={handleChange}
                  placeholder="e.g. VXR 5.7L"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Region *</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Dubai">Dubai</option>
                  <option value="Abu Dhabi">Abu Dhabi</option>
                  <option value="Sharjah">Sharjah</option>
                  <option value="Ajman">Ajman</option>
                  <option value="Fujairah">Fujairah</option>
                  <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                  <option value="Umm Al Quwain">Umm Al Quwain</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-300">Description *</label>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Detailed description of the vehicle's condition, features, history, etc."
                />
              </div>
            </div>
          </div>

          {/* Auction Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight border-b border-white/10 pb-2">
              Auction Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Starting Bid ({formData.currency}) *</label>
                <input
                  required
                  type="number"
                  name="startingBid"
                  value={formData.startingBid}
                  onChange={handleChange}
                  min={0}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Reserve Price ({formData.currency}) (Optional)</label>
                <input
                  type="number"
                  name="reservePrice"
                  value={formData.reservePrice}
                  onChange={handleChange}
                  min={0}
                  placeholder="Leave empty for no reserve"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Minimum Bid Increment ({formData.currency}) *</label>
                <input
                  required
                  type="number"
                  name="minIncrement"
                  value={formData.minIncrement}
                  onChange={handleChange}
                  min={1}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Currency *</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Start Time *</label>
                <input
                  required
                  type="datetime-local"
                  name="startAt"
                  value={formData.startAt}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">End Time *</label>
                <input
                  required
                  type="datetime-local"
                  name="endAt"
                  value={formData.endAt}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <Link
              href="/admin/auctions"
              className="px-6 py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
