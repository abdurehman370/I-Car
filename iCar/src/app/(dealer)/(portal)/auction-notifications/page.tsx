"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Loader2, CheckCircle, ChevronRight, AlertTriangle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function DealerAuctionNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/dealer/auction-notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/dealer/auction-notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Auction Alerts" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        </div>
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Breadcrumb pageName="Auction Alerts" />

      <div className="panel border-white/5 bg-white/[0.02] rounded-2xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <BellRing className="mx-auto h-12 w-12 text-gray-500 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-white">No alerts yet</h3>
            <p className="text-gray-400 mt-2">You don't have any auction notifications right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-5 transition-colors flex items-start gap-4 ${notif.isRead ? 'bg-transparent opacity-70' : 'bg-cyan-500/5 hover:bg-cyan-500/10'}`}
                onClick={() => !notif.isRead && markAsRead(notif.id)}
              >
                <div className={`mt-1 shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  notif.type === 'auction_won' ? 'bg-yellow-500/20 text-yellow-400' :
                  notif.type === 'auction_outbid' ? 'bg-red-500/20 text-red-400' :
                  notif.type === 'auction_started' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {notif.type === 'auction_won' ? <CheckCircle className="h-5 w-5" /> :
                   notif.type === 'auction_outbid' ? <AlertTriangle className="h-5 w-5" /> :
                   <BellRing className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h4 className={`text-sm font-bold truncate ${notif.isRead ? 'text-gray-300' : 'text-white'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {notif.message}
                  </p>
                  
                  {notif.auction && (
                    <Link 
                      href={`/auctions/${notif.auction.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 mt-3 hover:text-cyan-300"
                    >
                      View Auction <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {!notif.isRead && (
                  <div className="shrink-0">
                    <div className="h-2.5 w-2.5 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
