import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import { Button, Group, Modal, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useSecurities } from '@/context/SecuritiesContext';
import { generateId } from '@/utils/uuid';
import { agGridDarkTheme } from '@/utils/agGridTheme';
import type { Security } from '@/types';

ModuleRegistry.registerModules([AllCommunityModule]);

interface SecurityFormData {
  ticker: string;
  isin: string;
  label: string;
  exchange: string;
}

interface AddSecurityFormProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (security: Security) => void;
}

function AddSecurityForm({ opened, onClose, onAdd }: AddSecurityFormProps) {
  const form = useForm<SecurityFormData>({
    initialValues: {
      ticker: '',
      isin: '',
      label: '',
      exchange: '',
    },
    validate: {
      ticker: (value) => (value.trim().length > 0 ? null : 'Ticker is required'),
      label: (value) => (value.trim().length > 0 ? null : 'Label is required'),
    },
  });

  const handleSubmit = (values: SecurityFormData) => {
    const security: Security = {
      id: generateId(),
      ticker: values.ticker.trim(),
      isin: values.isin.trim(),
      label: values.label.trim(),
      exchange: values.exchange.trim(),
    };
    onAdd(security);
    onClose();
    form.reset();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Security">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Ticker"
            placeholder="AMS:IWDA"
            {...form.getInputProps('ticker')}
          />
          <TextInput
            label="ISIN"
            placeholder="IE00B4L5Y983"
            {...form.getInputProps('isin')}
          />
          <TextInput
            label="Label"
            placeholder="iShares Core MSCI World"
            {...form.getInputProps('label')}
          />
          <TextInput
            label="Exchange"
            placeholder="Euronext Amsterdam"
            {...form.getInputProps('exchange')}
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

function useColumnDefs(deleteSecurity: (id: string) => void) {
  return useMemo<ColDef<Security>[]>(
    () => [
      {
        field: 'ticker',
        headerName: 'Ticker',
        width: 150,
        editable: true,
      },
      {
        field: 'isin',
        headerName: 'ISIN',
        width: 180,
        editable: true,
      },
      {
        field: 'label',
        headerName: 'Label',
        flex: 1,
        minWidth: 200,
        editable: true,
        filter: true,
      },
      {
        field: 'exchange',
        headerName: 'Exchange',
        width: 200,
        editable: true,
        filter: true,
      },
      {
        headerName: 'Actions',
        width: 100,
        cellRenderer: (params: { data: Security }) => (
          <Button
            size="xs"
            variant="light"
            color="danger"
            leftSection={<IconTrash size={14} />}
            onClick={() => deleteSecurity(params.data.id)}
          >
            Delete
          </Button>
        ),
        editable: false,
      },
    ],
    [deleteSecurity]
  );
}

export function Securities() {
  const { securities, addSecurity, updateSecurity, deleteSecurity } = useSecurities();
  const [modalOpened, setModalOpened] = useState(false);

  const columnDefs = useColumnDefs(deleteSecurity);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Security>) => {
      if (event.data) {
        updateSecurity({ ...event.data });
      }
    },
    [updateSecurity]
  );

  return (
    <Stack gap="md" flex={1} style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Title order={3}>Securities</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          Add Security
        </Button>
      </Group>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <AgGridReact<Security>
          rowData={securities}
          columnDefs={columnDefs}
          onCellValueChanged={onCellValueChanged}
          animateRows={false}
          domLayout="normal"
          theme={agGridDarkTheme}
        />
      </div>

      <AddSecurityForm
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onAdd={addSecurity}
      />
    </Stack>
  );
}
