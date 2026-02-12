import Link from "next/link";
import { MoveRight, Car, BarChart3, ShieldCheck, Building2, UserCircle } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#020d1a] text-white selection:bg-indigo-500/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020d1a]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Car className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">iCar<span className="text-indigo-500">.</span></span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/login"
                            className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <UserCircle className="w-4 h-4" />
                            Admin Portal
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                Live Market Analysis
                            </div>

                            <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                                Evaluate Cars with <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                    Precision AI.
                                </span>
                            </h1>

                            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                                Connect your dealership to real-time market data across UAE, Lebanon, and Europe. Get accurate valuations in seconds.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href="/login"
                                    className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                                >
                                    Dealer Login
                                    <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center active:scale-[0.98]"
                                >
                                    Join as Dealer
                                </Link>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-[#0a1526] border border-white/10 rounded-[2.5rem] overflow-hidden aspect-video shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                                <div className="p-8 h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse"></div>
                                            <div className="h-8 w-48 bg-white/10 rounded-full animate-pulse delay-75"></div>
                                        </div>
                                        <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                                            <BarChart3 className="text-indigo-400 w-6 h-6" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="h-24 bg-white/5 rounded-3xl p-4 flex flex-col justify-end gap-2 border border-white/5">
                                                <div className="h-2 w-full bg-indigo-500/50 rounded-full"></div>
                                                <div className="h-2 w-2/3 bg-white/10 rounded-full"></div>
                                            </div>
                                            <div className="h-24 bg-white/5 rounded-3xl p-4 flex flex-col justify-end gap-2 border border-white/5">
                                                <div className="h-2 w-full bg-purple-500/50 rounded-full"></div>
                                                <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
                                            </div>
                                            <div className="h-24 bg-indigo-600/20 rounded-3xl p-4 flex flex-col justify-end gap-2 border border-indigo-500/20">
                                                <div className="h-2 w-full bg-indigo-400 rounded-full"></div>
                                                <div className="h-2 w-3/4 bg-white/20 rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-32 grid md:grid-cols-3 gap-8">
                        <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:border-indigo-500/30 transition-colors group">
                            <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="text-indigo-500 w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Live Market Data</h3>
                            <p className="text-gray-400 leading-relaxed">Access fresh listings from Dubizzle, AutoScout24 and more instantly.</p>
                        </div>

                        <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:border-indigo-500/30 transition-colors group">
                            <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="text-purple-500 w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Verified Dealers</h3>
                            <p className="text-gray-400 leading-relaxed">Secure portal dedicated to approved dealership networks.</p>
                        </div>

                        <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:border-indigo-500/30 transition-colors group">
                            <div className="w-14 h-14 bg-pink-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Building2 className="text-pink-500 w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Global Regions</h3>
                            <p className="text-gray-400 leading-relaxed">Specialized clients for UAE, Lebanon, and European markets.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-500 text-sm">
                        © 2024 iCar Evaluation Systems. All rights reserved.
                    </div>
                    <div className="flex gap-8 text-sm font-medium text-gray-500">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
