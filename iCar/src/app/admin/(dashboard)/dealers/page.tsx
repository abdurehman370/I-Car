"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Dealer {
  id: number;
  email: string;
  dealershipName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string | null;
  city: string | null;
  country: string | null;
  approvalStatus: string;
  createdAt: string;
  updatedAt?: string;
}

type DealersApiResponse = {
  data: Dealer[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    approved:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    rejected:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  };
  const s = status?.toLowerCase() || "pending";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[s] || styles.pending}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [total, setTotal] = useState(0);

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/getDealers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: DealersApiResponse = await res.json();
      setDealers(json.data ?? []);
      setTotal(json.meta?.total ?? json.data?.length ?? 0);
    } catch {
      setDealers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  return (
    <>
      <Breadcrumb pageName="Dealers" />

      <div className="panel p-4 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 sm:p-6 space-y-6">
        {/* Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search dealers by name, email, city..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-gray-600"
            />
          </div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
            Total Results: <span className="text-cyan-400 font-bold">{total}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : dealers.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                No dealers found
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Dealership
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Email
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Location
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dealers.map((d) => (
                  <tr
                    key={d.id}
                    className="group hover:bg-white/[0.04] transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                          <Building2 className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white tracking-tight">
                            {d.dealershipName}
                          </p>
                          <p className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">
                            <Phone className="h-3 w-3" />
                            {d.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                      {d.contactPerson}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-[10px] font-mono lowercase">{d.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(d.approvalStatus)}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      {formatDate(d.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && dealers.length > 0 && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Showing {dealers.length} of {total} dealers
          </p>
        )}
      </div>
    </>
  );
}
