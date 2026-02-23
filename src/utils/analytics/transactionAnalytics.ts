import { useMemo } from 'react';
import type { Transaction, Account, TransactionCategory, CategoryType } from '@/types';

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  total: number;
  count: number;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  isDefault: boolean;
  balance: number;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  transactionCount: number;
}

export function useMonthlyTrend(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): MonthlyData[] {
  return useMemo(() => {
    if (transactions.length === 0) return [];

    let filtered = transactions;
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    if (filtered.length === 0) return [];

    const byMonth = new Map<string, { income: number; expenses: number }>();

    for (const t of filtered) {
      const month = t.date.substring(0, 7);
      const existing = byMonth.get(month) ?? { income: 0, expenses: 0 };
      if (t.amount >= 0) {
        existing.income += t.amount;
      } else {
        existing.expenses += Math.abs(t.amount);
      }
      byMonth.set(month, existing);
    }

    const results: MonthlyData[] = [];
    const sortedMonths = Array.from(byMonth.keys()).sort();

    for (const month of sortedMonths) {
      const data = byMonth.get(month)!;
      results.push({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      });
    }

    return results;
  }, [transactions, startDate, endDate]);
}

export function useCategorySummary(
  transactions: Transaction[],
  categories: TransactionCategory[],
  startDate?: string,
  endDate?: string,
  categoryType?: CategoryType
): CategorySummary[] {
  return useMemo(() => {
    if (transactions.length === 0 || categories.length === 0) return [];

    let filtered = transactions.filter((t) => t.categoryId);
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    if (filtered.length === 0) return [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const byCategory = new Map<string, { total: number; count: number }>();

    for (const t of filtered) {
      const existing = byCategory.get(t.categoryId!) ?? { total: 0, count: 0 };
      existing.total += Math.abs(t.amount);
      existing.count += 1;
      byCategory.set(t.categoryId!, existing);
    }

    const results: CategorySummary[] = [];

    for (const [categoryId, data] of byCategory) {
      const category = categoryMap.get(categoryId);
      if (category) {
        results.push({
          categoryId,
          categoryName: category.name,
          categoryType: category.type,
          total: data.total,
          count: data.count,
        });
      }
    }

    results.sort((a, b) => b.total - a.total);

    if (categoryType) {
      return results.filter((r) => r.categoryType === categoryType);
    }

    return results;
  }, [transactions, categories, startDate, endDate, categoryType]);
}

export function useAccountBalances(
  transactions: Transaction[],
  accounts: Account[]
): AccountBalance[] {
  return useMemo(() => {
    if (accounts.length === 0) return [];

    const byAccount = new Map<string, number>();

    for (const t of transactions) {
      const existing = byAccount.get(t.accountId) ?? 0;
      byAccount.set(t.accountId, existing + t.amount);
      if (t.transferAccountId) {
        const transferExisting = byAccount.get(t.transferAccountId) ?? 0;
        byAccount.set(t.transferAccountId, transferExisting - t.amount);
      }
    }

    return accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      isDefault: account.isDefault,
      balance: byAccount.get(account.id) ?? 0,
    }));
  }, [transactions, accounts]);
}

export function useTransactionSummary(
  transactions: Transaction[],
  categories: TransactionCategory[],
  startDate?: string,
  endDate?: string
): TransactionSummary {
  return useMemo(() => {
    let filtered = transactions;
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    if (filtered.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        transactionCount: 0,
      };
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of filtered) {
      const category = t.categoryId ? categoryMap.get(t.categoryId) : null;
      if (category?.type === 'Income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      net: totalIncome + totalExpenses,
      transactionCount: filtered.length,
    };
  }, [transactions, categories, startDate, endDate]);
}
