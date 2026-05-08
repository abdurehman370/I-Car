"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { User, Lock, Shield, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminProfilePage() {
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [role, setRole] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((data) => {
        setUsername(data.username ?? "");
        setOriginalUsername(data.username ?? "");
        setRole(data.role ?? "admin");
        setCreatedAt(data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "");
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return toast.error("Username cannot be empty");
    setSavingInfo(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || "Failed to update");
      toast.success("Profile updated!");
      setOriginalUsername(data.username);
    } catch {
      toast.error("An error occurred");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return toast.error("Enter your current password");
    if (!newPassword) return toast.error("Enter a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || "Failed to update password");
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("An error occurred");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-500 uppercase mb-1">
          ADMIN · SETTINGS
        </p>
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account credentials and security</p>
      </div>

      {/* Account Overview Badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="panel border-white/5 p-5 bg-white/[0.02] mb-6 flex items-center gap-5"
      >
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
          <span className="text-2xl font-bold text-cyan-400">{originalUsername?.[0]?.toUpperCase() ?? "A"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white truncate">{originalUsername}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              <Shield className="h-3 w-3" /> {role}
            </span>
            {createdAt && (
              <span className="text-[11px] text-gray-500 font-mono">Member since {createdAt}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="panel border-white/5 bg-white/[0.02] mb-6 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <User className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Personal Information</h2>
            <p className="text-[11px] text-gray-500">Update your display name</p>
          </div>
        </div>
        <form onSubmit={handleSaveInfo} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-gray-400" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setUsername(originalUsername)}
              className="px-5 h-10 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 hover:text-white transition-all"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={savingInfo || username === originalUsername}
              className="px-5 h-10 rounded-xl bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingInfo ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="panel border-white/5 bg-white/[0.02] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Lock className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Change Password</h2>
            <p className="text-[11px] text-gray-500">Keep your account secure with a strong password</p>
          </div>
        </div>
        <form onSubmit={handleSavePassword} className="p-6 space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-gray-400" htmlFor="current-pass">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-pass"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 pl-4 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-gray-400" htmlFor="new-pass">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-pass"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-11 pl-4 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={cn("h-full transition-all rounded-full", newPassword.length < 6 ? "w-1/4 bg-red-500" : newPassword.length < 10 ? "w-1/2 bg-amber-500" : "w-full bg-emerald-500")} />
                </div>
                <span className={cn("text-[10px] font-mono font-bold", newPassword.length < 6 ? "text-red-400" : newPassword.length < 10 ? "text-amber-400" : "text-emerald-400")}>
                  {newPassword.length < 6 ? "Weak" : newPassword.length < 10 ? "Good" : "Strong"}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-widest uppercase text-gray-400" htmlFor="confirm-pass">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-pass"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={cn(
                  "w-full h-11 pl-4 pr-11 rounded-xl bg-white/5 border text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-all",
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                    : confirmPassword && confirmPassword === newPassword
                    ? "border-emerald-500/40 focus:border-emerald-500/60 focus:ring-emerald-500/20"
                    : "border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                )}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-400 font-mono">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
              className="px-5 h-10 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 hover:text-white transition-all"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="px-5 h-10 rounded-xl bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
