'use client';

import { BellRing, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

export function PushNotificationToggle({ className }: { className?: string }) {
  const { isSupported, isSubscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <p className={cn('text-sm text-gray-500', className)}>
        Push notifications are not supported in this browser.
      </p>
    );
  }

  const handleToggle = async () => {
    const success = isSubscribed ? await unsubscribe() : await subscribe();
    if (success) {
      toast.success(
        isSubscribed ? 'Push notifications disabled' : 'Push notifications enabled',
      );
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Browser push notifications</p>
          <p className="mt-1 text-xs text-gray-400">
            Get instant alerts for auctions, outbid notices, and car listing matches.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'shrink-0 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50',
          isSubscribed
            ? 'border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
            : 'border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20',
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </span>
        ) : isSubscribed ? (
          'Disable'
        ) : (
          'Enable'
        )}
      </button>
    </div>
  );
}
