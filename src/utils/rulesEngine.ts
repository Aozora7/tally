import type { CategorizationRule, TriageTransaction, Transaction } from '@/types';

export interface RuleMatchable {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface RuleChangeCategory {
  field: 'categoryId';
  oldValue: string | undefined;
  newValue: string;
}

export interface RuleChangeTransfer {
  field: 'transferAccountId';
  oldValue: string | undefined;
  newValue: string;
}

export interface RuleChangeClearCategory {
  field: 'clearCategory';
  oldValue: string;
}

export interface RuleChangeClearTransfer {
  field: 'clearTransfer';
  oldValue: string;
}

export interface RuleChangeDelete {
  field: 'delete';
}

export type RuleChange =
  | RuleChangeCategory
  | RuleChangeTransfer
  | RuleChangeClearCategory
  | RuleChangeClearTransfer
  | RuleChangeDelete;

export interface RulePreview {
  transactionId: string;
  transaction: RuleMatchable;
  source: 'triage' | 'transaction';
  ruleId: string;
  ruleName: string;
  changes: RuleChange[];
  willDelete: boolean;
}

export function matchesRule(rule: CategorizationRule, transaction: RuleMatchable): boolean {
  const hasCondition =
    rule.matchPattern !== undefined ||
    rule.matchMinAmount !== undefined ||
    rule.matchMaxAmount !== undefined ||
    rule.matchMinDate !== undefined ||
    rule.matchMaxDate !== undefined;

  if (!hasCondition) return false;

  if (rule.matchPattern !== undefined) {
    try {
      const regex = new RegExp(rule.matchPattern, 'i');
      if (!regex.test(transaction.description)) return false;
    } catch {
      return false;
    }
  }

  if (rule.matchMinAmount !== undefined) {
    if (transaction.amount < rule.matchMinAmount) return false;
  }

  if (rule.matchMaxAmount !== undefined) {
    if (transaction.amount > rule.matchMaxAmount) return false;
  }

  if (rule.matchMinDate !== undefined) {
    if (transaction.date < rule.matchMinDate) return false;
  }

  if (rule.matchMaxDate !== undefined) {
    if (transaction.date > rule.matchMaxDate) return false;
  }

  return true;
}

export function getRuleAction(rule: CategorizationRule): {
  categoryId?: string;
  transferAccountId?: string;
  delete?: boolean;
} | null {
  const actionCount = [rule.actionCategoryId, rule.actionTransferAccountId, rule.actionDelete].filter(
    (v) => v !== undefined && v !== false
  ).length;

  if (actionCount !== 1) return null;

  if (rule.actionDelete) {
    return { delete: true };
  }

  if (rule.actionCategoryId) {
    return { categoryId: rule.actionCategoryId };
  }

  if (rule.actionTransferAccountId) {
    return { transferAccountId: rule.actionTransferAccountId };
  }

  return null;
}

export function previewRuleOnTransaction(
  rule: CategorizationRule,
  transaction: RuleMatchable,
  source: 'triage' | 'transaction',
  existingCategoryId?: string,
  existingTransferAccountId?: string
): RulePreview | null {
  if (!matchesRule(rule, transaction)) return null;

  const action = getRuleAction(rule);
  if (!action) return null;

  const changes: RuleChange[] = [];

  if (action.delete) {
    changes.push({ field: 'delete' });
  } else if (action.categoryId) {
    if (existingCategoryId !== action.categoryId) {
      changes.push({
        field: 'categoryId',
        oldValue: existingCategoryId,
        newValue: action.categoryId,
      });
    }
    if (existingTransferAccountId !== undefined) {
      changes.push({
        field: 'clearTransfer',
        oldValue: existingTransferAccountId,
      });
    }
  } else if (action.transferAccountId) {
    if (existingTransferAccountId !== action.transferAccountId) {
      changes.push({
        field: 'transferAccountId',
        oldValue: existingTransferAccountId,
        newValue: action.transferAccountId,
      });
    }
    if (existingCategoryId !== undefined) {
      changes.push({
        field: 'clearCategory',
        oldValue: existingCategoryId,
      });
    }
  }

  if (changes.length === 0) return null;

  return {
    transactionId: transaction.id,
    transaction,
    source,
    ruleId: rule.id,
    ruleName: rule.name,
    changes,
    willDelete: action.delete ?? false,
  };
}

export function previewRulesOnTransactions(
  rules: CategorizationRule[],
  triageTransactions: TriageTransaction[],
  transactions: Transaction[]
): RulePreview[] {
  const previews: RulePreview[] = [];
  const matchedTransactionIds = new Set<string>();

  for (const rule of rules) {
    for (const t of triageTransactions) {
      if (matchedTransactionIds.has(t.id)) continue;

      const preview = previewRuleOnTransaction(rule, { ...t, id: t.id }, 'triage');
      if (preview) {
        previews.push(preview);
        matchedTransactionIds.add(t.id);
      }
    }

    for (const t of transactions) {
      if (matchedTransactionIds.has(t.id)) continue;

      const preview = previewRuleOnTransaction(rule, { ...t, id: t.id }, 'transaction', t.categoryId, t.transferAccountId);
      if (preview) {
        previews.push(preview);
        matchedTransactionIds.add(t.id);
      }
    }
  }

  return previews;
}

export function previewSelectedRules(
  selectedRuleIds: string[],
  rules: CategorizationRule[],
  triageTransactions: TriageTransaction[],
  transactions: Transaction[]
): RulePreview[] {
  const selectedRules = rules.filter((r) => selectedRuleIds.includes(r.id));
  return previewRulesOnTransactions(selectedRules, triageTransactions, transactions);
}

export function applyPreviewToTransaction(preview: RulePreview, transaction: Transaction): Transaction {
  const updated: Transaction = { ...transaction };

  for (const change of preview.changes) {
    if (change.field === 'categoryId') {
      updated.categoryId = change.newValue;
      delete updated.transferAccountId;
    } else if (change.field === 'transferAccountId') {
      updated.transferAccountId = change.newValue;
      delete updated.categoryId;
    } else if (change.field === 'clearCategory') {
      delete updated.categoryId;
    } else if (change.field === 'clearTransfer') {
      delete updated.transferAccountId;
    }
  }

  return updated;
}

export function validateRule(rule: Partial<CategorizationRule>): string | null {
  if (!rule.name?.trim()) {
    return 'Rule name is required';
  }

  const hasCondition =
    rule.matchPattern !== undefined ||
    rule.matchMinAmount !== undefined ||
    rule.matchMaxAmount !== undefined ||
    rule.matchMinDate !== undefined ||
    rule.matchMaxDate !== undefined;

  if (!hasCondition) {
    return 'At least one condition is required';
  }

  if (rule.matchPattern !== undefined) {
    try {
      new RegExp(rule.matchPattern, 'i');
    } catch {
      return 'Invalid regex pattern';
    }
  }

  if (rule.matchMinAmount !== undefined && rule.matchMaxAmount !== undefined) {
    if (rule.matchMinAmount > rule.matchMaxAmount) {
      return 'Minimum amount cannot be greater than maximum amount';
    }
  }

  if (rule.matchMinDate !== undefined && rule.matchMaxDate !== undefined) {
    if (rule.matchMinDate > rule.matchMaxDate) {
      return 'Minimum date cannot be after maximum date';
    }
  }

  const actionCount = [rule.actionCategoryId, rule.actionTransferAccountId, rule.actionDelete].filter(
    (v) => v !== undefined && v !== false
  ).length;

  if (actionCount === 0) {
    return 'Exactly one action is required';
  }

  if (actionCount > 1) {
    return 'Only one action can be selected';
  }

  return null;
}

export interface TransactionKey {
  date: string;
  amount: number;
  description: string;
}

export function getTransactionKey(tx: TransactionKey): string {
  return `${tx.date}|${tx.amount}|${tx.description.trim().toLowerCase()}`;
}

export function isDuplicateTransaction(tx: TransactionKey, existingTransactions: TransactionKey[]): boolean {
  const key = getTransactionKey(tx);
  return existingTransactions.some((existing) => getTransactionKey(existing) === key);
}

export function filterDuplicateTransactions<T extends TransactionKey>(
  newTransactions: T[],
  existingTransactions: TransactionKey[]
): { unique: T[]; duplicates: T[] } {
  const existingKeys = new Set(existingTransactions.map(getTransactionKey));

  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const tx of newTransactions) {
    const key = getTransactionKey(tx);
    if (existingKeys.has(key)) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
      existingKeys.add(key);
    }
  }

  return { unique, duplicates };
}
