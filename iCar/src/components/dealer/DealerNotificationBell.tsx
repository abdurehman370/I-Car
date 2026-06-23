'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellRing, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'react-hot-toast';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  auctionId: number;
};

export function DealerNotificationBell({ isLight }: { isLight?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isSupported, isSubscribed, subscribe, loading: pushLoading } = usePushNotifications();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dealer/auction-notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications((data.notifications ?? []).slice(0, 5));
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    await fetch(`/api/dealer/auction-notifications/${id}/read`, { method: 'POST' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) toast.success('Push notifications enabled');
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) fetchNotifications();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <BellRing className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-black',
              isLight ? 'border border-white' : 'border-2 border-[#050b14]',
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1220] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                {unreadCount} new
              </span>
            )}
          </div>

          {isSupported && !isSubscribed && (
            <div className="border-b border-white/10 bg-cyan-500/5 px-4 py-3">
              <p className="text-xs text-gray-300">Enable browser push for instant alerts.</p>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                {pushLoading ? 'Enabling...' : 'Enable push notifications'}
              </button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={`/auctions/${notif.auctionId}`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'block border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5',
                    !notif.isRead && 'bg-cyan-500/5',
                  )}
                >
                  <p className="text-sm font-semibold text-white">{notif.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">{notif.message}</p>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/auction-notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-xs font-bold text-cyan-400 hover:bg-white/5"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
