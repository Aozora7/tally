import Dexie, { type Table } from 'dexie';
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

class FinanceDatabase extends Dexie {
  categories!: Table<TransactionCategory>;
  accounts!: Table<Account>;
  triageTransactions!: Table<TriageTransaction>;
  transactions!: Table<Transaction>;
  rules!: Table<CategorizationRule>;
  settings!: Table<Setting>;
  securities!: Table<Security>;
  securityTransactions!: Table<SecurityTransaction>;
  securityPriceCache!: Table<SecurityPriceCache>;

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
    this.version(3).stores({
      categories: 'id',
      accounts: 'id',
      triageTransactions: 'id',
      transactions: 'id',
      rules: 'id',
      settings: 'key',
      securities: 'id',
      securityTransactions: 'id, securityId',
      securityPriceCache: 'id, securityId',
    });
  }
}

export const db = new FinanceDatabase();
