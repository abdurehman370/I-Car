"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Car, MapPin, Calendar, Gauge, Tag, Building2,
    Phone, ChevronLeft, Loader2, AlertCircle, CheckCircle,
    Fuel, Settings2,
} from "lucide-react";

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
        dealershipName: string;
        contactPerson: string;
        phoneNumber: string;
        city: string | null;
        country: string | null;
    };
}

const CONDITION_STYLES: Record<string, string> = {
    NEW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    USED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    CERTIFIED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    SOLD: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function ListingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/listings/${id}`)
            .then((res) => {
                if (res.status === 404) { setNotFound(true); return null; }
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
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="size-10 text-cyan-500 animate-spin" />
            </div>
        );
    }

    if (notFound || !listing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <AlertCircle className="size-16 text-gray-300" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Listing Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400">This listing may have been removed or the link is invalid.</p>
                <button
                    onClick={() => router.back()}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-xl font-bold transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                    <ChevronLeft className="size-4" /> Go Back
                </button>
            </div>
        );
    }

    const features: string[] = (() => {
        try { return JSON.parse(listing.features); } catch { return []; }
    })();

    const primaryIdx = listing.images.findIndex((i) => i.isPrimary);
    const orderedImages = listing.images.length > 0
        ? [
            listing.images[primaryIdx >= 0 ? primaryIdx : 0],
            ...listing.images.filter((_, i) => i !== (primaryIdx >= 0 ? primaryIdx : 0)),
          ]
        : [];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-cyan-400 transition-colors font-medium"
            >
                <ChevronLeft className="size-5" />
                Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left — Images + Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Image gallery */}
                    <div className="panel overflow-hidden border-white/5">
                        {orderedImages.length > 0 ? (
                            <>
                                <div className="w-full aspect-[16/9] bg-gray-100 dark:bg-[#020d1a]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={orderedImages[activeImage]?.url}
                                        alt={`${listing.make} ${listing.model}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {orderedImages.length > 1 && (
                                    <div className="flex gap-2 p-4 overflow-x-auto">
                                        {orderedImages.map((img, idx) => (
                                            <button
                                                key={img.id}
                                                onClick={() => setActiveImage(idx)}
                                                className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                                                    activeImage === idx
                                                        ? "border-cyan-500 shadow-md shadow-cyan-500/20"
                                                        : "border-transparent opacity-60 hover:opacity-100"
                                                }`}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img.url}
                                                    alt={`View ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full aspect-[16/9] bg-gray-100 dark:bg-[#020d1a] flex items-center justify-center">
                                <Car className="size-20 text-gray-300 dark:text-gray-700" />
                            </div>
                        )}
                    </div>

                    {/* Title + badges */}
                    <div className="panel p-6 border-white/5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    {listing.year} {listing.make} {listing.model}
                                    {listing.variant && <span className="text-gray-500 dark:text-gray-400 font-normal"> — {listing.variant}</span>}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                    <MapPin className="size-4" /> {listing.city}, {listing.region}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${CONDITION_STYLES[listing.condition] ?? "bg-gray-100 text-gray-600"}`}>
                                    {listing.condition}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[listing.status] ?? "bg-gray-100 text-gray-600"}`}>
                                    {listing.status}
                                </span>
                            </div>
                        </div>

                        {/* Key specs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                            <div className="flex flex-col items-center gap-1 p-3 bg-white/5 dark:bg-black/20 rounded-2xl">
                                <Calendar className="size-5 text-cyan-500" />
                                <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Year</span>
                                <span className="font-bold text-foreground">{listing.year}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 p-3 bg-white/5 dark:bg-black/20 rounded-2xl">
                                <Gauge className="size-5 text-cyan-500" />
                                <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Mileage</span>
                                <span className="font-bold text-foreground">{listing.mileage.toLocaleString()} KM</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 p-3 bg-white/5 dark:bg-black/20 rounded-2xl">
                                <Settings2 className="size-5 text-cyan-500" />
                                <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Condition</span>
                                <span className="font-bold text-foreground capitalize">{listing.condition.toLowerCase()}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 p-3 bg-white/5 dark:bg-black/20 rounded-2xl">
                                <MapPin className="size-5 text-cyan-500" />
                                <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Region</span>
                                <span className="font-bold text-foreground">{listing.region}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="panel p-6 border-white/5">
                        <h2 className="text-lg font-bold text-foreground mb-3">Description</h2>
                        <p className="text-foreground leading-relaxed whitespace-pre-line opacity-80">{listing.description}</p>
                    </div>

                    {/* Features */}
                    {features.length > 0 && (
                        <div className="panel p-6 border-white/5">
                            <h2 className="text-lg font-bold text-foreground mb-4">Features</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                                        <CheckCircle className="size-4 text-cyan-500 flex-shrink-0" />
                                        <span className="font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Price + Dealer */}
                <div className="space-y-6">
                    {/* Price card */}
                    <div className="panel p-6 border-white/5 sticky top-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Asking Price</p>
                        <p className="text-3xl font-bold text-cyan-500 dark:text-cyan-400">
                            {listing.currency} {listing.price.toLocaleString()}
                        </p>

                        {listing.publishedAt && (
                            <p className="text-xs text-gray-400 mt-2">
                                Listed on {new Date(listing.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        )}

                        {/* Dealer info */}
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 space-y-3">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="size-4 text-cyan-500" />
                                {listing.dealer.dealershipName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-foreground opacity-70">
                                <Tag className="size-4 text-muted-foreground" />
                                {listing.dealer.contactPerson}
                            </div>
                            {listing.dealer.city && (
                                <div className="flex items-center gap-2 text-sm text-foreground opacity-70">
                                    <MapPin className="size-4 text-muted-foreground" />
                                    {listing.dealer.city}{listing.dealer.country ? `, ${listing.dealer.country}` : ""}
                                </div>
                            )}
                            <a
                                href={`tel:${listing.dealer.phoneNumber}`}
                                className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-2xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/20"
                            >
                                <Phone className="size-4" />
                                {listing.dealer.phoneNumber}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
