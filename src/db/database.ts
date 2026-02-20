import Dexie, { type Table } from 'dexie';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
} from '@/types';

class FinanceDatabase extends Dexie {
  categories!: Table<TransactionCategory>;
  accounts!: Table<Account>;
  triageTransactions!: Table<TriageTransaction>;
  transactions!: Table<Transaction>;
  rules!: Table<CategorizationRule>;

  constructor() {
    super('ImpersonalFinance');
    this.version(1).stores({
      categories: 'id',
      accounts: 'id',
      triageTransactions: 'id',
      transactions: 'id',
      rules: 'id',
    });
  }
}

export const db = new FinanceDatabase();
