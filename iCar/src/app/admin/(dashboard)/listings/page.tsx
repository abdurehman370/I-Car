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
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-cyan-500/30 dark:border-white/5 dark:bg-gray-800 dark:shadow-lg cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-900">
        <Image
          src={imgSrc}
          alt={`${listing.make} ${listing.model}`}
          fill
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgSrc("/car-placeholder.png")}
        />
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400 backdrop-blur-md">
            {listing.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Building2 className="h-3.5 w-3.5" />
          {listing.dealer.dealershipName}
        </div>
        <h3 className="text-base font-bold leading-tight text-gray-900 dark:text-white">
          {listing.year} {listing.make} {listing.model}
          {listing.variant && (
            <span className="font-normal text-gray-400">
              {" "}
              · {listing.variant}
            </span>
          )}
        </h3>
        <p className="mt-1 text-lg font-bold text-cyan-500 dark:text-cyan-400">
          {listing.currency} {listing.price.toLocaleString()}
        </p>

        <div className="mb-4 mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />{" "}
            {listing.mileage.toLocaleString()} KM
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {listing.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {listing.condition}
          </span>
        </div>

        <div className="mt-auto flex items-center pt-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-cyan-500 transition-colors group-hover:text-cyan-600 dark:text-cyan-400 dark:group-hover:text-cyan-300">
            View listing
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
