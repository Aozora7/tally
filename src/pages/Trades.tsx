import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import { ActionIcon, Button, Group, Modal, Stack, TextInput, Select, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useSecurities } from '@/context/SecuritiesContext';
import { generateId } from '@/utils/uuid';
import { useCurrency } from '@/utils/currency';
import { unitsToDisplay, displayToUnits, priceToDisplay, displayToPrice } from '@/utils/securities';
import { agGridDarkTheme } from '@/utils/agGridTheme';
import { openFileDialog } from '@/utils/tauri';
import { parseSecuritiesCsv } from '@/utils/securitiesImport';
import { notifications } from '@mantine/notifications';
import type { Security, SecurityTransaction, SecurityTransactionType } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

interface TradeFormData {
  date: string;
  type: SecurityTransactionType;
  securityId: string;
  units: string;
  pricePerUnit: string;
  fees: string;
}

import { dateValueFormatter, dateValueParser } from '@/utils/agGridFormatters';

interface AddTradeFormProps {
  opened: boolean;
  onClose: () => void;
  securities: Security[];
  onAdd: (transaction: SecurityTransaction) => void;
}

function AddTradeForm({ opened, onClose, securities, onAdd }: AddTradeFormProps) {
  const securityOptions = useMemo(
    () => securities.map((s) => ({ value: s.id, label: s.ticker })),
    [securities]
  );

  const form = useForm<TradeFormData>({
    initialValues: {
      date: new Date().toISOString().split('T')[0] ?? '',
      type: 'Buy',
      securityId: '',
      units: '',
      pricePerUnit: '',
      fees: '',
    },
    validate: {
      date: (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Invalid date (YYYY-MM-DD)'),
      securityId: (value) => (value.length > 0 ? null : 'Security is required'),
      units: (value) => (value.trim().length > 0 ? null : 'Units is required'),
      pricePerUnit: (value) => (value.trim().length > 0 ? null : 'Price is required'),
    },
  });

  const handleSubmit = (values: TradeFormData) => {
    const transaction: SecurityTransaction = {
      id: generateId(),
      date: values.date,
      type: values.type,
      securityId: values.securityId,
      units: displayToUnits(values.units),
      pricePerUnit: displayToPrice(values.pricePerUnit),
      fees: displayToPrice(values.fees || '0'),
    };
    onAdd(transaction);
    onClose();
    form.reset();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Trade">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput label="Date" placeholder="YYYY-MM-DD" {...form.getInputProps('date')} />
          <Select
            label="Type"
            data={[
              { value: 'Buy', label: 'Buy' },
              { value: 'Sell', label: 'Sell' },
            ]}
            {...form.getInputProps('type')}
          />
          <Select
            label="Security"
            data={securityOptions}
            searchable
            {...form.getInputProps('securityId')}
          />
          <TextInput label="Units" placeholder="121" {...form.getInputProps('units')} />
          <TextInput
            label="Price Per Unit"
            placeholder="47.78"
            {...form.getInputProps('pricePerUnit')}
          />
          <TextInput label="Fees" placeholder="10.00" {...form.getInputProps('fees')} />
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
  securities: Security[],
  securityOptions: { value: string; label: string }[],
  currencySymbol: string,
  privacyMode: boolean,
  deleteSecurityTransaction: (id: string) => void
) {
  return useMemo<ColDef<SecurityTransaction>[]>(
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
        field: 'type',
        headerName: 'Type',
        width: 90,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Buy', 'Sell'] },
        editable: true,
      },
      {
        field: 'securityId',
        headerName: 'Security',
        width: 150,
        valueFormatter: (params) => {
          const security = securities.find((s) => s.id === params.value);
          return security?.ticker ?? '';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: securityOptions.map((o) => o.value),
        },
        editable: true,
        filter: true,
        filterValueGetter: (params) => {
          const security = securities.find((s) => s.id === params.data?.securityId);
          return security?.ticker ?? '';
        },
      },
      {
        field: 'units',
        headerName: 'Units',
        width: 120,
        valueGetter: (params) => {
          if (params.data?.units === null || params.data?.units === undefined) return '';
          if (privacyMode) return 'XXXX';
          return unitsToDisplay(params.data.units);
        },
        valueParser: (params) => displayToUnits(params.newValue),
        editable: true,
      },
      {
        field: 'pricePerUnit',
        headerName: 'Price',
        width: 130,
        valueGetter: (params) => {
          if (params.data?.pricePerUnit === null || params.data?.pricePerUnit === undefined)
            return '';
          return priceToDisplay(params.data.pricePerUnit, currencySymbol);
        },
        valueParser: (params) => displayToPrice(params.newValue),
        editable: true,
      },
      {
        field: 'fees',
        headerName: 'Fees',
        width: 110,
        valueGetter: (params) => {
          if (params.data?.fees === null || params.data?.fees === undefined) return '';
          return priceToDisplay(params.data.fees, currencySymbol);
        },
        valueParser: (params) => displayToPrice(params.newValue),
        editable: true,
      },
      {
        headerName: 'Total',
        width: 140,
        valueGetter: (params) => {
          if (!params.data) return '';
          if (privacyMode) return `${currencySymbol}XXXX.XX`;
          const units = params.data.units / 10000;
          const price = params.data.pricePerUnit / 10000;
          const fees = params.data.fees / 10000;
          const total = units * price + fees;
          return `${currencySymbol}${total.toFixed(2)}`;
        },
        editable: false,
      },
      {
        headerName: 'Actions',
        width: 80,
        cellRenderer: (params: { data: SecurityTransaction }) => (
          <ActionIcon
            color="danger"
            onClick={() => deleteSecurityTransaction(params.data.id)}
            aria-label="Delete"
          >
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        ),
        editable: false,
        cellStyle: { display: 'flex', alignItems: 'center' },
      },
    ],
    [securities, securityOptions, currencySymbol, privacyMode, deleteSecurityTransaction]
  );
}

export function Trades() {
  const {
    securities,
    securityTransactions,
    addSecurities,
    addSecurityTransaction,
    addSecurityTransactions,
    updateSecurityTransaction,
    deleteSecurityTransaction,
  } = useSecurities();
  const { currencySymbol, privacyMode } = useCurrency();
  const [modalOpened, setModalOpened] = useState(false);

  const securityOptions = useMemo(
    () => securities.map((s) => ({ value: s.id, label: s.ticker })),
    [securities]
  );

  const handleImport = useCallback(async () => {
    const result = await openFileDialog({
      title: 'Import Securities Transactions',
      filters: [{ name: 'CSV/TSV', extensions: ['csv', 'tsv', 'txt'] }],
    });
    if (!result) return;

    try {
      const importResult = parseSecuritiesCsv(result.content, securities);
      if (importResult.errors.length > 0) {
        notifications.show({
          title: 'Import warnings',
          message: importResult.errors.slice(0, 5).join('\n'),
          color: 'warning',
        });
      }

      if (importResult.securities.length > 0) {
        addSecurities(importResult.securities);
      }
      if (importResult.transactions.length > 0) {
        addSecurityTransactions(importResult.transactions);
      }

      const msg = `Imported ${importResult.transactions.length} transactions, ${importResult.securities.length} new securities`;
      notifications.show({ title: 'Import complete', message: msg, color: 'brand' });
    } catch (err) {
      notifications.show({
        title: 'Import failed',
        message: err instanceof Error ? err.message : String(err),
        color: 'danger',
      });
    }
  }, [securities, addSecurities, addSecurityTransactions]);

  const columnDefs = useColumnDefs(
    securities,
    securityOptions,
    currencySymbol,
    privacyMode,
    deleteSecurityTransaction
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<SecurityTransaction>) => {
      if (event.data) {
        updateSecurityTransaction({ ...event.data });
      }
    },
    [updateSecurityTransaction]
  );

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Title order={3}>Trades</Title>
        <Group gap="xs">
          <Button variant="light" leftSection={<IconUpload size={16} />} onClick={handleImport}>
            Import
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Trade
          </Button>
        </Group>
      </Group>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <AgGridReact<SecurityTransaction>
          rowData={securityTransactions}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          onCellValueChanged={onCellValueChanged}
          animateRows={false}
          domLayout="normal"
          theme={agGridDarkTheme}
        />
      </div>

      <AddTradeForm
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        securities={securities}
        onAdd={addSecurityTransaction}
      />
    </Stack>
  );
}
