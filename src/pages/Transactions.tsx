import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import { Button, Group, Modal, Stack, TextInput, Select, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import { centsToDisplay, displayToCents } from '@/utils/currency';
import { agGridDarkTheme } from '@/utils/agGridTheme';
import type { Account, Transaction } from '@/types';
import { useDisclosure } from '@mantine/hooks';
import { RulePreviewModal } from '../components/RulePreviewModal/RulePreviewModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TransactionFormData {
  date: string;
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  transferAccountId: string;
}

function dateValueFormatter(params: { value: string | null | undefined }): string {
  if (!params.value) return '';
  const [year, month, day] = params.value.split('-');
  return `${month}/${day}/${year}`;
}

function dateValueParser(params: { newValue: string }): string {
  const value = params.newValue.trim();
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = value.match(dateRegex);
  if (match && match[1] && match[2] && match[3]) {
    const month = match[1];
    const day = match[2];
    const year = match[3];
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(value)) {
    return value;
  }
  return value;
}

function currencyValueFormatter(params: { value: number | null | undefined }): string {
  if (params.value === null || params.value === undefined) return '';
  return centsToDisplay(params.value);
}

function currencyValueParser(params: { newValue: string }): number {
  return displayToCents(params.newValue);
}

interface AddTransactionFormProps {
  opened: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: { id: string; name: string }[];
  onAdd: (transaction: Transaction) => void;
}

function AddTransactionForm({
  opened,
  onClose,
  accounts,
  categories,
  onAdd,
}: AddTransactionFormProps) {
  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

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
          <TextInput
            label="Description"
            placeholder="Enter description"
            {...form.getInputProps('description')}
          />
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
  return useMemo<ColDef<Transaction>[]>(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        valueFormatter: dateValueFormatter,
        valueParser: dateValueParser,
        editable: true,
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        valueFormatter: currencyValueFormatter,
        valueParser: currencyValueParser,
        editable: true,
        cellStyle: (params) => {
          if (params.value === null || params.value === undefined) return {};
          return {
            color:
              params.value >= 0
                ? 'var(--mantine-color-income-6)'
                : 'var(--mantine-color-expense-6)',
          };
        },
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
        editable: true,
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
      },
      {
        field: 'groupId',
        headerName: 'Group',
        width: 100,
        editable: false,
      },
      {
        headerName: 'Actions',
        width: 100,
        cellRenderer: (params: { data: Transaction }) => (
          <Button
            size="xs"
            variant="light"
            color="danger"
            onClick={() => deleteTransaction(params.data.id)}
          >
            Delete
          </Button>
        ),
        editable: false,
      },
    ],
    [accounts, categories, accountOptions, categoryOptions, deleteTransaction]
  );
}

export function Transactions() {
  const {
    transactions,
    accounts,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    rules,
  } = useFinance();
  const [rulesModalOpened, rulesModalHandlers] = useDisclosure(false);
  const [modalOpened, setModalOpened] = useState(false);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const columnDefs = useColumnDefs(
    accounts,
    categories,
    accountOptions,
    categoryOptions,
    deleteTransaction
  );

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

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <RulePreviewModal
        opened={rulesModalOpened}
        onClose={() => rulesModalHandlers.close()}
        source="transaction"
      />
      <Group justify="space-between">
        <Title order={3}>Transactions</Title>
        <Group>
          <Button onClick={() => setModalOpened(true)}>Add Transaction</Button>
          {rules.length > 0 && (
            <Button variant="light" onClick={() => rulesModalHandlers.open()}>
              Apply Rules
            </Button>
          )}
        </Group>
      </Group>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <AgGridReact<Transaction>
          rowData={transactions}
          columnDefs={columnDefs}
          onCellValueChanged={onCellValueChanged}
          animateRows={false}
          domLayout="normal"
          theme={agGridDarkTheme}
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
