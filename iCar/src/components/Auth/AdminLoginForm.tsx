"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [data, setData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.message || "Login failed");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-gray-300">
            Username
          </label>
          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-cyan-400">
              <User size={18} />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              required
              value={data.username}
              onChange={handleChange}
              className="flex h-12 w-full rounded-xl border border-white/10 bg-[#0d1526] py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-300">
            Password
          </label>
          <div className="group relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-cyan-400">
              <Lock size={18} />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={data.password}
              onChange={handleChange}
              className="flex h-12 w-full rounded-xl border border-white/10 bg-[#0d1526] py-2 pl-10 pr-12 text-sm text-white placeholder:text-gray-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 text-sm font-semibold text-[#0B1121] shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-teal-400 hover:shadow-cyan-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1121] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          "Sign in to Admin"
        )}
      </button>
    </form>
  );
}
