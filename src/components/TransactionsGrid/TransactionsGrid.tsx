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
import type { Transaction } from '@/types';

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

export function TransactionsGrid() {
  const {
    transactions,
    accounts,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance();
  const [modalOpened, setModalOpened] = useState(false);

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
    },
  });

  const columnDefs = useMemo<ColDef<Transaction>[]>(
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

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Transaction>) => {
      if (event.data) {
        updateTransaction(event.data);
      }
    },
    [updateTransaction]
  );

  const handleAddTransaction = (values: TransactionFormData) => {
    const transaction: Transaction = {
      id: generateId(),
      date: values.date,
      amount: displayToCents(values.amount),
      description: values.description.trim(),
      accountId: values.accountId,
      ...(values.categoryId && { categoryId: values.categoryId }),
      ...(values.transferAccountId && { transferAccountId: values.transferAccountId }),
    };
    addTransaction(transaction);
    setModalOpened(false);
    form.reset();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Transactions</Title>
        <Button onClick={() => setModalOpened(true)}>Add Transaction</Button>
      </Group>

      <div style={{ height: 500, width: '100%' }} className="ag-theme-alpine ag-theme-dark">
        <AgGridReact<Transaction>
          rowData={transactions}
          columnDefs={columnDefs}
          onCellValueChanged={onCellValueChanged}
          animateRows={false}
          domLayout="normal"
        />
      </div>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add Transaction">
        <form onSubmit={form.onSubmit(handleAddTransaction)}>
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
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
