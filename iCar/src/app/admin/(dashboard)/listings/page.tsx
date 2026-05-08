"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Car,
  Gauge,
  MapPin,
  Calendar,
  ChevronRight,
  Loader2,
  Building2,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

interface DealerInfo {
  id: number;
  dealershipName: string;
  email: string;
  contactPerson: string;
  city: string | null;
  country: string | null;
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
  dealer: DealerInfo;
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/getListings?status=ACTIVE");
        const data = await res.json();
        if (data.success) setListings(data.listings ?? []);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Active Listings" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        </div>
      </>
    );
  }

  if (listings.length === 0) {
    return (
      <>
        <Breadcrumb pageName="Active Listings" />
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Car className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No active listings
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There are no active car listings in the database.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Active Listings" />

      <div className="space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {listings.length} active listing{listings.length !== 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <AdminListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </>
  );
}

function AdminListingCard({ listing }: { listing: Listing }) {
  const primaryImage =
    listing.images.find((i) => i.isPrimary)?.url ||
    listing.images[0]?.url ||
    "/car-placeholder.png";
  const [imgSrc, setImgSrc] = useState(primaryImage);

  return (
    <Link
      href={`/admin/listings/${listing.id}`}
      className="group panel border-white/5 overflow-hidden flex flex-col bg-white/[0.02] hover:bg-white/[0.04] transition-all relative"
    >
      {/* Image Section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        <Image
          src={imgSrc}
          alt={`${listing.make} ${listing.model}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgSrc("/car-placeholder.png")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest backdrop-blur-md border border-cyan-500/40 bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            {listing.status.toUpperCase()}
          </span>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
            <h4 className="font-bold text-white text-lg tracking-tight truncate">{listing.year} {listing.make} {listing.model}</h4>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase truncate">
                <Building2 className="inline size-3 mr-1 text-cyan-400" />
                {listing.dealer.dealershipName}
            </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
            <div className="flex items-baseline justify-between mb-4">
                <span className="text-2xl font-bold tracking-tight text-white">{listing.currency} {listing.price.toLocaleString()}</span>
                <span className="text-[10px] font-mono text-cyan-400/70">{(listing.price / 3.67).toFixed(0)} USD est.</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">{listing.year}</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300">{(listing.mileage / 1000).toFixed(0)}K KM</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center">{listing.city}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center pt-2">
            <div className="flex-1 h-10 rounded-xl glass border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all group/btn">
                View Details <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </div>
        </div>
      </div>
    </Link>
  );
}
