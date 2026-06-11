"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Building2,
  Mail,
  Phone,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  dealerDisplayName,
  effectiveApprovalStatus,
  roleBadgeClass,
  roleFilterToDbRole,
  roleLabel,
  type PlatformRoleFilter,
} from "@/lib/dealer-roles";

interface PlatformUser {
  id: number;
  email: string;
  dealershipName: string | null;
  contactPerson: string;
  phoneNumber: string;
  address: string | null;
  city: string | null;
  country: string | null;
  role: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt?: string;
}

type UsersApiResponse = {
  data: PlatformUser[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const ROLE_FILTERS: { value: PlatformRoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dealers", label: "Dealers" },
  { value: "users", label: "Users" },
  { value: "partners", label: "Partners" },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(role: string, approvalStatus: string) {
  const status = effectiveApprovalStatus(role, approvalStatus);
  const label =
    status === "active"
      ? "Active"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md",
        status === "approved" || status === "active"
          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
          : status === "rejected"
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-white/5 text-gray-500 border-white/10"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "approved" || status === "active"
            ? "bg-cyan-400 animate-pulse"
            : status === "rejected"
              ? "bg-red-400"
              : "bg-gray-600"
        )}
      />
      {label}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<PlatformRoleFilter>("all");
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (search.trim()) params.set("q", search.trim());
      const dbRole = roleFilterToDbRole(roleFilter);
      if (dbRole) params.set("role", dbRole);

      const res = await fetch(`/api/admin/getDealers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: UsersApiResponse = await res.json();
      setUsers(json.data ?? []);
      setTotal(json.meta?.total ?? json.data?.length ?? 0);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredCount = useMemo(() => users.length, [users]);

  return (
    <>
      <Breadcrumb pageName="Users" />

      <div className="panel p-4 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 sm:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, email, city, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-gray-600"
            />
          </div>

          <div className="flex gap-2 p-1 rounded-2xl bg-black/20 border border-white/5 overflow-x-auto no-scrollbar">
            {ROLE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  roleFilter === value
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/30"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 w-fit">
          Total Results: <span className="text-cyan-400 font-bold">{total}</span>
        </div>

        <div className="panel border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-500 mb-4 opacity-20" />
              <p className="text-gray-400 font-bold">No users found</p>
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mt-1">
                Try a different search or filter
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Account</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Contact</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Email</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Role</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Location</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-5 text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.04] transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                            <Building2 className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-bold text-white tracking-tight">
                              {dealerDisplayName(user)}
                            </p>
                            <p className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">
                              <Phone className="h-3 w-3" />
                              {user.phoneNumber}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-medium">
                        {user.contactPerson}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="text-[10px] font-mono lowercase">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            roleBadgeClass(user.role)
                          )}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.role, user.approvalStatus)}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && users.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredCount} of {total} registered accounts
          </p>
        )}
      </div>
    </>
  );
}
