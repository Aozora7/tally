import { useMemo } from 'react';
import type { Transaction, TransactionCategory, CategoryType } from '@/types';

export interface YearlyPivotRow {
  year: string;
  typeTotals: { type: CategoryType; total: number }[];
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  monthlyAvgExpenses: number;
  monthsInYear: number;
}

export interface MonthlyPivotRow {
  month: string;
  typeTotals: { type: CategoryType; total: number }[];
  totalExpenses: number;
}

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Fixed', 'Cyclical', 'Irregular'];

export function useYearlyPivotTable(
  transactions: Transaction[],
  categories: TransactionCategory[]
): YearlyPivotRow[] {
  return useMemo(() => {
    const nonTransferTransactions = transactions.filter((t) => !t.transferAccountId);
    if (nonTransferTransactions.length === 0 || categories.length === 0) return [];

    const categoryTypeMap = new Map<string, CategoryType>();
    const excludedCategories = new Set<string>();
    for (const cat of categories) {
      categoryTypeMap.set(cat.id, cat.type);
      if (cat.excludeFromReports) {
        excludedCategories.add(cat.id);
      }
    }

    const reportableTransactions = nonTransferTransactions.filter(
      (t) => !t.categoryId || !excludedCategories.has(t.categoryId)
    );

    const byYear = new Map<
      string,
      {
        months: Set<string>;
        typeTotals: Map<CategoryType, number>;
        income: number;
        expenses: number;
      }
    >();

    for (const t of reportableTransactions) {
      const year = t.date.substring(0, 4);
      const month = t.date.substring(0, 7);

      let yearData = byYear.get(year);
      if (!yearData) {
        yearData = {
          months: new Set(),
          typeTotals: new Map(),
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
        const catType = categoryTypeMap.get(t.categoryId);
        if (catType) {
          const existing = yearData.typeTotals.get(catType) ?? 0;
          yearData.typeTotals.set(catType, existing + t.amount);
        }
      }
    }

    const results: YearlyPivotRow[] = [];
    const sortedYears = Array.from(byYear.keys()).sort();

    for (const year of sortedYears) {
      const data = byYear.get(year)!;

      const typeTotals = CATEGORY_TYPES.map((type) => ({
        type,
        total: data.typeTotals.get(type) ?? 0,
      }));

      const savingsRate = data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;

      const monthlyAvgExpenses = data.months.size > 0 ? data.expenses / data.months.size : 0;

      results.push({
        year,
        typeTotals,
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

    const categoryTypeMap = new Map<string, CategoryType>();
    const excludedCategories = new Set<string>();
    for (const cat of categories) {
      categoryTypeMap.set(cat.id, cat.type);
      if (cat.excludeFromReports) {
        excludedCategories.add(cat.id);
      }
    }

    const reportableTransactions = nonTransferTransactions.filter(
      (t) => !t.categoryId || !excludedCategories.has(t.categoryId)
    );

    const byMonth = new Map<
      string,
      {
        typeTotals: Map<CategoryType, number>;
        expenses: number;
      }
    >();

    for (const t of reportableTransactions) {
      const month = t.date.substring(0, 7);
      let monthData = byMonth.get(month);
      if (!monthData) {
        monthData = {
          typeTotals: new Map(),
          expenses: 0,
        };
        byMonth.set(month, monthData);
      }

      if (t.amount < 0) {
        monthData.expenses += Math.abs(t.amount);
      }

      if (t.categoryId) {
        const catType = categoryTypeMap.get(t.categoryId);
        if (catType) {
          const existing = monthData.typeTotals.get(catType) ?? 0;
          monthData.typeTotals.set(catType, existing + t.amount);
        }
      }
    }

    const results: MonthlyPivotRow[] = [];
    const sortedMonths = Array.from(byMonth.keys()).sort();

    for (const month of sortedMonths) {
      const data = byMonth.get(month)!;

      const typeTotals = CATEGORY_TYPES.map((type) => ({
        type,
        total: data.typeTotals.get(type) ?? 0,
      }));

      results.push({
        month,
        typeTotals,
        totalExpenses: data.expenses,
      });
    }

    return results;
  }, [transactions, categories]);
}
