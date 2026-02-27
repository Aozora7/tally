import { useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';

const DEFAULT_CURRENCY = '$';

export function centsToDisplay(cents: number, currencySymbol: string = DEFAULT_CURRENCY): string {
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${currencySymbol}${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

export function displayToCents(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

/**
 * Compact formatter for chart Y-axis tick labels (input is dollars, not cents).
 * Uses k/M suffixes to keep labels short across all scales.
 */
export function formatChartAxisTick(dollars: number, symbol: string, privacyMode: boolean): string {
  if (privacyMode) return `${symbol}XXXX`;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const str = v < 10 ? (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) : Math.round(v).toFixed(0);
    return `${sign}${symbol}${str}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    const str = v < 10 ? (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) : Math.round(v).toFixed(0);
    return `${sign}${symbol}${str}k`;
  }
  return `${sign}${symbol}${Math.round(abs).toFixed(0)}`;
}

export function useCurrency() {
  const { settings } = useFinance();
  const currencySymbol = settings.get('currency') || DEFAULT_CURRENCY;
  const privacyMode = settings.get('privacyMode') === 'true';

  return useMemo(
    () => ({
      currencySymbol,
      privacyMode,
      format: (cents: number) => (privacyMode ? `${currencySymbol}XXXX.XX` : centsToDisplay(cents, currencySymbol)),
      /** For chart Y-axis ticks: compact k/M notation, input in dollars */
      axisFormatter: (dollars: number) => formatChartAxisTick(dollars, currencySymbol, privacyMode),
      /** For chart tooltips: full precision, input in dollars */
      tooltipFormatter: privacyMode
        ? (_dollars: number) => `${currencySymbol}XXXX.XX`
        : (dollars: number) => `${currencySymbol}${dollars.toFixed(2)}`,
    }),
    [currencySymbol, privacyMode]
  );
}
