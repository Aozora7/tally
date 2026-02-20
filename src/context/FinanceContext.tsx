import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/db/database';
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
  addCategory: (category: TransactionCategory) => void;
  updateCategory: (category: TransactionCategory) => void;
  deleteCategory: (id: string) => void;
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
  reloadFromDb: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [triageTransactions, setTriageTransactions] = useState<TriageTransaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);

  const reloadFromDb = useCallback(async () => {
    const [loadedCategories, loadedAccounts, loadedTriage, loadedTransactions, loadedRules] =
      await Promise.all([
        db.categories.toArray(),
        db.accounts.toArray(),
        db.triageTransactions.toArray(),
        db.transactions.toArray(),
        db.rules.toArray(),
      ]);
    setCategories(loadedCategories);
    setAccounts(loadedAccounts);
    setTriageTransactions(loadedTriage);
    setTransactions(loadedTransactions);
    setRules(loadedRules);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void reloadFromDb();
  }, [reloadFromDb]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void db.transaction(
          'rw',
          [db.categories, db.accounts, db.triageTransactions, db.transactions, db.rules],
          async () => {
            await Promise.all([
              db.categories.bulkPut(categories),
              db.accounts.bulkPut(accounts),
              db.triageTransactions.bulkPut(triageTransactions),
              db.transactions.bulkPut(transactions),
              db.rules.bulkPut(rules),
            ]);
          }
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [categories, accounts, triageTransactions, transactions, rules]);

  const addCategory = useCallback((category: TransactionCategory) => {
    setCategories((prev) => [...prev, category]);
    void db.categories.add(category);
  }, []);

  const updateCategory = useCallback((category: TransactionCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    void db.categories.put(category);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    void db.categories.delete(id);
  }, []);

  const addAccount = useCallback((account: Account) => {
    setAccounts((prev) => [...prev, account]);
    void db.accounts.add(account);
  }, []);

  const updateAccount = useCallback((account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    void db.accounts.put(account);
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    void db.accounts.delete(id);
  }, []);

  const addTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => [...prev, transaction]);
    void db.triageTransactions.add(transaction);
  }, []);

  const addTriageTransactions = useCallback((newTransactions: TriageTransaction[]) => {
    setTriageTransactions((prev) => [...prev, ...newTransactions]);
    void db.triageTransactions.bulkAdd(newTransactions);
  }, []);

  const updateTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    void db.triageTransactions.put(transaction);
  }, []);

  const deleteTriageTransaction = useCallback((id: string) => {
    setTriageTransactions((prev) => prev.filter((t) => t.id !== id));
    void db.triageTransactions.delete(id);
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
    void db.transactions.add(transaction);
  }, []);

  const addTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions((prev) => [...prev, ...newTransactions]);
    void db.transactions.bulkAdd(newTransactions);
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    void db.transactions.put(transaction);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    void db.transactions.delete(id);
  }, []);

  const addRule = useCallback((rule: CategorizationRule) => {
    setRules((prev) => [...prev, rule]);
    void db.rules.add(rule);
  }, []);

  const updateRule = useCallback((rule: CategorizationRule, index: number) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = rule;
      return updated;
    });
    void db.rules.put(rule);
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    void db.rules.delete(id);
  }, []);

  const reorderRules = useCallback((newRules: CategorizationRule[]) => {
    setRules(newRules);
    void db.rules.clear().then(() => db.rules.bulkAdd(newRules));
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
