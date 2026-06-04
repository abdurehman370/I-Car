"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    Phone,
    MapPin,
    Building2,
    User,
    Eye,
    RefreshCw,
    AlertCircle,
    FileText,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =====================
// Types
// =====================
interface Dealer {
    id: number;
    email: string;
    dealershipName: string;
    contactPerson: string;
    phoneNumber: string;
    address: string;
    city: string;
    country: string;
    role: string;
    approvalStatus: "pending" | "approved" | "rejected";
    licenseDocumentUrl?: string | null;
    createdAt: string;
    updatedAt?: string;
}

function isImageLicense(url: string): boolean {
    return /\.(jpe?g|png|webp)$/i.test(url);
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

type DealersApiResponse =
    | {
        data: Dealer[];
        meta?: {
            page?: number;
            limit?: number;
            total?: number;
            totalPages?: number;
        };
    }
    | Dealer[]; // supports if your API returns just array

// =====================
// Component
// =====================
const AuthenticateDealers: React.FC = () => {
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

    // Loading & error states
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null); // dealerId being updated
    const [error, setError] = useState<string>("");

    // =====================
    // Fetch Dealers
    // =====================
    const fetchDealers = async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;

        if (!silent) setLoading(true);
        setRefreshing(silent ? true : false);
        setError("");

        try {
            const res = await fetch("/api/admin/getDealers", {
                method: "GET",
                credentials: "include", // include cookies (admin-session)
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                },
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `Failed to fetch dealers (HTTP ${res.status})`);
            }

            const json: DealersApiResponse = await res.json();

            // Support both response shapes:
            // 1) { data: [...], meta: ... }
            // 2) [...]
            const list = Array.isArray(json) ? json : json.data;

            setDealers(list ?? []);
        } catch (e: any) {
            setError(e?.message || "Failed to load dealers");
            setDealers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDealers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =====================
    // Filtering
    // =====================
    const filteredDealers: Dealer[] = useMemo(() => {
        return dealers.filter((dealer) => {
            const matchesSearch =
                dealer.dealershipName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dealer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dealer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                filterStatus === "all" || dealer.approvalStatus === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [dealers, searchTerm, filterStatus]);

    // =====================
    // Actions
    // =====================
    const updateDealerStatus = async (dealerId: number, status: "approved" | "rejected") => {
        setActionLoading(dealerId);
        setError("");

        try {
            const res = await fetch("/api/admin/dealers/updateStatus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dealerId, status }),
            });

            if (!res.ok) {
                const msg = await res.json().catch(() => ({ message: "Failed to update status" }));
                throw new Error(msg.message || "Failed to update status");
            }

            // Optimistic UI update or just re-fetch?
            // Let's update local state to be fast
            setDealers((prev) =>
                prev.map((d) => (d.id === dealerId ? { ...d, approvalStatus: status } : d))
            );

            // Update selected dealer if modal is open
            if (selectedDealer?.id === dealerId) {
                setSelectedDealer((prev) => prev ? { ...prev, approvalStatus: status } : null);
            }

            // Close modal after successful action
            setShowDetailModal(false);

        } catch (e: any) {
            setError(e?.message || `Failed to ${status} dealer`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleApprove = async (dealerId: number): Promise<void> => {
        await updateDealerStatus(dealerId, "approved");
    };

    const handleReject = async (dealerId: number): Promise<void> => {
        await updateDealerStatus(dealerId, "rejected");
    };

    const viewDetails = (dealer: Dealer): void => {
        setSelectedDealer(dealer);
        setShowDetailModal(true);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (
        status: "pending" | "approved" | "rejected"
    ): React.ReactElement => {
        const styles = {
            pending:
                "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
            approved:
                "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
            rejected:
                "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        };

        const icons = {
            pending: <Clock className="w-3 h-3" />,
            approved: <CheckCircle className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />,
        };

        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
            >
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Stats based on loaded dealers
    const pendingCount = dealers.filter((d) => d.approvalStatus === "pending").length;
    const approvedCount = dealers.filter((d) => d.approvalStatus === "approved").length;
    const rejectedCount = dealers.filter((d) => d.approvalStatus === "rejected").length;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400 mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
                            ADMIN · MASTER WORKSPACE
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Dealer <span className="text-gradient">Registrations</span>
                        </h1>
                        <p className="text-gray-400 mt-2 max-w-lg text-sm">
                            Review and approve dealer registration requests to maintain platform integrity.
                        </p>
                    </div>

                    <button
                        onClick={() => fetchDealers({ silent: true })}
                        className="h-12 px-6 rounded-2xl glass border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm font-bold"
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                        Refresh Data
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                    Failed to load dealers
                                </p>
                                <p className="text-sm text-red-700/80 dark:text-red-300/80 break-words">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="h-28 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                            <div className="h-28 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                            <div className="h-28 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                        </div>

                        <div className="h-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                        <div className="h-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="panel p-6 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                                            Pending Requests
                                        </p>
                                        <p className="text-3xl font-bold text-yellow-500 tracking-tight">
                                            {pendingCount}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                        <Clock className="w-6 h-6 text-yellow-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="panel p-6 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                                            Approved Dealers
                                        </p>
                                        <p className="text-3xl font-bold text-cyan-400 tracking-tight">
                                            {approvedCount}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                                        <CheckCircle className="w-6 h-6 text-cyan-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="panel p-6 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                                            Rejected Requests
                                        </p>
                                        <p className="text-3xl font-bold text-red-500 tracking-tight">
                                            {rejectedCount}
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <XCircle className="w-6 h-6 text-red-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Search */}
                        <div className="panel p-4 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20">
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1 relative group">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by dealership, email, or contact person..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-gray-600"
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="flex gap-2 p-1 rounded-2xl bg-black/20 border border-white/5 overflow-x-auto no-scrollbar">
                                    {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                                filterStatus === status
                                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                            )}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Dealers Table */}
                        <div className="panel overflow-hidden border-white/5 bg-white/[0.02] shadow-xl shadow-black/20">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Dealership</th>
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Contact</th>
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Location</th>
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredDealers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                                        <Building2 className="w-12 h-12 mb-4 opacity-20" />
                                                        <p className="text-lg font-bold text-gray-400">No dealers found</p>
                                                        <p className="text-xs uppercase tracking-widest font-mono mt-1">Try adjusting your filters</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDealers.map((dealer) => (
                                                <tr
                                                    key={dealer.id}
                                                    className="group hover:bg-white/[0.04] transition-all"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                                                                <Building2 className="w-5 h-5 text-cyan-400" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-white tracking-tight">
                                                                    {dealer.dealershipName}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                                                                    ID: #{dealer.id} · {dealer.phoneNumber}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-300 font-medium">{dealer.contactPerson}</div>
                                                        <div className="text-[10px] font-mono text-gray-500 lowercase mt-0.5">{dealer.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-300">{dealer.city}</div>
                                                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">{dealer.country}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                            dealer.role === "Car Dealers"
                                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                                : dealer.role === "Baking Sector/Partners"
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                                : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                                        )}>
                                                            {dealer.role || "User"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(dealer.approvalStatus)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => viewDetails(dealer)}
                                                                className="h-9 w-9 rounded-xl glass border border-white/10 text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>

                                                            {dealer.approvalStatus === "pending" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApprove(dealer.id)}
                                                                        className="h-9 w-9 rounded-xl glass border border-white/10 text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center disabled:opacity-50"
                                                                        title={dealer.role === "Car Dealers" && !dealer.licenseDocumentUrl ? "License required to approve Car Dealers" : "Approve"}
                                                                        disabled={actionLoading !== null || (dealer.role === "Car Dealers" && !dealer.licenseDocumentUrl)}
                                                                    >
                                                                        {actionLoading === dealer.id ? (
                                                                            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                                                                        ) : (
                                                                            <CheckCircle className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReject(dealer.id)}
                                                                        className="h-9 w-9 rounded-xl glass border border-white/10 text-gray-400 hover:text-red-400 transition-all flex items-center justify-center disabled:opacity-50"
                                                                        title="Reject"
                                                                        disabled={actionLoading !== null}
                                                                    >
                                                                        {actionLoading === dealer.id ? (
                                                                            <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                                                                        ) : (
                                                                            <XCircle className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detail Modal */}
                        {showDetailModal && selectedDealer && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
                                <div className="panel-elevated glass-strong w-full max-w-lg animate-in zoom-in-95 duration-300 border-cyan-400/20 shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col max-h-[90vh]">
                                    {/* Modal Header */}
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                                                <Building2 className="size-4 text-cyan-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-white tracking-tight">
                                                    Dealer Details
                                                </h2>
                                                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                                                    Review registration documents
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowDetailModal(false)} 
                                            className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <XCircle className="size-5" />
                                        </button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Current Status</span>
                                            {getStatusBadge(selectedDealer.approvalStatus)}
                                        </div>

                                        <div className="space-y-6">
                                            {[
                                                { icon: Building2, label: "Dealership Name", value: selectedDealer.dealershipName, bold: true },
                                                { icon: User, label: "Contact Person", value: selectedDealer.contactPerson },
                                                { icon: Mail, label: "Email Address", value: selectedDealer.email },
                                                { icon: Phone, label: "Phone Number", value: selectedDealer.phoneNumber },
                                                { icon: MapPin, label: "Location", value: `${selectedDealer.address || "—"}, ${selectedDealer.city || "—"}, ${selectedDealer.country || "—"}` },
                                                { icon: Clock, label: "Registered On", value: formatDate(selectedDealer.createdAt) },
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                                                        <item.icon className="size-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                                                        <p className={cn("text-sm text-gray-200", item.bold && "font-bold text-white")}>{item.value}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20 shrink-0">
                                                        <FileText className="size-4 text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider mb-1">
                                                            Dealership License
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            Review this document before approving the dealer.
                                                        </p>
                                                    </div>
                                                </div>

                                                {selectedDealer.licenseDocumentUrl ? (
                                                    <>
                                                        <a
                                                            href={selectedDealer.licenseDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-white/10 transition-all"
                                                        >
                                                            <ExternalLink className="size-4" />
                                                            Open license in new tab
                                                        </a>
                                                        {isImageLicense(selectedDealer.licenseDocumentUrl) && (
                                                            <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={selectedDealer.licenseDocumentUrl}
                                                                    alt="Dealership license"
                                                                    className="w-full max-h-80 object-contain"
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-yellow-500/90 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
                                                        No license document on file (registered before license upload was required).
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    {selectedDealer.approvalStatus === "pending" && (
                                        <div className="p-6 border-t border-white/5 flex flex-col gap-3 bg-white/[0.02] shrink-0">
                                            {selectedDealer.role === "Car Dealers" && !selectedDealer.licenseDocumentUrl && (
                                                <p className="text-xs text-yellow-500 text-center">
                                                    Cannot approve Car Dealers without a license document on file.
                                                </p>
                                            )}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleReject(selectedDealer.id)}
                                                    className="flex-1 h-12 glass border border-white/5 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm"
                                                    disabled={actionLoading !== null}
                                                >
                                                    {actionLoading === selectedDealer.id ? <RefreshCw className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(selectedDealer.id)}
                                                    className="flex-[2] h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-black rounded-xl font-bold transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:hover:scale-100"
                                                    disabled={actionLoading !== null || (selectedDealer.role === "Car Dealers" && !selectedDealer.licenseDocumentUrl)}
                                                    title={selectedDealer.role === "Car Dealers" && !selectedDealer.licenseDocumentUrl ? "License document required to approve Car Dealers" : undefined}
                                                >
                                                    {actionLoading === selectedDealer.id ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthenticateDealers;
