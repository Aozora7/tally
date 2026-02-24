import { useMemo } from 'react';
import type { Security, SecurityTransaction, SecurityPriceCache } from '@/types';

export interface PortfolioHolding {
  securityId: string;
  ticker: string;
  units: number;
  price: number;
  value: number;
}

export interface PortfolioCheckpoint {
  yearMonth: string;
  holdings: PortfolioHolding[];
  totalValue: number;
}

function getMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const y = parseInt(year!, 10);
  const m = parseInt(month!, 10);
  const lastDay = new Date(y, m, 0).getDate();
  return `${year}-${month!.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function getYearMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function usePortfolioCheckpoints(
  securities: Security[],
  transactions: SecurityTransaction[],
  priceCache: SecurityPriceCache[]
): PortfolioCheckpoint[] {
  return useMemo(() => {
    if (transactions.length === 0) return [];

    const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const firstYearMonth = getYearMonth(sortedTxns[0]!.date);
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const cachedYearMonths = new Set(priceCache.map((c) => c.yearMonth));
    const includeCurrentMonth = cachedYearMonths.has(currentYearMonth);
    const lastIncludedMonth = includeCurrentMonth
      ? currentYearMonth
      : (() => {
          const [y, m] = currentYearMonth.split('-').map(Number);
          if (m === 1) return `${y! - 1}-12`;
          return `${y}-${String(m! - 1).padStart(2, '0')}`;
        })();

    const months: string[] = [];
    const [startYear, startMonth] = firstYearMonth.split('-').map(Number);
    const [endYear, endMonth] = lastIncludedMonth.split('-').map(Number);

    let y = startYear!;
    let m = startMonth!;
    while (y < endYear! || (y === endYear! && m <= endMonth!)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    const securityMap = new Map(securities.map((s) => [s.id, s]));
    const priceMap = new Map<string, number>();
    for (const cache of priceCache) {
      priceMap.set(`${cache.securityId}_${cache.yearMonth}`, cache.price);
    }

    const txnPriceMap = new Map<string, Map<string, number>>();
    for (const txn of transactions) {
      const ym = getYearMonth(txn.date);
      if (!txnPriceMap.has(txn.securityId)) {
        txnPriceMap.set(txn.securityId, new Map());
      }
      txnPriceMap.get(txn.securityId)!.set(ym, txn.pricePerUnit);
    }

    const checkpoints: PortfolioCheckpoint[] = [];

    for (const yearMonth of months) {
      const monthEnd = getMonthEnd(yearMonth);
      const holdings: PortfolioHolding[] = [];
      let totalValue = 0;

      const unitsBySecurity = new Map<string, number>();

      for (const txn of sortedTxns) {
        if (txn.date > monthEnd) break;

        const current = unitsBySecurity.get(txn.securityId) ?? 0;
        const delta = txn.type === 'Buy' ? txn.units : -txn.units;
        unitsBySecurity.set(txn.securityId, current + delta);
      }

      for (const [securityId, units] of unitsBySecurity) {
        if (units <= 0) continue;

        const security = securityMap.get(securityId);
        if (!security) continue;

        let price = priceMap.get(`${securityId}_${yearMonth}`);
        if (price === undefined) {
          const securityPrices = txnPriceMap.get(securityId);
          if (securityPrices) {
            const sortedMonths = Array.from(securityPrices.keys()).sort().reverse();
            for (const m of sortedMonths) {
              if (m <= yearMonth) {
                price = securityPrices.get(m);
                break;
              }
            }
          }
        }
        if (price === undefined) {
          price = 0;
        }

        const value = Math.round((units / 10000) * (price / 10000) * 100);
        totalValue += value;

        holdings.push({
          securityId,
          ticker: security.ticker,
          units,
          price,
          value,
        });
      }

      if (holdings.length > 0) {
        checkpoints.push({
          yearMonth,
          holdings,
          totalValue,
        });
      }
    }

    return checkpoints;
  }, [securities, transactions, priceCache]);
}
