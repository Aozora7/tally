import { useMemo, useState, useCallback } from 'react';
import { Stack, Title, Paper, Table, Text, Box, Grid, Button, Group } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconChartBarOff, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useSecurities } from '@/context/SecuritiesContext';
import { usePortfolioCheckpoints, type PortfolioCheckpoint } from '@/utils/usePortfolioCheckpoints';
import { useCurrency } from '@/utils/currency';
import { unitsToDisplay, priceToDisplay } from '@/utils/securities';
import { isTauri } from '@/utils/tauri';

interface PortfolioValueChartProps {
  checkpoints: PortfolioCheckpoint[];
  format: (cents: number) => string;
}

const portfolioSeries = [{ name: 'value', color: 'brand.6' }];

function PortfolioValueChart({ checkpoints, format }: PortfolioValueChartProps) {
  if (checkpoints.length === 0) return null;

  const chartData = checkpoints.map((cp) => ({
    month: cp.yearMonth,
    value: cp.totalValue / 100,
  }));

  return (
    <>
      <Title order={4}>Portfolio Value Over Time</Title>
      <Paper p="md" withBorder mt="xs">
        <Box h={300}>
          <BarChart
            h={280}
            data={chartData}
            dataKey="month"
            series={portfolioSeries}
            tickLine="y"
            gridAxis="xy"
            valueFormatter={(value) => format(value * 100)}
            tooltipProps={{
              content: (props: {
                label?: string | number;
                payload?: readonly { value?: number }[];
                active?: boolean;
              }) => {
                if (!props.active || !props.payload?.length) return null;
                const value = props.payload[0]?.value ?? 0;
                return (
                  <Paper px="sm" py="xs" withBorder shadow="md">
                    <Text size="sm" fw={500}>
                      {props.label}
                    </Text>
                    <Text size="xs" c="brand.6" fw={600}>
                      {format(value * 100)}
                    </Text>
                  </Paper>
                );
              },
            }}
          />
        </Box>
      </Paper>
    </>
  );
}

interface CurrentHoldingsTableProps {
  checkpoint: PortfolioCheckpoint;
  format: (cents: number) => string;
}

function CurrentHoldingsTable({ checkpoint, format }: CurrentHoldingsTableProps) {
  if (checkpoint.holdings.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          No holdings
        </Text>
      </Paper>
    );
  }

  const rows = checkpoint.holdings.map((h) => (
    <Table.Tr key={h.securityId}>
      <Table.Td>{h.ticker}</Table.Td>
      <Table.Td ta="right" ff="monospace">
        {unitsToDisplay(h.units)}
      </Table.Td>
      <Table.Td ta="right" ff="monospace">
        {priceToDisplay(h.price)}
      </Table.Td>
      <Table.Td ta="right" ff="monospace" fw={600}>
        {format(h.value)}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Title order={4}>Current Holdings ({checkpoint.yearMonth})</Title>
      <Paper p="md" withBorder mt="xs">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Security</Table.Th>
              <Table.Th ta="right">Units</Table.Th>
              <Table.Th ta="right">Price</Table.Th>
              <Table.Th ta="right">Value</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
          <Table.Tfoot>
            <Table.Tr>
              <Table.Td fw={700} colSpan={3}>
                Total
              </Table.Td>
              <Table.Td ta="right" fw={700} ff="monospace" c="brand.6">
                {format(checkpoint.totalValue)}
              </Table.Td>
            </Table.Tr>
          </Table.Tfoot>
        </Table>
      </Paper>
    </>
  );
}

function getYearMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function getMonthsForPositions(
  transactions: { securityId: string; date: string; type: string; units: number }[]
): Map<string, Set<string>> {
  const sortedTxns = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const securityMonths = new Map<string, Set<string>>();

  if (sortedTxns.length === 0) return securityMonths;

  const allMonths = new Set<string>();
  for (const txn of sortedTxns) {
    allMonths.add(getYearMonth(txn.date));
  }
  const sortedMonths = Array.from(allMonths).sort();

  for (const month of sortedMonths) {
    const unitsBySecurity = new Map<string, number>();

    for (const txn of sortedTxns) {
      if (getYearMonth(txn.date) > month) break;
      const current = unitsBySecurity.get(txn.securityId) ?? 0;
      const delta = txn.type === 'Buy' ? txn.units : -txn.units;
      unitsBySecurity.set(txn.securityId, current + delta);
    }

    for (const [securityId, units] of unitsBySecurity) {
      if (units > 0) {
        if (!securityMonths.has(securityId)) {
          securityMonths.set(securityId, new Set());
        }
        securityMonths.get(securityId)!.add(month);
      }
    }
  }

  return securityMonths;
}

export function Portfolio() {
  const { securities, securityTransactions, securityPriceCache, fetchAndCachePrices } =
    useSecurities();
  const { format } = useCurrency();
  const [isFetching, setIsFetching] = useState(false);

  const checkpoints = usePortfolioCheckpoints(securities, securityTransactions, securityPriceCache);

  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return checkpoints[checkpoints.length - 1] ?? null;
  }, [checkpoints]);

  const handleFetchCurrentPrices = useCallback(async () => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.toISOString().slice(0, 10);

    const securityMonths = getMonthsForPositions(securityTransactions);
    const cachedBySecurity = new Map<string, Set<string>>();
    for (const cache of securityPriceCache) {
      if (!cachedBySecurity.has(cache.securityId)) {
        cachedBySecurity.set(cache.securityId, new Set());
      }
      cachedBySecurity.get(cache.securityId)!.add(cache.yearMonth);
    }

    const fetchTasks: Promise<void>[] = [];

    for (const [securityId, monthsNeeded] of securityMonths) {
      const security = securities.find((s) => s.id === securityId);
      if (!security) continue;

      const cached = cachedBySecurity.get(securityId) ?? new Set();
      const missingMonths = Array.from(monthsNeeded).filter((m) => !cached.has(m));
      missingMonths.push(currentYearMonth);

      if (missingMonths.length === 0) continue;

      const earliestMissing = missingMonths.sort()[0]!;
      const startDate = `${earliestMissing}-01`;

      fetchTasks.push(fetchAndCachePrices(securityId, security.ticker, startDate, today));
    }

    if (fetchTasks.length === 0) {
      notifications.show({
        title: 'Up to date',
        message: 'All prices already cached',
        color: 'blue',
      });
      return;
    }

    setIsFetching(true);
    try {
      await Promise.all(fetchTasks);
      notifications.show({
        title: 'Prices updated',
        message: `Fetched prices for ${fetchTasks.length} securities`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Fetch failed',
        message: err instanceof Error ? err.message : String(err),
        color: 'red',
      });
    } finally {
      setIsFetching(false);
    }
  }, [securities, securityTransactions, securityPriceCache, fetchAndCachePrices]);

  if (securityTransactions.length === 0) {
    return (
      <Stack gap="md">
        <Title order={3}>Portfolio</Title>
        <Paper p="xl" withBorder>
          <Stack align="center" gap="sm" py="xl">
            <IconChartBarOff size={48} stroke={1} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No trades yet. Import trades to see your portfolio composition.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Portfolio</Title>
        {isTauri() && (
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleFetchCurrentPrices}
            loading={isFetching}
          >
            Fetch Current Prices
          </Button>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 5 }}>
          {latestCheckpoint && (
            <CurrentHoldingsTable checkpoint={latestCheckpoint} format={format} />
          )}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <PortfolioValueChart checkpoints={checkpoints} format={format} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
