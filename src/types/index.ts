export type CategoryType = 'Income' | 'Fixed' | 'Cyclical' | 'Irregular';

export interface Setting {
  key: string;
  value: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: CategoryType;
  sortOrder: number;
  excludeFromReports: boolean;
}

export interface Account {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface TriageTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  accountId: string;
  categoryId?: string;
  transferAccountId?: string;
  groupId?: string;
}

export interface Security {
  id: string;
  ticker: string;
  isin?: string;
  label?: string;
  exchange?: string;
}

export type SecurityTransactionType = 'Buy' | 'Sell';

export interface SecurityTransaction {
  id: string;
  date: string;
  type: SecurityTransactionType;
  securityId: string;
  units: number;
  pricePerUnit: number;
  fees: number;
}

export interface SecurityPriceCache {
  id: string;
  securityId: string;
  yearMonth: string;
  price: number;
}

export interface CategorizationRule {
  id: string;
  name: string;
  sortOrder: number;
  matchPattern?: string;
  matchMinAmount?: number;
  matchMaxAmount?: number;
  matchMinDate?: string;
  matchMaxDate?: string;
  actionCategoryId?: string;
  actionTransferAccountId?: string;
  actionDelete?: boolean;
}
