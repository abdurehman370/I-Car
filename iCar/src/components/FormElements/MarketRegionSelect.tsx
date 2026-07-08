'use client';

import {
  MARKETS,
  EUROPE_COUNTRIES,
  type Market,
} from '@/lib/regions';
import { cn } from '@/lib/utils';

type Props = {
  market: Market;
  country: string;
  onMarketChange: (market: Market) => void;
  onCountryChange: (country: string) => void;
  label?: string;
  selectClassName?: string;
  labelClassName?: string;
  required?: boolean;
};

export function MarketRegionSelect({
  market,
  country,
  onMarketChange,
  onCountryChange,
  label = 'Region',
  selectClassName = 'carq-select',
  labelClassName = 'text-xs font-mono uppercase tracking-[0.1em] text-gray-400 ml-1',
  required = true,
}: Props) {
  return (
    <>
      <div className="space-y-2">
        <label className={labelClassName}>
          {label}
          {required ? ' *' : ''}
        </label>
        <select
          value={market}
          onChange={(e) => onMarketChange(e.target.value as Market)}
          required={required}
          className={cn(selectClassName, 'h-11')}
        >
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {market === 'Europe' && (
        <div className="space-y-2">
          <label className={labelClassName}>Country *</label>
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            required
            className={cn(selectClassName, 'h-11')}
          >
            <option value="">Select country</option>
            {EUROPE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
