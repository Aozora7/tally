import { useState, useMemo } from 'react';
import { Stack, Group, Paper, Text, Title, Select, Grid, Box } from '@mantine/core';
import { BarChart, DonutChart } from '@mantine/charts';
import { IconArrowUpRight, IconArrowDownRight, IconChartBarOff } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/utils/currency';
import { useTransactionSummary, useCategorySummary } from '@/utils/analytics/transactionAnalytics';
import { useMonthlyPivotTable } from '@/utils/analytics/yearlyPivotTable';
import type { ComponentType } from 'react';

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
}

const monthlyExpensesSeries = [
  { name: 'Fixed', color: 'danger.6' },
  { name: 'Cyclical', color: 'brand.6' },
  { name: 'Irregular', color: 'accent.6' },
];
const monthlyExpensesFormatter = (value: number) => `$${value.toFixed(2)}`;

function MonthlyExpensesChart({ data }: MonthlyExpensesChartProps) {
  if (data.length === 0) return null;

  return (
    <>
      <Title order={4} mt="md">
        Monthly Expenses by Type
      </Title>
      <Paper p="md" withBorder>
        <Box h={300}>
          <BarChart
            h={280}
            data={data}
            dataKey="month"
            series={monthlyExpensesSeries}
            type="stacked"
            tickLine="y"
            gridAxis="xy"
            valueFormatter={monthlyExpensesFormatter}
            tooltipProps={{
              content: barTooltipContent(monthlyExpensesSeries, monthlyExpensesFormatter),
            }}
          />
        </Box>
      </Paper>
    </>
  );
}

interface SpendingByCategoryChartProps {
  data: { category: string; amount: number }[];
}

const categorySpendingSeries = [{ name: 'amount', color: 'brand.6' }];
const categorySpendingFormatter = (value: number) => `$${value.toFixed(2)}`;

function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  if (data.length === 0) return null;

  return (
    <>
      <Title order={4}>Spending by Category</Title>
      <Paper p="md" withBorder mt="xs">
        <BarChart
          h={300}
          data={data}
          dataKey="category"
          series={categorySpendingSeries}
          tickLine="y"
          gridAxis="xy"
          valueFormatter={categorySpendingFormatter}
          tooltipProps={{
            content: barTooltipContent(categorySpendingSeries, categorySpendingFormatter),
          }}
        />
      </Paper>
    </>
  );
}

interface CategoryBreakdownChartProps {
  data: { name: string; value: number; color: string }[];
}

function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  if (data.length === 0) return null;

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
          valueFormatter={(value) => `$${value.toFixed(2)}`}
        />
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
  const { format } = useCurrency();

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
  const categorySummary = useCategorySummary(filteredTransactions, categories, startDate, endDate);

  const expenseByCategory = useMemo(
    () =>
      categorySummary
        .filter((c) => c.categoryType !== 'Income')
        .slice(0, 10)
        .map((c) => ({
          category: c.categoryName,
          amount: c.total / 100,
        })),
    [categorySummary]
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

  const donutData = useMemo(
    () =>
      categorySummary
        .filter((c) => c.categoryType !== 'Income')
        .slice(0, 6)
        .map((c) => ({
          name: c.categoryName,
          value: c.total / 100,
          color:
            c.categoryType === 'Fixed'
              ? 'brand.6'
              : c.categoryType === 'Cyclical'
                ? 'accent.6'
                : 'warning.6',
        })),
    [categorySummary]
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

      <MonthlyExpensesChart data={chartMonthlyExpenses} />

      <Grid mt="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <SpendingByCategoryChart data={expenseByCategory} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CategoryBreakdownChart data={donutData} />
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
