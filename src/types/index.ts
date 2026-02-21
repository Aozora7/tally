export type CategoryType = 'Income' | 'Essential' | 'Discretionary';
export type CategoryFrequency = 'Regular' | 'Irregular';

export interface TransactionCategory {
  id: string;
  name: string;
  type: CategoryType;
  frequency: CategoryFrequency;
  sortOrder: number;
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
