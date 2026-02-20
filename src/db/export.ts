import { db } from './database';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
} from '@/types';

export interface ExportedState {
  version: number;
  exportedAt: string;
  categories: TransactionCategory[];
  accounts: Account[];
  triageTransactions: TriageTransaction[];
  transactions: Transaction[];
  rules: CategorizationRule[];
}

export async function exportFullState(): Promise<ExportedState> {
  const [categories, accounts, triageTransactions, transactions, rules] = await Promise.all([
    db.categories.toArray(),
    db.accounts.toArray(),
    db.triageTransactions.toArray(),
    db.transactions.toArray(),
    db.rules.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    accounts,
    triageTransactions,
    transactions,
    rules,
  };
}

export function downloadJson(data: ExportedState, filename = 'finance-backup.json'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
