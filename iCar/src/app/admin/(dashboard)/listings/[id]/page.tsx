"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Car,
  MapPin,
  Calendar,
  Gauge,
  Building2,
  Phone,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings2,
  Mail,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
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
  features: string;
  condition: string;
  city: string;
  region: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  images: ListingImage[];
  dealer: {
    id?: number;
    dealershipName: string;
    contactPerson: string;
    phoneNumber: string;
    email?: string;
    city: string | null;
    country: string | null;
  };
}

const CONDITION_STYLES: Record<string, string> = {
  NEW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  USED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CERTIFIED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  SOLD: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EXPIRED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function AdminListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/listings/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.data) setListing(data.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Listing Details" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-10 animate-spin text-indigo-600" />
        </div>
      </>
    );
  }

  if (notFound || !listing) {
    return (
      <>
        <Breadcrumb pageName="Listing Details" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="size-16 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Listing Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            This listing may have been removed or the link is invalid.
          </p>
          <Link
            href="/admin/listings"
            className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <ChevronLeft className="size-4" /> Back to Listings
          </Link>
        </div>
      </>
    );
  }

  const features: string[] = (() => {
    try {
      return JSON.parse(listing.features || "[]");
    } catch {
      return [];
    }
  })();

  const primaryIdx = listing.images.findIndex((i) => i.isPrimary);
  const orderedImages =
    listing.images.length > 0
      ? [
          listing.images[primaryIdx >= 0 ? primaryIdx : 0],
          ...listing.images.filter(
            (_, i) => i !== (primaryIdx >= 0 ? primaryIdx : 0)
          ),
        ]
      : [];

  return (
    <>
      <Breadcrumb pageName="Listing Details" />

      <div className="max-w-6xl space-y-8 pb-12">
        <Link
          href="/admin/listings"
          className="flex items-center gap-2 font-medium text-gray-500 transition-colors hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          <ChevronLeft className="size-5" />
          Back to Listings
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left — Images + Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Image gallery */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-gray-800">
              {orderedImages.length > 0 ? (
                <>
                  <div className="aspect-[16/9] w-full bg-gray-100 dark:bg-gray-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={orderedImages[activeImage]?.url}
                      alt={`${listing.make} ${listing.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {orderedImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto p-4">
                      {orderedImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setActiveImage(idx)}
                          className={`flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                            activeImage === idx
                              ? "border-indigo-500 shadow-md"
                              : "border-transparent opacity-60 hover:opacity-100"
                          } h-14 w-20`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={`View ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
                  <Car className="size-20 text-gray-300 dark:text-gray-700" />
                </div>
              )}
            </div>

            {/* Title + badges */}
            <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {listing.year} {listing.make} {listing.model}
                    {listing.variant && (
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        {" "}
                        — {listing.variant}
                      </span>
                    )}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <MapPin className="size-4" /> {listing.city}, {listing.region}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      CONDITION_STYLES[listing.condition] ??
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {listing.condition}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLES[listing.status] ??
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>
              </div>

              {/* Key specs */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-white/5 sm:grid-cols-4">
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/50">
                  <Calendar className="size-5 text-indigo-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Year
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {listing.year}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/50">
                  <Gauge className="size-5 text-indigo-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Mileage
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {listing.mileage.toLocaleString()} KM
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/50">
                  <Settings2 className="size-5 text-indigo-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Condition
                  </span>
                  <span className="font-bold capitalize text-gray-900 dark:text-white">
                    {listing.condition.toLowerCase()}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/50">
                  <MapPin className="size-5 text-indigo-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Region
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {listing.region}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-gray-800">
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
                Description
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-gray-600 dark:text-gray-300">
                {listing.description}
              </p>
            </div>

            {/* Features */}
            {features.length > 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                  Features
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="size-4 flex-shrink-0 text-indigo-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Price + Dealer */}
          <div className="space-y-6">
            <div className="sticky top-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-gray-800">
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                Asking Price
              </p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {listing.currency} {listing.price.toLocaleString()}
              </p>

              {listing.publishedAt && (
                <p className="mt-2 text-xs text-gray-400">
                  Listed on{" "}
                  {new Date(listing.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}

              {/* Dealer info */}
              <div className="mt-6 space-y-3 border-t border-gray-100 pt-6 dark:border-white/5">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Building2 className="size-4 text-indigo-500" />
                  {listing.dealer.dealershipName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {listing.dealer.contactPerson}
                </div>
                {listing.dealer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="size-4 text-gray-400" />
                    {listing.dealer.email}
                  </div>
                )}
                {listing.dealer.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="size-4 text-gray-400" />
                    {listing.dealer.city}
                    {listing.dealer.country
                      ? `, ${listing.dealer.country}`
                      : ""}
                  </div>
                )}
                <a
                  href={`tel:${listing.dealer.phoneNumber}`}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-700"
                >
                  <Phone className="size-4" />
                  {listing.dealer.phoneNumber}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
