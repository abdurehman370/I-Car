import prisma from "@/lib/db";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export async function getOverviewData() {
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();

  const [
    totalDealers,
    newDealers,
    totalListings,
    newListings,
    pendingApprovals,
    regionsCount
  ] = await Promise.all([
    prisma.dealer.count(),
    prisma.dealer.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.dealer.count({ where: { approvalStatus: 'pending' } }),
    prisma.listing.groupBy({
      by: ['region'],
      _count: true,
    }).then(res => res.length)
  ]);

  // For trend data, we can fetch listing counts for the last 6 months
  const months = Array.from({ length: 6 }).map((_, i) => dayjs().subtract(i, 'month')).reverse();
  const trendData = await Promise.all(months.map(async (m) => {
    const start = m.startOf('month').toDate();
    const end = m.endOf('month').toDate();
    const count = await prisma.listing.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });
    return { month: m.format('MMM'), listings: count };
  }));

  // Regional Distribution
  const regionalActivity = await prisma.listing.groupBy({
    by: ['region'],
    _count: {
      _all: true
    },
    orderBy: {
      _count: {
        region: 'desc'
      }
    },
    take: 4
  });

  const totalAct = regionalActivity.reduce((acc, curr) => acc + curr._count._all, 0);

  return {
    dealers: totalDealers,
    newDealers: newDealers,
    listings: totalListings,
    newListings: newListings,
    pending: pendingApprovals,
    pendingDelta: "live", // Just a label
    pendingTrend: "flat" as const,
    regions: regionsCount || 0,
    trendData,
    regionalDistribution: regionalActivity.map(r => ({
      region: r.region,
      value: totalAct > 0 ? Math.round((r._count._all / totalAct) * 100) : 0
    }))
  };
}

export async function getDashboardQueue() {
  const pendingDealers = await prisma.dealer.findMany({
    where: { approvalStatus: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return pendingDealers.map(d => ({
    name: d.dealershipName,
    region: d.city || d.country || "Unknown",
    time: dayjs(d.createdAt).fromNow()
  }));
}

export async function getPlatformFeed() {
  // Real platform feed would come from an AuditLog or Activity table.
  // For now, let's use recently created dealers and listings as activity.
  const [recentDealers, recentListings] = await Promise.all([
    prisma.dealer.findMany({ orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.listing.findMany({ orderBy: { createdAt: 'desc' }, take: 2 })
  ]);

  const feed = [
    ...recentDealers.map(d => `New dealer onboarded — ${d.dealershipName}`),
    ...recentListings.map(l => `New listing added — ${l.make} ${l.model}`)
  ];

  return feed.length > 0 ? feed : ["No recent activity detected."];
}