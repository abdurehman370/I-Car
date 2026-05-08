"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ApprovalQueue({ items }: { items: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="panel border-white/5 p-6 bg-white/[0.02]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">QUEUE</p>
          <h3 className="text-lg font-bold mt-1 text-white">Pending Approvals</h3>
        </div>
        <Link 
          href="/admin/authenticate-dealers"
          className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center gap-2"
        >
          {items.length} PENDING <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="space-y-4">
        {items.length > 0 ? items.map((d) => (
          <div key={d.name} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all">
            <div>
              <p className="text-sm font-bold text-white">{d.name}</p>
              <p className="text-[10px] font-mono text-gray-500 tracking-wider uppercase">{d.region} · {d.time}</p>
            </div>
            <Link 
              href="/admin/authenticate-dealers"
              className="px-4 h-8 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-cyan-500 text-black hover:scale-105 transition-all flex items-center justify-center"
            >
              Review
            </Link>
          </div>
        )) : (
          <div className="py-10 text-center text-gray-500 text-sm italic">
            No pending approvals at this time
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PlatformFeed({ items }: { items: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="panel border-white/5 p-6 bg-white/[0.02]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">REAL-TIME</p>
          <h3 className="text-lg font-bold mt-1 text-white">Platform Feed</h3>
        </div>
        <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
      </div>
      <div className="space-y-4">
        {items.map((t, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_8px_#22d3ee]" />
            <span className="text-gray-400 leading-snug text-[13px]">{t}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
