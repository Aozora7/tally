import { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
  type IRowNode,
} from 'ag-grid-community';
import { Button, Group, Modal, Stack, TextInput, Select, Title, ActionIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconPlaylistAdd } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import { useCurrency, displayToCents } from '@/utils/currency';
import { useAgGridTheme } from '@/utils/agGridTheme';
import type { Account, Transaction } from '@/types';
import { useDisclosure } from '@mantine/hooks';
import { RulePreviewModal } from '../components/RulePreviewModal/RulePreviewModal';
import { TransactionFilterBar, type TransactionFilterState } from '../components/TransactionFilterBar/TransactionFilterBar';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TransactionFormData {
  date: string;
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  transferAccountId: string;
}

import { dateValueFormatter, dateValueParser } from '@/utils/agGridFormatters';

function currencyValueParser(params: { newValue: string }): number {
  return displayToCents(params.newValue);
}

function useCurrencyValueGetter() {
  const { format } = useCurrency();
  return useCallback(
    (params: { data: Transaction | null | undefined }) => {
      if (params.data?.amount === null || params.data?.amount === undefined) return '';
      return format(params.data.amount);
    },
    [format]
  );
}

interface AddTransactionFormProps {
  opened: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: { id: string; name: string }[];
  onAdd: (transaction: Transaction) => void;
}

function AddTransactionForm({ opened, onClose, accounts, categories, onAdd }: AddTransactionFormProps) {
  const accountOptions = useMemo(() => accounts.map((a) => ({ value: a.id, label: a.name })), [accounts]);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);

  const form = useForm<TransactionFormData>({
    initialValues: {
      date: new Date().toISOString().split('T')[0] ?? '',
      amount: '',
      description: '',
      accountId: accounts.find((a) => a.isDefault)?.id ?? '',
      categoryId: '',
      transferAccountId: '',
    },
    validate: {
      date: (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Invalid date (YYYY-MM-DD)'),
      amount: (value) => (value.trim().length > 0 ? null : 'Amount is required'),
      description: (value) => (value.trim().length > 0 ? null : 'Description is required'),
      accountId: (value) => (value.length > 0 ? null : 'Account is required'),
      categoryId: (value, values) => {
        if (value && values.transferAccountId) return 'Cannot have both category and transfer';
        if (!value && !values.transferAccountId) return 'Must have either a category or transfer';
        return null;
      },
      transferAccountId: (value, values) => {
        if (value && values.categoryId) return 'Cannot have both category and transfer';
        if (!value && !values.categoryId) return 'Must have either a category or transfer';
        return null;
      },
    },
  });

  const handleSubmit = (values: TransactionFormData) => {
    const transaction: Transaction = {
      id: generateId(),
      date: values.date,
      amount: displayToCents(values.amount),
      description: values.description.trim(),
      accountId: values.accountId,
      ...(values.categoryId && { categoryId: values.categoryId }),
      ...(values.transferAccountId && { transferAccountId: values.transferAccountId }),
    };
    onAdd(transaction);
    onClose();
    form.reset();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Transaction">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput label="Date" placeholder="YYYY-MM-DD" {...form.getInputProps('date')} />
          <TextInput label="Amount" placeholder="$0.00" {...form.getInputProps('amount')} />
          <TextInput label="Description" placeholder="Enter description" {...form.getInputProps('description')} />
          <Select label="Account" data={accountOptions} {...form.getInputProps('accountId')} />
          <Select
            label="Category"
            data={[{ value: '', label: 'None' }, ...categoryOptions]}
            {...form.getInputProps('categoryId')}
          />
          <Select
            label="Transfer To"
            data={[{ value: '', label: 'None' }, ...accountOptions]}
            {...form.getInputProps('transferAccountId')}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function useColumnDefs(
  accounts: Account[],
  categories: { id: string; name: string }[],
  accountOptions: { value: string; label: string }[],
  categoryOptions: { value: string; label: string }[],
  deleteTransaction: (id: string) => void
) {
  const currencyValueGetter = useCurrencyValueGetter();
  return useMemo<ColDef<Transaction>[]>(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        valueFormatter: dateValueFormatter,
        valueParser: dateValueParser,
        editable: true,
        sort: 'desc',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        valueGetter: currencyValueGetter,
        valueParser: currencyValueParser,
        comparator: (_valueA, _valueB, nodeA, nodeB) => {
          const a = nodeA.data?.amount ?? 0;
          const b = nodeB.data?.amount ?? 0;
          return a - b;
        },
        editable: true,
        cellStyle: (params) => {
          if (params.data?.amount === null || params.data?.amount === undefined) return {};
          return {
            color: params.data.amount >= 0 ? 'var(--mantine-color-income-6)' : 'var(--mantine-color-expense-6)',
          };
        },
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
        editable: true,
        filter: true,
      },
      {
        field: 'accountId',
        headerName: 'Account',
        width: 150,
        valueFormatter: (params) => {
          const account = accounts.find((a) => a.id === params.value);
          return account?.name ?? '';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: accountOptions.map((o) => o.value),
        },
        editable: true,
        filter: true,
        filterValueGetter: (params) => {
          const account = accounts.find((a) => a.id === params.data?.accountId);
          return account?.name ?? '';
        },
        filterParams: {
          buttons: ['apply', 'reset'],
        },
      },
      {
        field: 'categoryId',
        headerName: 'Category',
        width: 150,
        valueFormatter: (params) => {
          if (!params.value) return '';
          const category = categories.find((c) => c.id === params.value);
          return category?.name ?? '';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...categoryOptions.map((o) => o.value)],
        },
        editable: true,
        filter: true,
        filterValueGetter: (params) => {
          if (!params.data) return '(None)';
          if (!params.data.categoryId) return '(None)';
          const category = categories.find((c) => c.id === params.data!.categoryId);
          return category?.name ?? '';
        },
        filterParams: {
          buttons: ['apply', 'reset'],
        },
      },
      {
        field: 'transferAccountId',
        headerName: 'Transfer To',
        width: 150,
        valueFormatter: (params) => {
          if (!params.value) return '';
          const account = accounts.find((a) => a.id === params.value);
          return account?.name ?? '';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...accountOptions.map((o) => o.value)],
        },
        editable: true,
        filter: true,
        filterValueGetter: (params) => {
          if (!params.data) return '(None)';
          if (!params.data.transferAccountId) return '(None)';
          const account = accounts.find((a) => a.id === params.data!.transferAccountId);
          return account?.name ?? '';
        },
        filterParams: {
          buttons: ['apply', 'reset'],
        },
      },
      {
        headerName: 'Actions',
        width: 80,
        cellRenderer: (params: { data: Transaction }) => (
          <ActionIcon color="danger" onClick={() => deleteTransaction(params.data.id)} aria-label="Delete">
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        ),
        editable: false,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
    ],
    [accounts, categories, accountOptions, categoryOptions, deleteTransaction, currencyValueGetter]
  );
}

export function Transactions() {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction, rules } = useFinance();
  const agGridTheme = useAgGridTheme();
  const [rulesModalOpened, rulesModalHandlers] = useDisclosure(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [filter, setFilter] = useState<TransactionFilterState>({
    searchText: '',
    dateFrom: '',
    dateTo: '',
    categoryType: null,
    categoryId: null,
  });
  const gridRef = useRef<AgGridReact<Transaction>>(null);

  const accountOptions = useMemo(() => accounts.map((a) => ({ value: a.id, label: a.name })), [accounts]);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);

  const columnDefs = useColumnDefs(accounts, categories, accountOptions, categoryOptions, deleteTransaction);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Transaction>) => {
      if (event.data) {
        const updatedData = { ...event.data };
        if (event.colDef.field === 'categoryId' && event.newValue) {
          delete updatedData.transferAccountId;
        }
        if (event.colDef.field === 'transferAccountId' && event.newValue) {
          delete updatedData.categoryId;
        }
        updateTransaction(updatedData);
      }
    },
    [updateTransaction]
  );

  const { format: formatCurrency } = useCurrency();

  const isExternalFilterPresent = useCallback((): boolean => {
    return (
      filter.searchText !== '' ||
      filter.dateFrom !== '' ||
      filter.dateTo !== '' ||
      filter.categoryType !== null ||
      filter.categoryId !== null
    );
  }, [filter]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode<Transaction>): boolean => {
      const t = node.data;
      if (!t) return false;

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        const accountName = accounts.find((a) => a.id === t.accountId)?.name ?? '';
        const categoryName = t.categoryId ? (categories.find((c) => c.id === t.categoryId)?.name ?? '') : '';
        const transferName = t.transferAccountId ? (accounts.find((a) => a.id === t.transferAccountId)?.name ?? '') : '';
        const formattedAmount = formatCurrency(t.amount).toLowerCase();

        const matches =
          t.date.includes(searchLower) ||
          formattedAmount.includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          accountName.toLowerCase().includes(searchLower) ||
          categoryName.toLowerCase().includes(searchLower) ||
          transferName.toLowerCase().includes(searchLower);

        if (!matches) return false;
      }

      if (filter.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filter.dateFrom) && t.date < filter.dateFrom) return false;
      if (filter.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filter.dateTo) && t.date > filter.dateTo) return false;

      if (filter.categoryType) {
        const cat = categories.find((c) => c.id === t.categoryId);
        if (!cat || cat.type !== filter.categoryType) return false;
      }

      if (filter.categoryId && t.categoryId !== filter.categoryId) return false;

      return true;
    },
    [filter, accounts, categories, formatCurrency]
  );

  const handleFilterChange = useCallback((newFilter: TransactionFilterState) => {
    setFilter(newFilter);
    gridRef.current?.api?.onFilterChanged();
  }, []);

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <RulePreviewModal opened={rulesModalOpened} onClose={() => rulesModalHandlers.close()} source="transaction" />
      <Group justify="space-between">
        <Title order={3}>Transactions</Title>
        <Group>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Transaction
          </Button>
          {rules.length > 0 && (
            <Button variant="light" leftSection={<IconPlaylistAdd size={16} />} onClick={() => rulesModalHandlers.open()}>
              Apply Rules
            </Button>
          )}
        </Group>
      </Group>

      <TransactionFilterBar filter={filter} onFilterChange={handleFilterChange} categories={categories} />

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <AgGridReact<Transaction>
          ref={gridRef}
          rowData={transactions}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          onCellValueChanged={onCellValueChanged}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          animateRows={false}
          domLayout="normal"
          theme={agGridTheme}
        />
      </div>

      <AddTransactionForm
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        accounts={accounts}
        categories={categories}
        onAdd={addTransaction}
      />
    </Stack>
  );
}
