import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/db/database';
import { notifyDataMutated } from '@/sync/syncTrigger';
import { fireAndForget } from '@/utils/dbHelpers';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
} from '@/types';

interface FinanceContextValue {
  isLoaded: boolean;
  categories: TransactionCategory[];
  accounts: Account[];
  triageTransactions: TriageTransaction[];
  transactions: Transaction[];
  rules: CategorizationRule[];
  settings: Map<string, string>;
  addCategory: (category: TransactionCategory) => void;
  updateCategory: (category: TransactionCategory) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: TransactionCategory[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  addTriageTransaction: (transaction: TriageTransaction) => void;
  addTriageTransactions: (transactions: TriageTransaction[]) => void;
  updateTriageTransaction: (transaction: TriageTransaction) => void;
  deleteTriageTransaction: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addRule: (rule: CategorizationRule) => void;
  updateRule: (rule: CategorizationRule, index: number) => void;
  deleteRule: (id: string) => void;
  reorderRules: (rules: CategorizationRule[]) => void;
  setSetting: (key: string, value: string) => void;
  reloadFromDb: () => Promise<void>;
  clearAllData: () => Promise<void>;
  clearTransactions: () => Promise<void>;
  clearTriageTransactions: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [triageTransactions, setTriageTransactions] = useState<TriageTransaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [settings, setSettings] = useState<Map<string, string>>(new Map());

  const reloadFromDb = useCallback(async () => {
    const [
      loadedCategories,
      loadedAccounts,
      loadedTriage,
      loadedTransactions,
      loadedRules,
      loadedSettings,
    ] = await Promise.all([
      db.categories.toArray(),
      db.accounts.toArray(),
      db.triageTransactions.toArray(),
      db.transactions.toArray(),
      db.rules.toArray(),
      db.settings.toArray(),
    ]);
    setCategories(loadedCategories.sort((a, b) => a.sortOrder - b.sortOrder));
    setAccounts(loadedAccounts);
    setTriageTransactions(loadedTriage);
    setTransactions(loadedTransactions);
    setRules(loadedRules.sort((a, b) => a.sortOrder - b.sortOrder));
    setSettings(new Map(loadedSettings.map((s) => [s.key, s.value])));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void reloadFromDb();
  }, [reloadFromDb]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        fireAndForget(
          db.transaction(
            'rw',
            [
              db.categories,
              db.accounts,
              db.triageTransactions,
              db.transactions,
              db.rules,
              db.settings,
            ],
            async () => {
              await Promise.all([
                db.categories.bulkPut(categories),
                db.accounts.bulkPut(accounts),
                db.triageTransactions.bulkPut(triageTransactions),
                db.transactions.bulkPut(transactions),
                db.rules.bulkPut(rules),
              ]);
            }
          ),
          'visibility-change bulk persist'
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [categories, accounts, triageTransactions, transactions, rules]);

  const addCategory = useCallback(
    (category: TransactionCategory) => {
      const categoryWithDefaults = {
        ...category,
        sortOrder: categories.length,
        excludeFromReports: category.excludeFromReports ?? false,
      };
      setCategories((prev) => [...prev, categoryWithDefaults]);
      fireAndForget(db.categories.add(categoryWithDefaults), 'add category');
      notifyDataMutated();
    },
    [categories.length]
  );

  const updateCategory = useCallback((category: TransactionCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    fireAndForget(db.categories.put(category), 'update category');
    notifyDataMutated();
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    fireAndForget(db.categories.delete(id), 'delete category');
    notifyDataMutated();
  }, []);

  const reorderCategories = useCallback((newCategories: TransactionCategory[]) => {
    const categoriesWithSortOrder = newCategories.map((category, index) => ({
      ...category,
      sortOrder: index,
    }));
    setCategories(categoriesWithSortOrder);
    fireAndForget(
      db.transaction('rw', db.categories, async () => {
        await db.categories.clear();
        await db.categories.bulkAdd(categoriesWithSortOrder);
      }),
      'reorder categories'
    );
    notifyDataMutated();
  }, []);

  const addAccount = useCallback((account: Account) => {
    setAccounts((prev) => [...prev, account]);
    fireAndForget(db.accounts.add(account), 'add account');
    notifyDataMutated();
  }, []);

  const updateAccount = useCallback((account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    fireAndForget(db.accounts.put(account), 'update account');
    notifyDataMutated();
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    fireAndForget(db.accounts.delete(id), 'delete account');
    notifyDataMutated();
  }, []);

  const addTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => [...prev, transaction]);
    fireAndForget(db.triageTransactions.add(transaction), 'add triage transaction');
    notifyDataMutated();
  }, []);

  const addTriageTransactions = useCallback((newTransactions: TriageTransaction[]) => {
    setTriageTransactions((prev) => [...prev, ...newTransactions]);
    fireAndForget(db.triageTransactions.bulkAdd(newTransactions), 'bulk add triage transactions');
    notifyDataMutated();
  }, []);

  const updateTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    fireAndForget(db.triageTransactions.put(transaction), 'update triage transaction');
    notifyDataMutated();
  }, []);

  const deleteTriageTransaction = useCallback((id: string) => {
    setTriageTransactions((prev) => prev.filter((t) => t.id !== id));
    fireAndForget(db.triageTransactions.delete(id), 'delete triage transaction');
    notifyDataMutated();
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
    fireAndForget(db.transactions.add(transaction), 'add transaction');
    notifyDataMutated();
  }, []);

  const addTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions((prev) => [...prev, ...newTransactions]);
    fireAndForget(db.transactions.bulkAdd(newTransactions), 'bulk add transactions');
    notifyDataMutated();
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    fireAndForget(db.transactions.put(transaction), 'update transaction');
    notifyDataMutated();
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    fireAndForget(db.transactions.delete(id), 'delete transaction');
    notifyDataMutated();
  }, []);

  const addRule = useCallback(
    (rule: CategorizationRule) => {
      const ruleWithSortOrder = { ...rule, sortOrder: rules.length };
      setRules((prev) => [...prev, ruleWithSortOrder]);
      fireAndForget(db.rules.add(ruleWithSortOrder), 'add rule');
      notifyDataMutated();
    },
    [rules.length]
  );

  const updateRule = useCallback((rule: CategorizationRule, index: number) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = rule;
      return updated;
    });
    fireAndForget(db.rules.put(rule), 'update rule');
    notifyDataMutated();
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    fireAndForget(db.rules.delete(id), 'delete rule');
    notifyDataMutated();
  }, []);

  const reorderRules = useCallback((newRules: CategorizationRule[]) => {
    const rulesWithSortOrder = newRules.map((rule, index) => ({
      ...rule,
      sortOrder: index,
    }));
    setRules(rulesWithSortOrder);
    fireAndForget(
      db.transaction('rw', db.rules, async () => {
        await db.rules.clear();
        await db.rules.bulkAdd(rulesWithSortOrder);
      }),
      'reorder rules'
    );
    notifyDataMutated();
  }, []);

  const clearAllData = useCallback(async () => {
    await db.transaction(
      'rw',
      [db.categories, db.accounts, db.triageTransactions, db.transactions, db.rules],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.accounts.clear(),
          db.triageTransactions.clear(),
          db.transactions.clear(),
          db.rules.clear(),
        ]);
      }
    );
    setCategories([]);
    setAccounts([]);
    setTriageTransactions([]);
    setTransactions([]);
    setRules([]);
    notifyDataMutated();
  }, []);

  const clearTransactions = useCallback(async () => {
    await db.transactions.clear();
    setTransactions([]);
    notifyDataMutated();
  }, []);

  const clearTriageTransactions = useCallback(async () => {
    await db.triageTransactions.clear();
    setTriageTransactions([]);
    notifyDataMutated();
  }, []);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
    fireAndForget(db.settings.put({ key, value }), 'set setting');
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        isLoaded,
        categories,
        accounts,
        triageTransactions,
        transactions,
        rules,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addAccount,
        updateAccount,
        deleteAccount,
        addTriageTransaction,
        addTriageTransactions,
        updateTriageTransaction,
        deleteTriageTransaction,
        addTransaction,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        addRule,
        updateRule,
        deleteRule,
        reorderRules,
        reloadFromDb,
        clearAllData,
        clearTransactions,
        clearTriageTransactions,
        settings,
        setSetting,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
