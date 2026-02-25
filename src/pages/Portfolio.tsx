import { useMemo, useState, useCallback } from 'react';
import { Stack, Title, Paper, Table, Text, Box, Grid, Button, Group } from '@mantine/core';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
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

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function PortfolioValueChart({ checkpoints, format }: PortfolioValueChartProps) {
  const chartData = useMemo(
    () => checkpoints.map((cp) => ({ month: cp.yearMonth, value: cp.totalValue / 100 })),
    [checkpoints]
  );

  const yearGroups = useMemo(() => {
    if (chartData.length === 0)
      return [] as { year: string; startIndex: number; endIndex: number }[];
    const groups: { year: string; startIndex: number; endIndex: number }[] = [];
    let currentYear = '';
    chartData.forEach((item, idx) => {
      const year = item.month.substring(0, 4);
      if (year !== currentYear) {
        groups.push({ year, startIndex: idx, endIndex: idx });
        currentYear = year;
      } else if (groups.length > 0) {
        groups[groups.length - 1]!.endIndex = idx;
      }
    });
    return groups;
  }, [chartData]);

  const monthTicks = useMemo(() => {
    const n = chartData.length;
    const step = n <= 24 ? 1 : n <= 48 ? 2 : n <= 120 ? 3 : n <= 180 ? 6 : 12;
    return chartData
      .filter((d) => (parseInt(d.month.substring(5, 7), 10) - 1) % step === 0)
      .map((d) => d.month);
  }, [chartData]);

  const yearTicks = useMemo(
    () =>
      yearGroups
        .map((g) => chartData[Math.floor((g.startIndex + g.endIndex) / 2)]?.month)
        .filter((m): m is string => !!m),
    [yearGroups, chartData]
  );

  if (checkpoints.length === 0) return null;

  return (
    <>
      <Title order={4}>Portfolio Value Over Time</Title>
      <Paper p="md" withBorder mt="xs">
        <Box h={300}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />

              {/* Alternating year background bands */}
              {yearGroups.map((group, idx) =>
                idx % 2 === 1 ? (
                  <ReferenceArea
                    key={group.year}
                    xAxisId={0}
                    x1={chartData[group.startIndex]!.month}
                    x2={chartData[group.endIndex]!.month}
                    fill="rgba(128,128,128,0.08)"
                    stroke="none"
                  />
                ) : null
              )}

              {/* Month axis */}
              <XAxis
                xAxisId={0}
                dataKey="month"
                ticks={monthTicks}
                tickFormatter={(v: string) =>
                  MONTH_NAMES[parseInt(v.substring(5, 7), 10) - 1] ?? ''
                }
                angle={-45}
                textAnchor="end"
                height={35}
                interval={0}
                tickLine={false}
                dy={5}
                dx={-10}
                tick={{ fontSize: 12 }}
              />

              {/* Year axis */}
              <XAxis
                xAxisId={1}
                dataKey="month"
                ticks={yearTicks}
                tickFormatter={(v: string) => v.substring(0, 4)}
                tickLine={false}
                axisLine={false}
                height={22}
                tick={{ fontSize: 12, fontWeight: 600 }}
                orientation="top"
              />

              <YAxis
                width={75}
                tickFormatter={(v: number) => format(v * 100)}
                tick={{ fontSize: 11 }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const value = (payload[0]?.value ?? 0) as number;
                  return (
                    <Paper px="sm" py="xs" withBorder shadow="md" style={{ pointerEvents: 'none' }}>
                      <Text size="sm" fw={500}>
                        {label}
                      </Text>
                      <Text size="xs" c="brand.6" fw={600}>
                        {format(value * 100)}
                      </Text>
                    </Paper>
                  );
                }}
              />

              <Bar xAxisId={0} dataKey="value" fill="#1791E8" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </>
  );
}

interface CurrentHoldingsTableProps {
  checkpoint: PortfolioCheckpoint;
  format: (cents: number) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

function CurrentHoldingsTable({
  checkpoint,
  format,
  currencySymbol,
  privacyMode,
}: CurrentHoldingsTableProps) {
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
        {privacyMode ? 'XXXX' : unitsToDisplay(h.units)}
      </Table.Td>
      <Table.Td ta="right" ff="monospace">
        {priceToDisplay(h.price, currencySymbol)}
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
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Security</Table.Th>
              <Table.Th ta="right">Units</Table.Th>
              <Table.Th ta="right">Price</Table.Th>
              <Table.Th ta="right">Value</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows}
            <Table.Tr>
              <Table.Td fw={700} colSpan={3}>
                Total
              </Table.Td>
              <Table.Td ta="right" fw={700} c="income.6">
                {format(checkpoint.totalValue)}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
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
  const {
    securities,
    securityTransactions,
    securityPriceCache,
    fetchAndCachePrices,
    fetchAndCacheCurrentPrice,
  } = useSecurities();
  const { format, currencySymbol, privacyMode } = useCurrency();
  const [isFetching, setIsFetching] = useState(false);

  const checkpoints = usePortfolioCheckpoints(securities, securityTransactions, securityPriceCache);

  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return checkpoints[checkpoints.length - 1] ?? null;
  }, [checkpoints]);

  const handleFetchCurrentPrices = useCallback(async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const securityMonths = getMonthsForPositions(securityTransactions);

    const unitsBySecurity = new Map<string, number>();
    for (const txn of securityTransactions) {
      const current = unitsBySecurity.get(txn.securityId) ?? 0;
      const delta = txn.type === 'Buy' ? txn.units : -txn.units;
      unitsBySecurity.set(txn.securityId, current + delta);
    }
    const nonZeroPositions = new Set<string>();
    for (const [securityId, units] of unitsBySecurity) {
      if (units > 0) nonZeroPositions.add(securityId);
    }

    const cachedBySecurity = new Map<string, Set<string>>();
    for (const cache of securityPriceCache) {
      if (!cachedBySecurity.has(cache.securityId)) {
        cachedBySecurity.set(cache.securityId, new Set());
      }
      cachedBySecurity.get(cache.securityId)!.add(cache.yearMonth);
    }

    const fetchTasks: Promise<void>[] = [];

    for (const securityId of nonZeroPositions) {
      const security = securities.find((s) => s.id === securityId);
      if (!security) continue;

      const monthsNeeded = securityMonths.get(securityId) ?? new Set();
      const cached = cachedBySecurity.get(securityId) ?? new Set();
      const missingPastMonths = Array.from(monthsNeeded).filter((m) => !cached.has(m));

      if (missingPastMonths.length > 0) {
        const earliestMissing = missingPastMonths.sort()[0]!;
        const startDate = `${earliestMissing}-01`;
        fetchTasks.push(fetchAndCachePrices(securityId, security.ticker, startDate, today));
      }
      fetchTasks.push(fetchAndCacheCurrentPrice(securityId, security.ticker));
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
  }, [
    securities,
    securityTransactions,
    securityPriceCache,
    fetchAndCachePrices,
    fetchAndCacheCurrentPrice,
  ]);

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
        <Grid.Col>
          {latestCheckpoint && (
            <CurrentHoldingsTable
              checkpoint={latestCheckpoint}
              format={format}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          )}
        </Grid.Col>
      </Grid>
      <Grid>
        <Grid.Col>
          <PortfolioValueChart checkpoints={checkpoints} format={format} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
