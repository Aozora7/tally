import Dexie, { type Table } from 'dexie';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
  Setting,
} from '@/types';

class FinanceDatabase extends Dexie {
  categories!: Table<TransactionCategory>;
  accounts!: Table<Account>;
  triageTransactions!: Table<TriageTransaction>;
  transactions!: Table<Transaction>;
  rules!: Table<CategorizationRule>;
  settings!: Table<Setting>;

  constructor() {
    super('ImpersonalFinance');
    this.version(2).stores({
      categories: 'id',
      accounts: 'id',
      triageTransactions: 'id',
      transactions: 'id',
      rules: 'id',
      settings: 'key',
    });
  }
}

export const db = new FinanceDatabase();
