import { useMemo } from 'react';
import type { SecurityTransaction } from '@/types';
import type { PortfolioCheckpoint } from '@/utils/usePortfolioCheckpoints';

export interface PortfolioPerformance {
  totalInvestedCents: number;
  totalGainLossCents: number | null;
  totalGainLossPct: number | null;
  annualizedTWR: number | null;
  maxDrawdownPct: number | null;
  twrOverTime: { yearMonth: string; twr: number }[];
}

function txnCostCents(txn: SecurityTransaction): number {
  return Math.round((txn.units * txn.pricePerUnit + txn.fees) / 1_000_000);
}

function txnProceedsCents(txn: SecurityTransaction): number {
  return Math.round((txn.units * txn.pricePerUnit - txn.fees) / 1_000_000);
}

export function usePortfolioPerformance(
  checkpoints: PortfolioCheckpoint[],
  transactions: SecurityTransaction[]
): PortfolioPerformance {
  return useMemo(() => {
    const empty: PortfolioPerformance = {
      totalInvestedCents: 0,
      totalGainLossCents: null,
      totalGainLossPct: null,
      annualizedTWR: null,
      maxDrawdownPct: null,
      twrOverTime: [],
    };

    if (transactions.length === 0) return empty;

    const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    // Net invested: buys cost money, sells return money
    let totalInvestedCents = 0;
    for (const txn of sortedTxns) {
      if (txn.type === 'Buy') {
        totalInvestedCents += txnCostCents(txn);
      } else {
        totalInvestedCents -= txnProceedsCents(txn);
      }
    }

    if (checkpoints.length === 0) return { ...empty, totalInvestedCents };

    const lastCheckpoint = checkpoints[checkpoints.length - 1]!;

    // Gain/loss vs net invested
    const totalGainLossCents = lastCheckpoint.totalValue - totalInvestedCents;
    const totalGainLossPct = totalInvestedCents !== 0 ? totalGainLossCents / totalInvestedCents : null;

    // Number of monthly sub-periods
    const numMonths = checkpoints.length - 1;

    // TWR over time: chain Modified Dietz monthly sub-period returns.
    //
    // Modified Dietz uses PORTFOLIO-perspective cash flows:
    //   buys  = positive (money flowing into the portfolio)
    //   sells = negative (money flowing out of the portfolio)
    //
    // R_month = (V_end - V_start - CF) / (V_start + 0.5 * CF)
    //
    // Chaining: cumTWR_k = (1 + R_1)(1 + R_2)...(1 + R_k) - 1

    const twrOverTime: { yearMonth: string; twr: number }[] = [];

    // Baseline: the first checkpoint is the starting point (0% return)
    twrOverTime.push({ yearMonth: checkpoints[0]!.yearMonth, twr: 0 });

    let cumulative = 1.0;

    for (let i = 1; i < checkpoints.length; i++) {
      const prev = checkpoints[i - 1]!;
      const curr = checkpoints[i]!;
      const ym = curr.yearMonth;

      // Sum cash flows from portfolio perspective within this month
      let cf = 0;
      for (const txn of sortedTxns) {
        if (txn.date.substring(0, 7) === ym) {
          cf += txn.type === 'Buy' ? txnCostCents(txn) : -txnProceedsCents(txn);
        }
      }

      const denom = prev.totalValue + 0.5 * cf;
      if (denom === 0) {
        // No starting value and no weighted flows — can't compute return; treat as 0%
        twrOverTime.push({ yearMonth: ym, twr: cumulative - 1 });
        continue;
      }

      const monthReturn = (curr.totalValue - prev.totalValue - cf) / denom;
      cumulative *= 1 + monthReturn;
      twrOverTime.push({ yearMonth: ym, twr: cumulative - 1 });
    }

    // Annualized TWR over the full period
    const totalTWR = cumulative - 1;
    const annualizedTWR = numMonths >= 1 ? Math.pow(1 + totalTWR, 12 / numMonths) - 1 : null;

    // Max drawdown measured on the TWR index series.
    // Using TWR (not raw portfolio value) means contributions don't mask market declines.
    // The index starts at 1.0 (first checkpoint baseline = 0% TWR).
    let twrPeak = 0;
    let maxDrawdownPct = 0;
    for (const pt of twrOverTime) {
      const indexValue = 1 + pt.twr;
      if (indexValue > twrPeak) twrPeak = indexValue;
      if (twrPeak > 0) {
        const dd = (indexValue - twrPeak) / twrPeak;
        if (dd < maxDrawdownPct) maxDrawdownPct = dd;
      }
    }

    return {
      totalInvestedCents,
      totalGainLossCents,
      totalGainLossPct,
      annualizedTWR,
      maxDrawdownPct,
      twrOverTime,
    };
  }, [checkpoints, transactions]);
}
