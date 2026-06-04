"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dealer/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        setError(json.message || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left side: Hero Image */}
      <div className="relative hidden w-full lg:block lg:w-[45%] xl:w-[50%] left-main-wrapper">
        <Image
          src="/images/auth/login_img.jpg"
          alt="Premium Automotive Hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white" style={{ zIndex: 3 }}>
          <h2 className="text-4xl font-bold tracking-tight xl:text-5xl">
            Dealer Portal
          </h2>
          <p className="mt-4 text-lg text-gray-200">
            Manage your inventory, track leads, and optimize pricing with our premium automotive suite.
          </p>
        </div>
        {/* Brand/Logo Area */}
        <div className="absolute left-12 top-12 left-logo">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-xl font-bold text-white italic">iC</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              iCar<span className="text-blue-500">.</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Right side: Form Card */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-12 dark:bg-[#020d1a] lg:px-12">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold text-white italic">
                iC
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                iCar<span className="text-blue-500">.</span>
              </span>
            </Link>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Enter your credentials to access your dealership dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@dealership.com"
                    autoComplete="email"
                    required
                    value={data.email}
                    onChange={handleChange}
                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-10 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:text-white group-hover:border-gray-300 dark:group-hover:border-gray-700 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium leading-none text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={data.password}
                      onChange={handleChange}
                      className="flex h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-12 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:text-white group-hover:border-gray-300 dark:group-hover:border-gray-700 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950"
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                Remember this device
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign in to Portal"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Authorized personnel only.{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              Create dealer account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
