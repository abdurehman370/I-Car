import { Suspense } from "react";
import { getOverviewData, getDashboardQueue, getPlatformFeed } from "./fetch";
import { DashboardStats } from "./_components/dashboard-stats";
import { GrowthChart } from "./_components/dashboard-charts";
import { ApprovalQueue, PlatformFeed } from "./_components/dashboard-queue";

export default async function Home() {
  const [data, queue, feed] = await Promise.all([
    getOverviewData(),
    getDashboardQueue(),
    getPlatformFeed()
  ]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* PANORAMIC OVERVIEW & STATS */}
      <Suspense fallback={<div className="h-96 panel animate-pulse" />}>
        <DashboardStats stats={data} />
      </Suspense>

      {/* GROWTH & ANALYTICS */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
           <Suspense fallback={<div className="h-80 panel animate-pulse" />}>
              <GrowthChart data={data.trendData} />
           </Suspense>
        </div>
        
        <div className="col-span-12 lg:col-span-4 panel border-white/5 p-6 bg-white/[0.02]">
            <p className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">DISTRIBUTION</p>
            <h3 className="text-lg font-bold mt-1 mb-6 text-white">Regional Activity</h3>
            <div className="space-y-4">
                {data.regionalDistribution.length > 0 ? data.regionalDistribution.map((item) => (
                    <div key={item.region} className="space-y-2">
                        <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-gray-400">
                            <span>{item.region}</span>
                            <span>{item.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                                style={{ width: `${item.value}%` }}
                            />
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 italic py-10 text-center">No regional data available</p>
                )}
            </div>
        </div>
      </div>

      {/* QUEUE & FEED */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
           <Suspense fallback={<div className="h-96 panel animate-pulse" />}>
              <ApprovalQueue items={queue} />
           </Suspense>
        </div>

        <div className="col-span-12 lg:col-span-5">
           <Suspense fallback={<div className="h-96 panel animate-pulse" />}>
              <PlatformFeed items={feed} />
           </Suspense>
        </div>
      </div>
    </div>
  );
}
