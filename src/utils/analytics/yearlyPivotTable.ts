import { useMemo } from 'react';
import type { Transaction, TransactionCategory } from '@/types';

export interface YearlyPivotRow {
  year: string;
  categories: { categoryId: string; name: string; total: number }[];
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  monthlyAvgExpenses: number;
  monthsInYear: number;
}

export interface MonthlyPivotRow {
  month: string;
  categories: { categoryId: string; name: string; total: number }[];
  totalExpenses: number;
}

export function useYearlyPivotTable(
  transactions: Transaction[],
  categories: TransactionCategory[]
): YearlyPivotRow[] {
  return useMemo(() => {
    const nonTransferTransactions = transactions.filter((t) => !t.transferAccountId);
    if (nonTransferTransactions.length === 0 || categories.length === 0) return [];

    const byYear = new Map<
      string,
      {
        months: Set<string>;
        categories: Map<string, number>;
        income: number;
        expenses: number;
      }
    >();

    for (const t of nonTransferTransactions) {
      const year = t.date.substring(0, 4);
      const month = t.date.substring(0, 7);

      let yearData = byYear.get(year);
      if (!yearData) {
        yearData = {
          months: new Set(),
          categories: new Map(),
          income: 0,
          expenses: 0,
        };
        byYear.set(year, yearData);
      }

      yearData.months.add(month);

      if (t.amount >= 0) {
        yearData.income += t.amount;
      } else {
        yearData.expenses += Math.abs(t.amount);
      }

      if (t.categoryId) {
        const existing = yearData.categories.get(t.categoryId) ?? 0;
        yearData.categories.set(t.categoryId, existing + t.amount);
      }
    }

    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

    const results: YearlyPivotRow[] = [];
    const sortedYears = Array.from(byYear.keys()).sort();

    for (const year of sortedYears) {
      const data = byYear.get(year)!;

      const categoryTotals = sortedCategories.map((cat) => ({
        categoryId: cat.id,
        name: cat.name,
        total: data.categories.get(cat.id) ?? 0,
      }));

      const savingsRate = data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;

      const monthlyAvgExpenses = data.months.size > 0 ? data.expenses / data.months.size : 0;

      results.push({
        year,
        categories: categoryTotals,
        totalIncome: data.income,
        totalExpenses: data.expenses,
        savingsRate,
        monthlyAvgExpenses,
        monthsInYear: data.months.size,
      });
    }

    return results;
  }, [transactions, categories]);
}

export function useMonthlyPivotTable(
  transactions: Transaction[],
  categories: TransactionCategory[]
): MonthlyPivotRow[] {
  return useMemo(() => {
    const nonTransferTransactions = transactions.filter((t) => !t.transferAccountId);
    if (nonTransferTransactions.length === 0 || categories.length === 0) return [];

    const byMonth = new Map<
      string,
      {
        categories: Map<string, number>;
        expenses: number;
      }
    >();

    for (const t of nonTransferTransactions) {
      const month = t.date.substring(0, 7);

      let monthData = byMonth.get(month);
      if (!monthData) {
        monthData = {
          categories: new Map(),
          expenses: 0,
        };
        byMonth.set(month, monthData);
      }

      if (t.amount < 0) {
        monthData.expenses += Math.abs(t.amount);
      }

      if (t.categoryId) {
        const existing = monthData.categories.get(t.categoryId) ?? 0;
        monthData.categories.set(t.categoryId, existing + t.amount);
      }
    }

    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

    const results: MonthlyPivotRow[] = [];
    const sortedMonths = Array.from(byMonth.keys()).sort();

    for (const month of sortedMonths) {
      const data = byMonth.get(month)!;

      const categoryTotals = sortedCategories.map((cat) => ({
        categoryId: cat.id,
        name: cat.name,
        total: data.categories.get(cat.id) ?? 0,
      }));

      results.push({
        month,
        categories: categoryTotals,
        totalExpenses: data.expenses,
      });
    }

    return results;
  }, [transactions, categories]);
}
