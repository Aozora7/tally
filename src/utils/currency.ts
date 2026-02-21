export function centsToDisplay(cents: number): string {
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}€${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

export function displayToCents(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}
