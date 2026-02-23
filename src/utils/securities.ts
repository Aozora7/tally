const UNITS_MULTIPLIER = 10000;
const PRICE_MULTIPLIER = 10000;

// Units: stored as integer * 10000 (4 decimal places)
export function unitsToDisplay(units: number): string {
  const value = units / UNITS_MULTIPLIER;
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function displayToUnits(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * UNITS_MULTIPLIER);
}

// Prices: stored as integer * 10000 (4 decimal places, i.e. cents + 2 extra digits)
export function priceToDisplay(price: number, currencySymbol: string = '$'): string {
  const absPrice = Math.abs(price);
  const whole = Math.floor(absPrice / PRICE_MULTIPLIER);
  const frac = absPrice % PRICE_MULTIPLIER;
  const sign = price < 0 ? '-' : '';
  return `${sign}${currencySymbol}${whole}.${frac.toString().padStart(4, '0')}`;
}

export function displayToPrice(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * PRICE_MULTIPLIER);
}
