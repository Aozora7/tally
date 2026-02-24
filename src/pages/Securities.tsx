import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Title,
  Table,
  ScrollArea,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconDownload, IconDatabase } from '@tabler/icons-react';
import { useSecurities } from '@/context/SecuritiesContext';
import { generateId } from '@/utils/uuid';
import { agGridDarkTheme } from '@/utils/agGridTheme';
import { isTauri } from '@/utils/tauri';
import { priceToDisplay } from '@/utils/securities';
import type { Security, SecurityPriceCache } from '@/types';
import { notifications } from '@mantine/notifications';

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
    },
  });

  const handleSubmit = (values: SecurityFormData) => {
    const security: Security = {
      id: generateId(),
      ticker: values.ticker.trim(),
    };
    if (values.isin.trim()) security.isin = values.isin.trim();
    if (values.label.trim()) security.label = values.label.trim();
    if (values.exchange.trim()) security.exchange = values.exchange.trim();
    onAdd(security);
    onClose();
    form.reset();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Security">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput label="Ticker" placeholder="AMS:IWDA" {...form.getInputProps('ticker')} />
          <TextInput label="ISIN" placeholder="IE00B4L5Y983" {...form.getInputProps('isin')} />
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

interface PriceCacheModalProps {
  opened: boolean;
  onClose: () => void;
  securityId: string | null;
  ticker: string;
  priceCache: SecurityPriceCache[];
}

function PriceCacheModal({
  opened,
  onClose,
  securityId,
  ticker,
  priceCache,
}: PriceCacheModalProps) {
  const cachedPrices = useMemo(() => {
    if (!securityId) return [];
    return priceCache
      .filter((c) => c.securityId === securityId)
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }, [securityId, priceCache]);

  return (
    <Modal opened={opened} onClose={onClose} title={`Price Cache: ${ticker}`} size="sm">
      {cachedPrices.length === 0 ? (
        <Text c="dimmed" ta="center" py="md">
          No cached prices
        </Text>
      ) : (
        <ScrollArea.Autosize mah={400}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Month</Table.Th>
                <Table.Th ta="right">Price</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cachedPrices.map((cp) => (
                <Table.Tr key={cp.id}>
                  <Table.Td>{cp.yearMonth}</Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {priceToDisplay(cp.price)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}
    </Modal>
  );
}

function useColumnDefs(
  deleteSecurity: (id: string) => void,
  onFetchPrices: (security: Security) => void,
  onViewCache: (security: Security) => void,
  fetchingIds: Set<string>,
  showPriceFetch: boolean
) {
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
        width: showPriceFetch ? 120 : 80,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (params: { data: Security }) => (
          <Group gap={4} wrap="nowrap">
            {showPriceFetch && (
              <ActionIcon
                color="brand"
                onClick={() => onFetchPrices(params.data)}
                disabled={!params.data.ticker}
                loading={fetchingIds.has(params.data.id)}
                aria-label="Fetch prices"
              >
                <IconDownload size={16} stroke={1.5} />
              </ActionIcon>
            )}
            <ActionIcon
              color="accent"
              onClick={() => onViewCache(params.data)}
              aria-label="View cache"
            >
              <IconDatabase size={16} stroke={1.5} />
            </ActionIcon>
            <ActionIcon
              color="danger"
              onClick={() => deleteSecurity(params.data.id)}
              aria-label="Delete"
            >
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
          </Group>
        ),
        editable: false,
      },
    ],
    [deleteSecurity, onFetchPrices, onViewCache, fetchingIds, showPriceFetch]
  );
}

export function Securities() {
  const {
    securities,
    securityTransactions,
    securityPriceCache,
    addSecurity,
    updateSecurity,
    deleteSecurity,
    fetchAndCachePrices,
  } = useSecurities();
  const [modalOpened, setModalOpened] = useState(false);
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set());
  const [cacheModal, setCacheModal] = useState<{
    opened: boolean;
    securityId: string | null;
    ticker: string;
  }>({
    opened: false,
    securityId: null,
    ticker: '',
  });

  const handleFetchPrices = useCallback(
    async (security: Security) => {
      const txns = securityTransactions.filter((t) => t.securityId === security.id);
      if (txns.length === 0) {
        notifications.show({
          title: 'No transactions',
          message: 'Add transactions before fetching prices.',
          color: 'yellow',
        });
        return;
      }
      const earliest = txns.reduce((min, t) => (t.date < min ? t.date : min), txns[0]!.date);
      const today = new Date().toISOString().slice(0, 10);

      setFetchingIds((prev) => new Set(prev).add(security.id));
      try {
        await fetchAndCachePrices(security.id, security.ticker, earliest, today);
        notifications.show({
          title: 'Prices fetched',
          message: `Updated prices for ${security.ticker}`,
          color: 'green',
        });
      } catch (err) {
        notifications.show({
          title: 'Fetch failed',
          message: err instanceof Error ? err.message : String(err),
          color: 'red',
        });
      } finally {
        setFetchingIds((prev) => {
          const next = new Set(prev);
          next.delete(security.id);
          return next;
        });
      }
    },
    [securityTransactions, fetchAndCachePrices]
  );

  const handleViewCache = useCallback((security: Security) => {
    setCacheModal({ opened: true, securityId: security.id, ticker: security.ticker });
  }, []);

  const columnDefs = useColumnDefs(
    deleteSecurity,
    handleFetchPrices,
    handleViewCache,
    fetchingIds,
    isTauri()
  );

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

      <PriceCacheModal
        opened={cacheModal.opened}
        onClose={() => setCacheModal({ opened: false, securityId: null, ticker: '' })}
        securityId={cacheModal.securityId}
        ticker={cacheModal.ticker}
        priceCache={securityPriceCache}
      />
    </Stack>
  );
}
