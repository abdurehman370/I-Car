"use client";

import Link from "next/link";
import { Car, PlusCircle, BarChart3, TrendingUp, DollarSign } from "lucide-react";

export default function DealerDashboard() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400">Welcome back to your dealer portal</p>
                    </div>
                    <Link
                        href="/list-vehicle"
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <PlusCircle className="size-5" />
                        List a Vehicle
                    </Link>
                </div>

                {/* Quick Stats (Placeholders for now) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#0a1526] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                                <Car className="size-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Active Listings</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">0</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0a1526] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl">
                                <DollarSign className="size-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AED 0</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0a1526] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                                <BarChart3 className="size-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Views</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">0</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Empty State / Call to Action */}
                <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-12 border border-gray-200 dark:border-white/5 shadow-sm text-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Car className="size-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No active listings</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                        Start building your inventory by listing your first vehicle. Use our valuation tool to get the best price.
                    </p>
                    <Link
                        href="/list-vehicle"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <PlusCircle className="size-5" />
                        Start Listing
                    </Link>
                </div>
            </div>
        </div>
    );
}
