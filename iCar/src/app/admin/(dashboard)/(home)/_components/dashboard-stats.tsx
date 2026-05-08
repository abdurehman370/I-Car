"use client";

import { motion } from "framer-motion";
import {
  Users, ListChecks, ShieldCheck, Globe2,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface StatProps {
  icon: any;
  label: string;
  value: number;
  delta: string;
  trend?: "up" | "down" | "flat";
}

function BigStat({ icon: Icon, label, value, delta, trend = "up" }: StatProps) {
  return (
    <div className="relative panel p-4 hover:border-cyan-400/40 transition group overflow-hidden bg-white/[0.02]">
      <div className="flex items-center justify-between mb-3 relative z-10">
        <Icon className="h-4 w-4 text-cyan-400" />
        <span className={`text-[10px] font-mono font-bold ${
          trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-500"
        }`}>
          {delta}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground relative z-10">
        <AnimatedNumber value={value} />
      </p>
      <p className="font-mono text-[9px] tracking-[0.25em] text-gray-500 uppercase mt-1 relative z-10">{label}</p>
      
      {/* Background Glow */}
      <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-cyan-400/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative panel-elevated border-luminous overflow-hidden p-6 md:p-10 mb-8"
    >
      <div className="absolute inset-0 bg-hero opacity-90" />
      <div className="absolute inset-0 bg-hud-grid opacity-30" />
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-400/30 text-[10px] font-mono tracking-[0.25em] text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-glow" />
            COMMAND CENTER · LIVE
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-foreground">
            Platform <span className="text-gradient">Overview</span>
          </h1>
          <p className="text-gray-400 max-w-md text-sm">
            Real-time intelligence across dealers, listings, and market activity.
          </p>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-3">
          <BigStat icon={Users} label="DEALERS" value={stats.dealers} delta={`+${stats.newDealers}`} />
          <BigStat icon={ListChecks} label="LISTINGS" value={stats.listings} delta={`+${stats.newListings}`} />
          <BigStat icon={ShieldCheck} label="PENDING" value={stats.pending} delta={stats.pendingDelta} trend={stats.pendingTrend} />
          <BigStat icon={Globe2} label="REGIONS" value={stats.regions} delta="active" trend="flat" />
        </div>
      </div>
    </motion.section>
  );
}
