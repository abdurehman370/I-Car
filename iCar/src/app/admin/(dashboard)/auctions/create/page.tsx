"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Save, Upload, X, PlusCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { MarketRegionSelect } from "@/components/FormElements/MarketRegionSelect";
import { getAuctionTimezoneLabel } from "@/lib/auction-datetime";
import {
  buildStoredRegion,
  defaultCityForMarket,
  getCitiesForMarket,
  type Market,
} from "@/lib/regions";

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
    region: "UAE",
    city: "Dubai",
    country: "",
    description: "",
    startingBid: "",
    reservePrice: "",
    minIncrement: "500",
    currency: "AED",
    startAt: "",
    endAt: "",
    auctionType: "ONLINE",
    venue: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const market = formData.region as Market;
  const storedRegion = buildStoredRegion(market, formData.country);

  const handleMarketChange = (nextMarket: Market) => {
    setFormData(prev => ({
      ...prev,
      region: nextMarket,
      country: "",
      city: defaultCityForMarket(nextMarket),
    }));
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => ({
      ...prev,
      country,
      city: country || prev.city,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const convertImagesToBase64 = async (): Promise<string[]> => {
    const promises = images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const imageData = await convertImagesToBase64();
      
      const payload = {
        ...formData,
        region: storedRegion,
        city: market === "Europe" ? (formData.country || formData.city) : formData.city,
        images: imageData
      };
      const { country: _country, ...submitPayload } = payload as typeof payload & { country?: string };

      const res = await fetch("/api/admin/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitPayload),
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

              <MarketRegionSelect
                market={market}
                country={formData.country}
                onMarketChange={handleMarketChange}
                onCountryChange={handleCountryChange}
                label="Region"
                selectClassName="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                labelClassName="text-sm font-semibold text-gray-300"
              />

              {market !== "Europe" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">
                    {market === "UAE" ? "Emirate *" : "City *"}
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {getCitiesForMarket(market).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-gray-500 md:col-span-2">
                Start/end times use the market timezone for the selected region — not your laptop clock ({getAuctionTimezoneLabel(storedRegion)}).
              </p>

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

              {/* Images */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-300">Vehicle Photos (Max 5)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-2">
                  {imagePreviews.map((p, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-[4/3] bg-black/20">
                      <img src={p} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors aspect-[4/3] bg-black/20 text-gray-400 hover:text-cyan-400">
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="text-xs">Upload</span>
                      <input type="file" onChange={handleImageUpload} className="hidden" multiple accept="image/*" />
                    </label>
                  )}
                </div>
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
                <label className="text-sm font-semibold text-gray-300">Auction Type *</label>
                <select
                  name="auctionType"
                  value={formData.auctionType}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ONLINE">Online only</option>
                  <option value="PHYSICAL">Physical (venue only)</option>
                  <option value="HYBRID">Hybrid (venue + online)</option>
                </select>
                <p className="text-xs text-gray-500">
                  Physical/Hybrid auctions get a big-screen display link and floor bid entry.
                </p>
              </div>

              {(formData.auctionType === "PHYSICAL" || formData.auctionType === "HYBRID") && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">Venue</label>
                  <input
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="e.g. CarQ Auction Hall, Al Quoz, Dubai"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

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
                <label className="text-sm font-semibold text-gray-300">
                  Start Time * <span className="text-xs font-normal text-gray-500">({getAuctionTimezoneLabel(storedRegion)})</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  name="startAt"
                  value={formData.startAt}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark] [.admin-light_&]:[color-scheme:light]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">
                  End Time * <span className="text-xs font-normal text-gray-500">({getAuctionTimezoneLabel(storedRegion)})</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  name="endAt"
                  value={formData.endAt}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark] [.admin-light_&]:[color-scheme:light]"
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
