import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button, Group, Stack, Text, TextInput, Divider, ActionIcon, Paper } from '@mantine/core';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency, displayToCents } from '@/utils/currency';
import { generateId } from '@/utils/uuid';
import { isDuplicateTransaction } from '@/utils/rulesEngine';
import type { TriageTransaction, Transaction } from '@/types';

interface SplitPart {
  id: string;
  amount: string;
  description: string;
  categoryId: string;
  transferAccountId: string;
}

interface TriageDetailPanelProps {
  selectedTransaction: TriageTransaction | null;
  onSaved: () => void;
  onDeleted: () => void;
}

function ButtonSelect({
  label,
  options,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
}) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group gap={4}>
        {allowNone && (
          <Button
            size="xs"
            variant={value === '' ? 'filled' : 'light'}
            color={value === '' ? 'brand' : 'gray'}
            onClick={() => onChange('')}
          >
            None
          </Button>
        )}
        {options.map((opt) => (
          <Button
            key={opt.value}
            size="xs"
            variant={value === opt.value ? 'filled' : 'light'}
            color={value === opt.value ? 'brand' : 'gray'}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

interface SplitPartEditorProps {
  split: SplitPart;
  index: number;
  categoryOptions: { value: string; label: string }[];
  transferOptions: { value: string; label: string }[];
  onAmountChange: (id: string, value: string) => void;
  onChange: (id: string, field: keyof SplitPart, value: string) => void;
  onRemove: (id: string) => void;
}

function SplitPartEditor({
  split,
  index,
  categoryOptions,
  transferOptions,
  onAmountChange,
  onChange,
  onRemove,
}: SplitPartEditorProps) {
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Part {index + 1}
          </Text>
          <ActionIcon variant="subtle" color="danger" onClick={() => onRemove(split.id)}>
            ×
          </ActionIcon>
        </Group>
        <Group grow>
          <TextInput
            placeholder="Amount"
            value={split.amount}
            onChange={(e) => onAmountChange(split.id, e.currentTarget.value)}
          />
          <TextInput
            placeholder="Description (optional)"
            value={split.description}
            onChange={(e) => onChange(split.id, 'description', e.currentTarget.value)}
          />
        </Group>
        <ButtonSelect
          label="Category"
          options={categoryOptions}
          value={split.categoryId}
          onChange={(value) => onChange(split.id, 'categoryId', value)}
          allowNone
        />
        {transferOptions.length > 0 && (
          <ButtonSelect
            label="Transfer To"
            options={transferOptions}
            value={split.transferAccountId}
            onChange={(value) => onChange(split.id, 'transferAccountId', value)}
            allowNone
          />
        )}
      </Stack>
    </Paper>
  );
}

interface SplitEditorProps {
  splits: SplitPart[];
  categoryOptions: { value: string; label: string }[];
  transferOptions: { value: string; label: string }[];
  onAddSplit: () => void;
  onRemoveSplit: (id: string) => void;
  onSplitAmountChange: (id: string, value: string) => void;
  onSplitChange: (id: string, field: keyof SplitPart, value: string) => void;
  onCancel: () => void;
}

function SplitEditor({
  splits,
  categoryOptions,
  transferOptions,
  onAddSplit,
  onRemoveSplit,
  onSplitAmountChange,
  onSplitChange,
  onCancel,
}: SplitEditorProps) {
  return (
    <Stack gap="sm">
      {splits.map((split, index) => (
        <SplitPartEditor
          key={split.id}
          split={split}
          index={index}
          categoryOptions={categoryOptions}
          transferOptions={transferOptions}
          onAmountChange={onSplitAmountChange}
          onChange={onSplitChange}
          onRemove={onRemoveSplit}
        />
      ))}
      <Group>
        <Button variant="light" size="sm" onClick={onAddSplit}>
          Add Split Part
        </Button>
        <Button variant="subtle" size="sm" onClick={onCancel}>
          Cancel Split
        </Button>
      </Group>
    </Stack>
  );
}

export function TriageDetailPanel({
  selectedTransaction,
  onSaved,
  onDeleted,
}: TriageDetailPanelProps) {
  const { accounts, categories, transactions, addTransactions, deleteTriageTransaction } =
    useFinance();
  const { format } = useCurrency();

  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [transferAccountId, setTransferAccountId] = useState<string>('');
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitPart[]>([]);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const transferOptions = useMemo(
    () => accounts.filter((a) => !a.isDefault).map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  useEffect(() => {
    if (selectedTransaction) {
      setAccountId(accounts.find((a) => a.isDefault)?.id ?? '');
      setCategoryId('');
      setTransferAccountId('');
      setIsSplit(false);
      setSplits([]);
    }
  }, [selectedTransaction, accounts]);

  const validationError = useMemo(() => {
    if (!selectedTransaction) return null;

    if (!accountId) return 'Account is required';

    if (isSplit) {
      if (splits.length === 0) return 'Add at least one split part';

      const totalSplitAmount = splits.reduce((sum, s) => sum + displayToCents(s.amount), 0);
      if (totalSplitAmount !== selectedTransaction.amount) {
        return `Split total (${format(totalSplitAmount)}) must equal transaction amount (${format(selectedTransaction.amount)})`;
      }

      for (const split of splits) {
        if (!split.amount) return 'All splits must have an amount';
        if (!split.categoryId && !split.transferAccountId) {
          return 'All splits must have a category or transfer';
        }
        if (split.categoryId && split.transferAccountId) {
          return 'Splits cannot have both category and transfer';
        }
      }
    } else {
      if (!categoryId && !transferAccountId) {
        return 'Must have either a category or transfer';
      }
      if (categoryId && transferAccountId) {
        return 'Cannot have both category and transfer';
      }
    }

    return null;
  }, [selectedTransaction, accountId, categoryId, transferAccountId, isSplit, splits, format]);

  const canSave = selectedTransaction && !validationError;

  const handleAddSplit = () => {
    const newSplit: SplitPart = {
      id: generateId(),
      amount: '',
      description: '',
      categoryId: '',
      transferAccountId: '',
    };
    const newSplits = [...splits, newSplit];
    setSplits(newSplits);
  };

  const handleRemoveSplit = (id: string) => {
    setSplits(splits.filter((s) => s.id !== id));
  };

  const handleSplitAmountChange = (id: string, value: string) => {
    setSplits((prevSplits) => {
      const newSplits = prevSplits.map((s) => (s.id === id ? { ...s, amount: value } : s));

      if (newSplits.length === 2 && selectedTransaction) {
        const otherIndex = newSplits.findIndex((s) => s.id !== id);
        const otherSplit = otherIndex !== -1 ? newSplits[otherIndex] : null;
        if (otherSplit) {
          const enteredAmount = displayToCents(value);
          const remainingAmount = selectedTransaction.amount - enteredAmount;
          newSplits[otherIndex] = {
            ...otherSplit,
            amount: format(remainingAmount),
          };
        }
      }

      return newSplits;
    });
  };

  const handleSplitChange = (id: string, field: keyof SplitPart, value: string) => {
    if (field === 'amount') {
      handleSplitAmountChange(id, value);
      return;
    }

    setSplits(
      splits.map((s) =>
        s.id === id
          ? {
              ...s,
              [field]: value,
              ...(field === 'categoryId' && value ? { transferAccountId: '' } : {}),
              ...(field === 'transferAccountId' && value ? { categoryId: '' } : {}),
            }
          : s
      )
    );
  };

  const handleSave = useCallback(() => {
    if (!selectedTransaction || !canSave) return;

    if (isSplit) {
      const groupId = generateId();
      const newTransactions: Transaction[] = splits.map((split) => ({
        id: generateId(),
        date: selectedTransaction.date,
        amount: displayToCents(split.amount),
        description: split.description || selectedTransaction.description,
        accountId,
        groupId,
        ...(split.categoryId && { categoryId: split.categoryId }),
        ...(split.transferAccountId && { transferAccountId: split.transferAccountId }),
      }));

      const nonDuplicates = newTransactions.filter(
        (tx) => !isDuplicateTransaction(tx, transactions)
      );
      if (nonDuplicates.length > 0) {
        addTransactions(nonDuplicates);
      }
    } else {
      const transaction: Transaction = {
        id: generateId(),
        date: selectedTransaction.date,
        amount: selectedTransaction.amount,
        description: selectedTransaction.description,
        accountId,
        ...(categoryId && { categoryId }),
        ...(transferAccountId && { transferAccountId }),
      };

      if (!isDuplicateTransaction(transaction, transactions)) {
        addTransactions([transaction]);
      }
    }

    deleteTriageTransaction(selectedTransaction.id);
    onSaved();
  }, [
    selectedTransaction,
    canSave,
    isSplit,
    splits,
    accountId,
    categoryId,
    transferAccountId,
    transactions,
    addTransactions,
    deleteTriageTransaction,
    onSaved,
  ]);

  const handleDelete = useCallback(() => {
    if (!selectedTransaction) return;
    deleteTriageTransaction(selectedTransaction.id);
    onDeleted();
  }, [selectedTransaction, deleteTriageTransaction, onDeleted]);

  if (!selectedTransaction) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          Select a transaction from the list below to edit
        </Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="lg">
            Edit Transaction
          </Text>
          <Text c={selectedTransaction.amount >= 0 ? 'income.6' : 'expense.6'} fw={600}>
            {format(selectedTransaction.amount)}
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          {selectedTransaction.date} • {selectedTransaction.description}
        </Text>

        <Divider />

        <ButtonSelect
          label="Account"
          options={accountOptions}
          value={accountId}
          onChange={setAccountId}
        />

        {!isSplit && (
          <>
            <ButtonSelect
              label="Category"
              options={categoryOptions}
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
                if (value) setTransferAccountId('');
              }}
              allowNone
            />

            {transferOptions.length > 0 && (
              <ButtonSelect
                label="Transfer To"
                options={transferOptions}
                value={transferAccountId}
                onChange={(value) => {
                  setTransferAccountId(value);
                  if (value) setCategoryId('');
                }}
                allowNone
              />
            )}
          </>
        )}

        <Divider label="Split" labelPosition="center" />

        {!isSplit ? (
          <Button variant="light" onClick={() => setIsSplit(true)}>
            Split Transaction
          </Button>
        ) : (
          <SplitEditor
            splits={splits}
            categoryOptions={categoryOptions}
            transferOptions={transferOptions}
            onAddSplit={handleAddSplit}
            onRemoveSplit={handleRemoveSplit}
            onSplitAmountChange={handleSplitAmountChange}
            onSplitChange={handleSplitChange}
            onCancel={() => setIsSplit(false)}
          />
        )}

        <Divider />

        <Group justify="space-between" align="center">
          <Button variant="subtle" color="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Group gap="xs" align="center">
            {validationError && (
              <Text c="danger" size="sm">
                {validationError}
              </Text>
            )}
            <Button disabled={!canSave} onClick={handleSave}>
              Save to Transactions
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
