"use client";

import {
  formatAuctionDateTimeWithContext,
  type AuctionMarket,
} from "@/lib/auction-datetime";

type Props = {
  date: Date | string;
  market: AuctionMarket | string;
  className?: string;
};

/** Shows auction market time + viewer's local time when they differ. */
export function AuctionTimeDisplay({ date, market, className = "" }: Props) {
  const { market: marketTime, marketLabel, local } =
    formatAuctionDateTimeWithContext(date, market);

  return (
    <span className={className}>
      <span className="block text-white font-semibold text-sm">
        {marketTime}
        <span className="text-gray-500 font-normal text-xs ml-1">({marketLabel})</span>
      </span>
      {local && (
        <span className="block text-gray-400 text-xs mt-0.5">
          Your time: {local}
        </span>
      )}
    </span>
  );
}
