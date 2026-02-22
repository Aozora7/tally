import { useState, useMemo } from 'react';
import { Stack, Group, Paper, Text, Title, Select, Grid, Box } from '@mantine/core';
import { BarChart, LineChart, DonutChart } from '@mantine/charts';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconScale,
  IconReceipt,
  IconChartBarOff,
} from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { centsToDisplay } from '@/utils/currency';
import {
  useTransactionSummary,
  useMonthlyTrend,
  useCategorySummary,
  useAccountBalances,
} from '@/utils/analytics/transactionAnalytics';
import type { ComponentType } from 'react';

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
}

function SummaryCards({ totalIncome, totalExpenses, net, transactionCount }: SummaryCardsProps) {
  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Total Income"
          value={centsToDisplay(totalIncome)}
          color="income.6"
          icon={IconArrowUpRight}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Total Expenses"
          value={centsToDisplay(totalExpenses)}
          color="expense.6"
          icon={IconArrowDownRight}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Net"
          value={centsToDisplay(net)}
          color={net >= 0 ? 'income.6' : 'expense.6'}
          icon={IconScale}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard
          label="Transactions"
          value={transactionCount.toString()}
          color="accent.6"
          icon={IconReceipt}
        />
      </Grid.Col>
    </Grid>
  );
}

interface AccountBalancesListProps {
  balances: {
    accountId: string;
    accountName: string;
    balance: number;
    isDefault: boolean;
  }[];
}

function AccountBalancesList({ balances }: AccountBalancesListProps) {
  return (
    <>
      <Title order={4} mt="md">
        Account Balances
      </Title>
      <Grid>
        {balances.map((acc) => (
          <Grid.Col key={acc.accountId} span={{ base: 12, sm: 6, md: 4 }}>
            <Paper p="sm" withBorder>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  {acc.accountName}
                  {acc.isDefault && ' (Default)'}
                </Text>
                <Text
                  size="sm"
                  fw={600}
                  c={acc.balance >= 0 ? 'income.6' : 'expense.6'}
                  ff="monospace"
                >
                  {centsToDisplay(acc.balance)}
                </Text>
              </Group>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>
    </>
  );
}

interface MonthlyTrendChartProps {
  data: { month: string; income: number; expenses: number }[];
}

function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  if (data.length === 0) return null;

  return (
    <>
      <Title order={4} mt="md">
        Monthly Trend
      </Title>
      <Paper p="md" withBorder>
        <Box h={300}>
          <LineChart
            h={280}
            data={data}
            dataKey="month"
            series={[
              { name: 'income', color: 'income.6' },
              { name: 'expenses', color: 'expense.6' },
            ]}
            curveType="monotone"
            tickLine="y"
            gridAxis="xy"
            valueFormatter={(value) => `$${value.toFixed(2)}`}
          />
        </Box>
      </Paper>
    </>
  );
}

interface SpendingByCategoryChartProps {
  data: { category: string; amount: number }[];
}

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
          series={[{ name: 'amount', color: 'brand.6' }]}
          tickLine="y"
          gridAxis="xy"
          valueFormatter={(value) => `$${value.toFixed(2)}`}
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
  const monthlyTrend = useMonthlyTrend(filteredTransactions, startDate, endDate);
  const categorySummary = useCategorySummary(filteredTransactions, categories, startDate, endDate);
  const accountBalances = useAccountBalances(transactions, accounts);

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

  const chartMonthlyTrend = useMemo(
    () =>
      monthlyTrend.map((m) => ({
        month: m.month,
        income: m.income / 100,
        expenses: m.expenses / 100,
      })),
    [monthlyTrend]
  );

  const donutData = useMemo(
    () =>
      categorySummary
        .filter((c) => c.categoryType !== 'Income')
        .slice(0, 6)
        .map((c) => ({
          name: c.categoryName,
          value: c.total / 100,
          color: c.categoryType === 'Essential' ? 'brand.6' : 'accent.6',
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
      />

      <AccountBalancesList balances={accountBalances} />

      <MonthlyTrendChart data={chartMonthlyTrend} />

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
