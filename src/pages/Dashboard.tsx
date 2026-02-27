import { useMemo } from 'react';
import { Stack, Group, Paper, Text, Title, Grid, Box } from '@mantine/core';
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
  PieChart,
  Pie,
  Sector,
} from 'recharts';
import { IconArrowUpRight, IconArrowDownRight, IconChartBarOff } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/utils/currency';
import { useTransactionSummary, useYearlyCategorySpending } from '@/utils/analytics/transactionAnalytics';
import { useMonthlyPivotTable } from '@/utils/analytics/yearlyPivotTable';
import { useChartTicks } from '@/utils/useChartTicks';
import {
  MONTHS,
  YAXIS_WIDTH,
  XAXIS_MONTH_HEIGHT,
  XAXIS_YEAR_HEIGHT,
  YAXIS_TICK,
  MONTH_TICK,
  YEAR_TICK,
} from '@/utils/chartConstants';
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

function mantineColorToFill(color: string): string {
  return `var(--mantine-color-${color.replace('.', '-')})`;
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
  axisFormatter: (dollars: number) => string;
  tooltipFormatter: (dollars: number) => string;
}

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

function MonthlyExpensesChart({ data, axisFormatter, tooltipFormatter }: MonthlyExpensesChartProps) {
  const { yearGroups, monthTicks, yearTicks } = useChartTicks(data);

  if (data.length === 0) return null;

  return (
    <Stack gap="xs">
      <Title order={4}>Monthly Expenses by Type</Title>
      <Paper p="md" withBorder>
        <Box h={300}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: -5, bottom: -5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />

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
              <XAxis
                xAxisId={0}
                dataKey="month"
                ticks={monthTicks}
                tickFormatter={(v: string) => MONTHS[parseInt(v.substring(5, 7), 10) - 1] ?? ''}
                angle={-45}
                textAnchor="end"
                height={XAXIS_MONTH_HEIGHT}
                interval={0}
                tickLine={false}
                dy={5}
                dx={-10}
                tick={MONTH_TICK}
              />
              <XAxis
                xAxisId={1}
                dataKey="month"
                ticks={yearTicks}
                tickFormatter={(v: string) => v.substring(0, 4)}
                tickLine={false}
                axisLine={false}
                height={XAXIS_YEAR_HEIGHT}
                tick={YEAR_TICK}
                orientation="top"
              />

              <YAxis width={YAXIS_WIDTH} tickFormatter={axisFormatter} tick={YAXIS_TICK} />

              <Tooltip content={barTooltipContent(monthlyExpensesSeries, tooltipFormatter)} />

              <Bar xAxisId={0} dataKey="Fixed" stackId="a" fill={MONTHLY_SERIES_FILLS.Fixed} />
              <Bar xAxisId={0} dataKey="Cyclical" stackId="a" fill={MONTHLY_SERIES_FILLS.Cyclical} />
              <Bar xAxisId={0} dataKey="Irregular" stackId="a" fill={MONTHLY_SERIES_FILLS.Irregular} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Stack>
  );
}

interface SpendingByCategoryChartProps {
  data: { year: string; [category: string]: string | number }[];
  series: { name: string; color: string }[];
  axisFormatter: (dollars: number) => string;
  tooltipFormatter: (dollars: number) => string;
}

function SpendingByCategoryChart({ data, series, axisFormatter, tooltipFormatter }: SpendingByCategoryChartProps) {
  if (data.length === 0 || series.length === 0) return null;

  return (
    <>
      <Title order={4}>Spending by Category per Year</Title>
      <Paper p="md" withBorder mt="xs">
        <Box h={300}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: -5, bottom: -5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="year" tick={MONTH_TICK} tickLine={false} axisLine={false} />
              <YAxis width={YAXIS_WIDTH} tickFormatter={axisFormatter} tick={YAXIS_TICK} />
              <Tooltip content={barTooltipContent(series, tooltipFormatter)} />
              {series.map((s) => (
                <Bar key={s.name} dataKey={s.name} stackId="a" fill={mantineColorToFill(s.color)} />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </>
  );
}

interface CategoryBreakdownChartProps {
  data: { name: string; value: number; color: string; fill: string; percentage: number }[];
  tooltipFormatter: (dollars: number) => string;
  privacyMode: boolean;
}

function CategoryBreakdownChart({ data, tooltipFormatter, privacyMode }: CategoryBreakdownChartProps) {
  if (data.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function PieTooltip(props: any) {
    if (!props.active || !props.payload?.length) return null;
    const item = props.payload[0];
    const name = item.name as string;
    const value = item.value as number;
    const fill = item.payload?.fill as string;
    const entry = data.find((d) => d.name === name);
    const formatted = tooltipFormatter(value);
    const label = privacyMode || !entry ? formatted : `${entry.percentage.toFixed(1)}% (${formatted})`;
    return (
      <Paper px="sm" py="xs" withBorder shadow="md" style={{ pointerEvents: 'none' }}>
        <Group gap="xs" wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: '50%', backgroundColor: fill, flexShrink: 0 }} />
          <Text size="xs" c="dimmed">
            {name}
          </Text>
          <Text size="xs" fw={500} ff="monospace">
            {label}
          </Text>
        </Group>
      </Paper>
    );
  }

  return (
    <>
      <Title order={4}>Category Breakdown</Title>
      <Paper p="md" withBorder mt="xs">
        <Box h={300}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                dataKey="value"
                nameKey="name"
                data={data}
                innerRadius="45%"
                outerRadius="65%"
                paddingAngle={2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => <Sector {...props} stroke="none" />}
              />
              <Tooltip content={PieTooltip} />
              <Legend
                verticalAlign="bottom"
                formatter={(value: string) => (
                  <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: '12px' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </>
  );
}

export function Dashboard() {
  const { transactions, categories } = useFinance();
  const { format, privacyMode, axisFormatter, tooltipFormatter } = useCurrency();

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
      topCategories.map((cat) => {
        const color = categoryColorMap.get(cat.category) ?? 'brand.6';
        return {
          name: cat.category,
          value: cat.total / 100,
          color,
          fill: mantineColorToFill(color),
          percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
        };
      }),
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

      <MonthlyExpensesChart data={chartMonthlyExpenses} axisFormatter={axisFormatter} tooltipFormatter={tooltipFormatter} />

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <SpendingByCategoryChart
            data={yearlyCategoryChartData}
            series={yearlyCategorySeries}
            axisFormatter={axisFormatter}
            tooltipFormatter={tooltipFormatter}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CategoryBreakdownChart data={donutData} tooltipFormatter={tooltipFormatter} privacyMode={privacyMode} />
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
