"use client";

import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function GrowthChart({ data }: { data: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="panel border-white/5 p-6 bg-white/[0.02]"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">PLATFORM GROWTH · 7M</p>
          <h3 className="text-xl font-bold mt-1 text-foreground">Listings & Inventory</h3>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="listings" stroke="#22d3ee" strokeWidth={3} fill="url(#ag1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
