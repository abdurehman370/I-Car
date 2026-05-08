import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import type { JSX, SVGProps } from "react";

type PropsType = {
  label: string;
  data: {
    value: number | string;
    growthRate: number;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

export function OverviewCard({ label, data, Icon }: PropsType) {
  const isDecreasing = data.growthRate < 0;

  return (
    <div className="panel p-6 border-white/5 bg-white/[0.02] shadow-xl shadow-black/20 group hover:border-cyan-400/30 transition-all relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className="h-12 w-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] group-hover:scale-110 transition-transform">
             <Icon className="size-6 text-cyan-400" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider border",
              isDecreasing 
                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]",
            )}
          >
            {data.growthRate}%
            {isDecreasing ? (
              <ArrowDownIcon className="size-3" />
            ) : (
              <ArrowUpIcon className="size-3" />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
            {data.value}
          </h3>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">
            {label}
          </p>
        </div>
      </div>
      
      {/* Glow Effect */}
      <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-cyan-400/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
