import { useState, useMemo } from 'react';
import { Stack, Group, Paper, Text, Title, Select, Grid, Box } from '@mantine/core';
import { BarChart, DonutChart } from '@mantine/charts';
import { Legend } from 'recharts';
import { IconArrowUpRight, IconArrowDownRight, IconChartBarOff } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/utils/currency';
import {
  useTransactionSummary,
  useYearlyCategorySpending,
} from '@/utils/analytics/transactionAnalytics';
import { useMonthlyPivotTable } from '@/utils/analytics/yearlyPivotTable';
import type { ComponentType } from 'react';

const CATEGORY_COLORS = [
  'violet.6',
  'indigo.6',
  'cyan.6',
  'teal.6',
  'lime.6',
  'orange.6',
  'grape.6',
  'pink.6',
  'blue.6',
  'yellow.6',
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? 'brand.6';
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltipContent({
  label,
  payload,
  active,
  seriesNames,
  valueFormatter,
}: {
  label?: string | number;
  payload?: readonly TooltipPayloadItem[];
  active?: boolean;
  seriesNames: Set<string>;
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const seen = new Set<string>();
  const items = payload.filter((item) => {
    const name = item.name ?? '';
    if (!seriesNames.has(name) || seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <Paper px="sm" py="xs" withBorder shadow="md" style={{ pointerEvents: 'none' }}>
      {label != null && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}
      {items.map((item) => (
        <Group key={item.name} gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <Box
              w={10}
              h={10}
              style={{ borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }}
            />
            <Text size="xs" c="dimmed">
              {item.name}
            </Text>
          </Group>
          <Text size="xs" fw={500} ff="monospace">
            {valueFormatter(item.value ?? 0)}
          </Text>
        </Group>
      ))}
      {items.length > 1 && (
        <Group key="total" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <Box
              w={10}
              h={10}
              style={{ borderRadius: '50%', backgroundColor: '#9c9c9c', flexShrink: 0 }}
            />
            <Text size="xs" c="dimmed">
              Total
            </Text>
          </Group>
          <Text size="xs" fw={500} ff="monospace">
            {valueFormatter(total)}
          </Text>
        </Group>
      )}
    </Paper>
  );
}

function barTooltipContent(
  series: { name: string; color: string }[],
  valueFormatter: (value: number) => string
) {
  const seriesNames = new Set(series.map((s) => s.name));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function BarTooltip(props: any) {
    return (
      <ChartTooltipContent
        label={props.label}
        payload={props.payload}
        active={props.active}
        seriesNames={seriesNames}
        valueFormatter={valueFormatter}
      />
    );
  }
  return BarTooltip;
}

function SummaryCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
}) {
  return (
    <Paper
      p="md"
      withBorder
      style={{
        borderLeft: `3px solid var(--mantine-color-${color.replace('.', '-')})`,
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text size="xl" fw={700} c={color} ff="monospace">
            {value}
          </Text>
        </Stack>
        <Box opacity={0.4}>
          <Icon size={28} stroke={1.5} />
        </Box>
      </Group>
    </Paper>
  );
}

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  transactionCount: number;
  format: (cents: number) => string;
}

function SummaryCards({
  totalIncome,
  totalExpenses,

  format,
}: SummaryCardsProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Total Income"
          value={format(totalIncome)}
          color="income.6"
          icon={IconArrowUpRight}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Total Expenses"
          value={format(totalExpenses)}
          color="expense.6"
          icon={IconArrowDownRight}
        />
      </Grid.Col>
    </Grid>
  );
}

interface MonthlyExpensesChartProps {
  data: { month: string; Fixed: number; Cyclical: number; Irregular: number }[];
  currencySymbol: string;
}

const monthlyExpensesSeries = [
  { name: 'Fixed', color: 'danger.6' },
  { name: 'Cyclical', color: 'brand.6' },
  { name: 'Irregular', color: 'accent.6' },
];

function MonthlyExpensesChart({ data, currencySymbol }: MonthlyExpensesChartProps) {
  if (data.length === 0) return null;

  const valueFormatter = (value: number) => `${currencySymbol}${value.toFixed(2)}`;

  return (
    <>
      <Title order={4} mt="md">
        Monthly Expenses by Type
      </Title>
      <Paper p="md" withBorder>
        <Box h={300}>
          <BarChart
            h={320}
            data={data}
            dataKey="month"
            series={monthlyExpensesSeries}
            type="stacked"
            tickLine="y"
            gridAxis="xy"
            xAxisProps={{
              angle: -45,
              textAnchor: 'end',
              height: 80,
              interval: 1,
              tickLine: false,
              dy: 15,
              dx: -18,
            }}
            gridProps={{ opacity: 0.2 }}
            yAxisProps={{
              width: 75,
            }}
            valueFormatter={valueFormatter}
            tooltipProps={{
              content: barTooltipContent(monthlyExpensesSeries, valueFormatter),
            }}
          />
        </Box>
      </Paper>
    </>
  );
}

interface SpendingByCategoryChartProps {
  data: { year: string; [category: string]: string | number }[];
  series: { name: string; color: string }[];
  currencySymbol: string;
}

function SpendingByCategoryChart({ data, series, currencySymbol }: SpendingByCategoryChartProps) {
  if (data.length === 0 || series.length === 0) return null;

  const valueFormatter = (value: number) => `${currencySymbol}${value.toFixed(2)}`;

  return (
    <>
      <Title order={4}>Spending by Category per Year</Title>
      <Paper p="md" withBorder mt="xs">
        <BarChart
          h={300}
          data={data}
          dataKey="year"
          series={series}
          type="stacked"
          tickLine="y"
          gridAxis="xy"
          yAxisProps={{ width: 75 }}
          gridProps={{ opacity: 0.2 }}
          valueFormatter={valueFormatter}
          tooltipProps={{
            content: barTooltipContent(series, valueFormatter),
          }}
        />
      </Paper>
    </>
  );
}

interface CategoryBreakdownChartProps {
  data: { name: string; value: number; color: string; percentage: number }[];
  currencySymbol: string;
}

function CategoryBreakdownChart({ data, currencySymbol }: CategoryBreakdownChartProps) {
  if (data.length === 0) return null;

  const seriesNames = new Set(data.map((d) => d.name));
  const valueFormatter = (value: number, name?: string) => {
    const item = data.find((d) => d.name === name);
    if (item) {
      return `${item.percentage.toFixed(1)}% (${currencySymbol}${value.toFixed(2)})`;
    }
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function DonutTooltip(props: any) {
    return (
      <ChartTooltipContent
        label={props.label}
        payload={props.payload}
        active={props.active}
        seriesNames={seriesNames}
        valueFormatter={(v) => {
          const name = props.payload?.[0]?.name;
          return valueFormatter(v, name);
        }}
      />
    );
  }

  return (
    <>
      <Title order={4}>Category Breakdown</Title>
      <Paper p="md" withBorder mt="xs">
        <DonutChart
          h={300}
          data={data}
          withLabelsLine
          labelsType="percent"
          tooltipDataSource="segment"
          valueFormatter={(value) => `${currencySymbol}${value.toFixed(2)}`}
          tooltipProps={{ content: DonutTooltip }}
        >
          <Legend
            verticalAlign="bottom"
            height={70}
            formatter={(value: string) => (
              <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: '12px' }}>
                {value}
              </span>
            )}
          />
        </DonutChart>
      </Paper>
    </>
  );
}

interface DashboardFiltersProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  accountOptions: { value: string; label: string }[];
}

function DashboardFilters({
  dateRange,
  onDateRangeChange,
  accountFilter,
  onAccountFilterChange,
  accountOptions,
}: DashboardFiltersProps) {
  return (
    <Group justify="space-between">
      <Title order={3}>Dashboard</Title>
      <Group gap="sm">
        <Select
          value={dateRange}
          onChange={(v) => onDateRangeChange(v ?? 'all')}
          data={[
            { value: 'all', label: 'All Time' },
            { value: 'this-month', label: 'This Month' },
            { value: 'last-month', label: 'Last Month' },
            { value: 'this-year', label: 'This Year' },
            { value: 'last-year', label: 'Last Year' },
          ]}
          w={140}
        />
        <Select
          value={accountFilter}
          onChange={(v) => onAccountFilterChange(v ?? 'all')}
          data={accountOptions}
          w={160}
        />
      </Group>
    </Group>
  );
}

export function Dashboard() {
  const { transactions, accounts, categories } = useFinance();
  const { format, currencySymbol } = useCurrency();

  const [dateRange, setDateRange] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const { startDate, endDate } = useMemo(() => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (dateRange) {
      case 'this-month': {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'last-month': {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'this-year': {
        const start = new Date(currentYear, 0, 1);
        const end = new Date(currentYear, 11, 31);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      case 'last-year': {
        const start = new Date(currentYear - 1, 0, 1);
        const end = new Date(currentYear - 1, 11, 31);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (accountFilter !== 'all') {
      filtered = filtered.filter((t) => t.accountId === accountFilter);
    }
    return filtered;
  }, [transactions, accountFilter]);

  const summary = useTransactionSummary(filteredTransactions, categories, startDate, endDate);
  const monthlyPivot = useMonthlyPivotTable(filteredTransactions, categories);
  const yearlyCategorySpending = useYearlyCategorySpending(
    filteredTransactions,
    categories,
    startDate,
    endDate
  );

  const topCategories = useMemo(() => yearlyCategorySpending.slice(0, 8), [yearlyCategorySpending]);

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    topCategories.forEach((cat, index) => {
      map.set(cat.category, getCategoryColor(index));
    });
    return map;
  }, [topCategories]);

  const allYears = useMemo(() => {
    const years = new Set<string>();
    topCategories.forEach((cat) => {
      cat.years.forEach((y) => years.add(y.year));
    });
    return Array.from(years).sort();
  }, [topCategories]);

  const yearlyCategoryChartData = useMemo(() => {
    if (allYears.length === 0 || topCategories.length === 0) return [];

    return allYears.map((year) => {
      const row: { year: string; [category: string]: string | number } = { year };
      topCategories.forEach((cat) => {
        const yearData = cat.years.find((y) => y.year === year);
        row[cat.category] = yearData ? yearData.amount / 100 : 0;
      });
      return row;
    });
  }, [allYears, topCategories]);

  const yearlyCategorySeries = useMemo(
    () =>
      topCategories.map((cat) => ({
        name: cat.category,
        color: categoryColorMap.get(cat.category) ?? 'brand.6',
      })),
    [topCategories, categoryColorMap]
  );

  const chartMonthlyExpenses = useMemo(
    () =>
      monthlyPivot.map((m) => ({
        month: m.month,
        Fixed: Math.abs(m.typeTotals.find((t) => t.type === 'Fixed')?.total ?? 0) / 100,
        Cyclical: Math.abs(m.typeTotals.find((t) => t.type === 'Cyclical')?.total ?? 0) / 100,
        Irregular: Math.abs(m.typeTotals.find((t) => t.type === 'Irregular')?.total ?? 0) / 100,
      })),
    [monthlyPivot]
  );

  const totalExpenses = useMemo(
    () => topCategories.reduce((sum, cat) => sum + cat.total, 0),
    [topCategories]
  );

  const donutData = useMemo(
    () =>
      topCategories.map((cat) => ({
        name: cat.category,
        value: cat.total / 100,
        color: categoryColorMap.get(cat.category) ?? 'brand.6',
        percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
      })),
    [topCategories, categoryColorMap, totalExpenses]
  );

  const accountOptions = useMemo(
    () => [
      { value: 'all', label: 'All Accounts' },
      ...accounts.map((a) => ({ value: a.id, label: a.name })),
    ],
    [accounts]
  );

  return (
    <Stack gap="md">
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        accountOptions={accountOptions}
      />

      <SummaryCards
        totalIncome={summary.totalIncome}
        totalExpenses={summary.totalExpenses}
        net={summary.net}
        transactionCount={summary.transactionCount}
        format={format}
      />

      <MonthlyExpensesChart data={chartMonthlyExpenses} currencySymbol={currencySymbol} />

      <Grid mt="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <SpendingByCategoryChart
            data={yearlyCategoryChartData}
            series={yearlyCategorySeries}
            currencySymbol={currencySymbol}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CategoryBreakdownChart data={donutData} currencySymbol={currencySymbol} />
        </Grid.Col>
      </Grid>

      {transactions.length === 0 && (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="sm" py="xl">
            <IconChartBarOff size={48} stroke={1} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No transactions yet. Import some transactions to see your financial overview.
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
