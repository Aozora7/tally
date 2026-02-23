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

export function useCurrency() {
  const { settings } = useFinance();
  const currencySymbol = settings.get('currency') || DEFAULT_CURRENCY;

  return useMemo(
    () => ({
      currencySymbol,
      format: (cents: number) => centsToDisplay(cents, currencySymbol),
    }),
    [currencySymbol]
  );
}
