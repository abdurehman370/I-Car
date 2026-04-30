"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Mail, Building2, User, Phone, MapPin, Globe, Loader2, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [data, setData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        dealershipName: "",
        contactPerson: "",
        phoneNumber: "",
        address: "",
        city: "",
        country: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
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
        setSuccess(false);

        if (data.password !== data.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/dealer/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    dealershipName: data.dealershipName,
                    contactPerson: data.contactPerson,
                    phoneNumber: data.phoneNumber,
                    address: data.address,
                    city: data.city,
                    country: data.country,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            } else {
                setError(json.message || "Signup failed");
                setLoading(false);
            }
        } catch (err) {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-[#020d1a] px-6">
                <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl text-center animate-in zoom-in duration-500">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registration Successful!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        Your account has been created and is pending admin approval. You will be notified once you can access the portal.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting to login...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row">
            {/* Left side: Hero Image */}
            <div className="relative hidden w-full lg:block lg:w-[40%] xl:w-[45%] left-main-wrapper">
                <Image
                    src="/images/auth/login_img.jpg"
                    alt="Join the Network"
                    fill
                    className="object-cover "
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12 text-white" style={{ zIndex: 3 }}>
                    <h2 className="text-4xl font-bold tracking-tight xl:text-5xl">
                        Join the iCar Network
                    </h2>
                    <p className="mt-4 text-lg text-gray-200">
                        Expand your reach, streamline operations, and grow your dealership with our intelligent platform.
                    </p>
                </div>
                <div className="absolute left-12 top-12 left-logo">
                    <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                            <span className="text-xl font-bold text-white italic">iC</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white ">iCar<span className="text-blue-500">.</span></span>
                    </Link>
                </div>
            </div>

            {/* Right side: Form Card */}
            <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-12 dark:bg-[#020d1a] lg:px-12">
                <div className="w-full max-w-[640px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-8 flex justify-center lg:hidden">
                        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold text-white italic">iC</div>
                            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">iCar<span className="text-blue-500">.</span></span>
                        </Link>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white bottom-content">
                            Dealer Registration
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Apply for a dealer account and get started today.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="dealer@example.com"
                                        required
                                        value={data.email}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Dealership Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dealership Name *</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="dealershipName"
                                        type="text"
                                        placeholder="Elite Motors"
                                        required
                                        value={data.dealershipName}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person *</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="contactPerson"
                                        type="text"
                                        placeholder="John Doe"
                                        required
                                        value={data.contactPerson}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number *</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="phoneNumber"
                                        type="tel"
                                        placeholder="+1 234 567 890"
                                        required
                                        value={data.phoneNumber}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="address"
                                        type="text"
                                        placeholder="123 Luxury Way"
                                        value={data.address}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* City */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="city"
                                        type="text"
                                        placeholder="Dubai"
                                        value={data.city}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Country */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-500" />
                                    <input
                                        name="country"
                                        type="text"
                                        placeholder="UAE"
                                        value={data.country}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password *</label>
                                <div className="relative group">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        value={data.password}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password *</label>
                                <div className="relative group">
                                    <input
                                        name="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        value={data.confirmPassword}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-800 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in zoom-in-95">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                By creating an account you agree to our <Link href="/terms" className="text-blue-600 font-semibold underline underline-offset-2">Terms & Conditions</Link> and <Link href="/privacy" className="text-blue-600 font-semibold underline underline-offset-2">Privacy Policy</Link>.
                            </p>
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Creating Account...</span>
                                    </div>
                                ) : (
                                    "Register for Portal"
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
