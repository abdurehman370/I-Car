import { Car, Search, TrendingUp, History, User } from "lucide-react";

export default function DealerDashboard() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020d1a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dealer Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage your valuations and market analytics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <User className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Valuations"
                        value="128"
                        subValue="+12% from last week"
                        icon={<Search className="size-6 text-indigo-500" />}
                    />
                    <StatCard
                        title="Active Searches"
                        value="14"
                        subValue="3 regions active"
                        icon={<TrendingUp className="size-6 text-green-500" />}
                    />
                    <StatCard
                        title="Market Trend"
                        value="+2.4%"
                        subValue="Average price increase"
                        icon={<TrendingUp className="size-6 text-blue-500" />}
                    />
                    <StatCard
                        title="Recent Activity"
                        value="2 hrs ago"
                        subValue="Last search performed"
                        icon={<History className="size-6 text-purple-500" />}
                    />
                </div>

                {/* Main Interface Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Car className="size-5 text-indigo-500" />
                                Quick Evaluation
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup label="Make" placeholder="e.g. BMW" />
                                <InputGroup label="Model" placeholder="e.g. M3" />
                                <InputGroup label="Year" placeholder="e.g. 2022" />
                                <InputGroup label="Mileage (km)" placeholder="e.g. 45000" />
                            </div>
                            <button className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]">
                                Analyze Market Price
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#0a1526] rounded-3xl p-8 border border-gray-200 dark:border-white/5 shadow-sm h-full">
                            <h2 className="text-xl font-bold mb-6">Recent Valuations</h2>
                            <div className="space-y-4">
                                <RecentValuation title="BMW M4 Competition" date="15 mins ago" price="245,000 AED" />
                                <RecentValuation title="Mercedes AMG G63" date="1 hr ago" price="850,000 AED" />
                                <RecentValuation title="Audi RS6 Avant" date="3 hrs ago" price="420,000 AED" />
                                <RecentValuation title="Porsche 911 GT3" date="Yesterday" price="980,000 AED" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-[#0a1526] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    {icon}
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
            </div>
            <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-xs text-gray-400">{subValue}</div>
            </div>
        </div>
    );
}

function InputGroup({ label, placeholder }: { label: string, placeholder: string }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
            />
        </div>
    );
}

function RecentValuation({ title, date, price }: { title: string, date: string, price: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-indigo-500/20 transition-all cursor-pointer">
            <div>
                <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
                <div className="text-xs text-gray-500">{date}</div>
            </div>
            <div className="text-sm font-bold text-indigo-500">{price}</div>
        </div>
    );
}
