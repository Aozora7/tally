import { useMemo } from 'react';
import { Stack, Group, Paper, Text, Title, Grid, Box } from '@mantine/core';
import { BarChart, DonutChart } from '@mantine/charts';
import {
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { IconArrowUpRight, IconArrowDownRight, IconChartBarOff } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/utils/currency';
import { useTransactionSummary, useYearlyCategorySpending } from '@/utils/analytics/transactionAnalytics';
import { useMonthlyPivotTable } from '@/utils/analytics/yearlyPivotTable';
import { useChartTicks } from '@/utils/useChartTicks';
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
            <Box w={10} h={10} style={{ borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
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
            <Box w={10} h={10} style={{ borderRadius: '50%', backgroundColor: '#9c9c9c', flexShrink: 0 }} />
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

function barTooltipContent(series: { name: string; color: string }[], valueFormatter: (value: number) => string) {
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
        <SummaryCard label="Total Income" value={format(totalIncome)} color="income.6" icon={IconArrowUpRight} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
        <SummaryCard label="Total Expenses" value={format(totalExpenses)} color="expense.6" icon={IconArrowDownRight} />
      </Grid.Col>
    </Grid>
  );
}

interface MonthlyExpensesChartProps {
  data: { month: string; Fixed: number; Cyclical: number; Irregular: number }[];
  currencySymbol: string;
  privacyMode: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const monthlyExpensesSeries = [
  { name: 'Fixed', color: 'danger.6' },
  { name: 'Cyclical', color: 'brand.6' },
  { name: 'Irregular', color: 'accent.6' },
];

// Resolved hex values for theme colors used in the Recharts Bar fill attribute
const MONTHLY_SERIES_FILLS: Record<string, string> = {
  Fixed: '#B33030',
  Cyclical: '#1791E8',
  Irregular: '#2D8E50',
};

function MonthlyExpensesChart({ data, currencySymbol, privacyMode }: MonthlyExpensesChartProps) {
  const valueFormatter = privacyMode
    ? () => `${currencySymbol}XXXX.XX`
    : (value: number) => `${currencySymbol}${value.toFixed(2)}`;

  const { yearGroups, monthTicks, yearTicks } = useChartTicks(data);

  if (data.length === 0) return null;

  return (
    <Stack gap="xs">
      <Title order={4}>Monthly Expenses by Type</Title>
      <Paper p="md" withBorder>
        <Box h={300}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />

              <YearBackgroundBands yearGroups={yearGroups} data={data} />

              <MonthXAxis monthTicks={monthTicks} />
              <YearXAxis yearTicks={yearTicks} />

              <YAxis width={75} tickFormatter={valueFormatter} tick={{ fontSize: 11 }} />

              <Tooltip content={barTooltipContent(monthlyExpensesSeries, valueFormatter)} />

              <ExpenseBars />
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Stack>
  );
}

interface YearBackgroundBandsProps {
  yearGroups: { year: string; startIndex: number; endIndex: number }[];
  data: { month: string }[];
}

function YearBackgroundBands({ yearGroups, data }: YearBackgroundBandsProps) {
  return (
    <>
      {yearGroups.map((group, idx) =>
        idx % 2 === 1 ? (
          <ReferenceArea
            key={group.year}
            xAxisId={0}
            x1={data[group.startIndex]!.month}
            x2={data[group.endIndex]!.month}
            fill="rgba(128,128,128,0.08)"
            stroke="none"
          />
        ) : null
      )}
    </>
  );
}

interface MonthXAxisProps {
  monthTicks: string[];
}

function MonthXAxis({ monthTicks }: MonthXAxisProps) {
  return (
    <XAxis
      xAxisId={0}
      dataKey="month"
      ticks={monthTicks}
      tickFormatter={(v: string) => MONTH_NAMES[parseInt(v.substring(5, 7), 10) - 1] ?? ''}
      angle={-45}
      textAnchor="end"
      height={35}
      interval={0}
      tickLine={false}
      dy={5}
      dx={-10}
      tick={{ fontSize: 12 }}
    />
  );
}

interface YearXAxisProps {
  yearTicks: string[];
}

function YearXAxis({ yearTicks }: YearXAxisProps) {
  return (
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
  );
}

function ExpenseBars() {
  return (
    <>
      <Bar xAxisId={0} dataKey="Fixed" stackId="a" fill={MONTHLY_SERIES_FILLS.Fixed} />
      <Bar xAxisId={0} dataKey="Cyclical" stackId="a" fill={MONTHLY_SERIES_FILLS.Cyclical} />
      <Bar xAxisId={0} dataKey="Irregular" stackId="a" fill={MONTHLY_SERIES_FILLS.Irregular} />
    </>
  );
}

interface SpendingByCategoryChartProps {
  data: { year: string; [category: string]: string | number }[];
  series: { name: string; color: string }[];
  currencySymbol: string;
  privacyMode: boolean;
}

function SpendingByCategoryChart({ data, series, currencySymbol, privacyMode }: SpendingByCategoryChartProps) {
  if (data.length === 0 || series.length === 0) return null;

  const valueFormatter = privacyMode
    ? () => `${currencySymbol}XXXX.XX`
    : (value: number) => `${currencySymbol}${value.toFixed(2)}`;

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
          yAxisProps={{ width: 80, opacity: 0.3, fontSize: 11 }}
          xAxisProps={{ opacity: 0.6, fontSize: 11 }}
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
  privacyMode: boolean;
}

function CategoryBreakdownChart({ data, currencySymbol, privacyMode }: CategoryBreakdownChartProps) {
  if (data.length === 0) return null;

  const seriesNames = new Set(data.map((d) => d.name));
  const valueFormatter = (value: number, name?: string) => {
    if (privacyMode) return `${currencySymbol}XXXX.XX`;
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
          valueFormatter={(value) => (privacyMode ? `${currencySymbol}XXXX.XX` : `${currencySymbol}${value.toFixed(2)}`)}
          tooltipProps={{ content: DonutTooltip }}
        >
          <Legend
            verticalAlign="bottom"
            height={70}
            formatter={(value: string) => (
              <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: '12px' }}>{value}</span>
            )}
          />
        </DonutChart>
      </Paper>
    </>
  );
}

export function Dashboard() {
  const { transactions, categories } = useFinance();
  const { format, currencySymbol, privacyMode } = useCurrency();

  const summary = useTransactionSummary(transactions, categories);
  const monthlyPivot = useMonthlyPivotTable(transactions, categories);
  const yearlyCategorySpending = useYearlyCategorySpending(transactions, categories);

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

  const totalExpenses = useMemo(() => topCategories.reduce((sum, cat) => sum + cat.total, 0), [topCategories]);

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

  return (
    <Stack gap="md">
      <Title order={3}>Dashboard</Title>
      <SummaryCards
        totalIncome={summary.totalIncome}
        totalExpenses={summary.totalExpenses}
        net={summary.net}
        transactionCount={summary.transactionCount}
        format={format}
      />

      <MonthlyExpensesChart data={chartMonthlyExpenses} currencySymbol={currencySymbol} privacyMode={privacyMode} />

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <SpendingByCategoryChart
            data={yearlyCategoryChartData}
            series={yearlyCategorySeries}
            currencySymbol={currencySymbol}
            privacyMode={privacyMode}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CategoryBreakdownChart data={donutData} currencySymbol={currencySymbol} privacyMode={privacyMode} />
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
