import { db } from './database';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
  Setting,
  Security,
  SecurityTransaction,
  SecurityPriceCache,
} from '@/types';

export const SENSITIVE_SETTING_KEYS = [
  'google_client_id',
  'google_client_secret',
  'google_refresh_token',
  'google_access_token',
  'google_token_expires_at',
] as const;

const SENSITIVE_SETTING_KEY_SET = new Set<string>(SENSITIVE_SETTING_KEYS);

export function filterBackupSettings(settings: Setting[]): Setting[] {
  return settings.filter((setting) => !SENSITIVE_SETTING_KEY_SET.has(setting.key));
}

export interface ExportedState {
  version: number;
  exportedAt: string;
  categories: TransactionCategory[];
  accounts: Account[];
  triageTransactions: TriageTransaction[];
  transactions: Transaction[];
  rules: CategorizationRule[];
  settings?: Setting[];
  securities?: Security[];
  securityTransactions?: SecurityTransaction[];
  securityPriceCache?: SecurityPriceCache[];
}

export async function exportFullState(): Promise<ExportedState> {
  const [
    categories,
    accounts,
    triageTransactions,
    transactions,
    rules,
    settings,
    securities,
    securityTransactions,
    securityPriceCache,
  ] = await Promise.all([
    db.categories.toArray(),
    db.accounts.toArray(),
    db.triageTransactions.toArray(),
    db.transactions.toArray(),
    db.rules.toArray(),
    db.settings.toArray(),
    db.securities.toArray(),
    db.securityTransactions.toArray(),
    db.securityPriceCache.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    accounts,
    triageTransactions,
    transactions,
    rules,
    settings: filterBackupSettings(settings),
    securities,
    securityTransactions,
    securityPriceCache,
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
