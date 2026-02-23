import { useState } from 'react';
import { Stack, Title, Table, Text, Paper, Group, Badge, SegmentedControl } from '@mantine/core';
import { IconTableOff } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import {
  useYearlyPivotTable,
  useMonthlyPivotTable,
  type YearlyPivotRow,
  type MonthlyPivotRow,
} from '@/utils/analytics/yearlyPivotTable';
import { useCurrency } from '@/utils/currency';
import type { CategoryType } from '@/types';
import type { MantineSize } from '@mantine/core';

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Fixed', 'Cyclical', 'Irregular'];

interface YearlyTableProps {
  data: YearlyPivotRow[];
  fontSize: MantineSize;
  format: (cents: number) => string;
}

function YearlyTableRow({
  row,
  fontSize,
  format,
}: {
  row: YearlyPivotRow;
  fontSize: MantineSize;
  format: (cents: number) => string;
}) {
  return (
    <Table.Tr key={row.year}>
      <Table.Td
        style={{
          position: 'sticky',
          left: 0,
          background: 'var(--mantine-color-body)',
          fontWeight: 600,
        }}
      >
        <Text size={fontSize} fw={600}>
          {row.year}
        </Text>
      </Table.Td>
      {row.typeTotals.map(({ type, total }) => {
        const color = total === 0 ? 'dimmed' : total > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={type}>
            <Text size={fontSize} c={color}>
              {format(total)}
            </Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Badge
          size={fontSize === 'xs' ? 'xs' : 'sm'}
          color={row.savingsRate >= 50 ? 'brand' : row.savingsRate >= 0 ? 'warning' : 'danger'}
        >
          {row.savingsRate.toFixed(1)}%
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size={fontSize} c="expense.6">
          {format(Math.round(row.monthlyAvgExpenses))}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function YearlyTable({ data, fontSize, format }: YearlyTableProps) {
  return (
    <>
      <Paper withBorder style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover fz={fontSize}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'var(--mantine-color-body)',
                }}
              >
                Year
              </Table.Th>
              {CATEGORY_TYPES.map((type) => (
                <Table.Th key={type}>{type}</Table.Th>
              ))}
              <Table.Th>SR</Table.Th>
              <Table.Th>Expenses/m</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) => (
              <YearlyTableRow key={row.year} row={row} fontSize={fontSize} format={format} />
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <Group gap="xl">
        <Text size="sm" c="dimmed">
          SR = Savings Rate = (Income - Expenses) / Income
        </Text>
        <Text size="sm" c="dimmed">
          Expenses/m = Average monthly expenses (based on months with transactions)
        </Text>
      </Group>
    </>
  );
}

interface MonthlyTableProps {
  data: MonthlyPivotRow[];
  fontSize: MantineSize;
  format: (cents: number) => string;
}

function MonthlyTableRow({
  row,
  fontSize,
  format,
}: {
  row: MonthlyPivotRow;
  fontSize: MantineSize;
  format: (cents: number) => string;
}) {
  return (
    <Table.Tr key={row.month}>
      <Table.Td
        style={{
          position: 'sticky',
          left: 0,
          background: 'var(--mantine-color-body)',
          fontWeight: 600,
        }}
      >
        <Text size={fontSize} fw={600}>
          {row.month}
        </Text>
      </Table.Td>
      {row.typeTotals.map(({ type, total }) => {
        const color = total === 0 ? 'dimmed' : total > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={type}>
            <Text size={fontSize} c={color}>
              {format(total)}
            </Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Text size={fontSize} c="expense.6" fw={600}>
          {format(row.totalExpenses)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function MonthlyTable({ data, fontSize, format }: MonthlyTableProps) {
  return (
    <Paper withBorder style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover fz={fontSize}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th
              style={{ position: 'sticky', left: 0, background: 'var(--mantine-color-body)' }}
            >
              Month
            </Table.Th>
            {CATEGORY_TYPES.map((type) => (
              <Table.Th key={type}>{type}</Table.Th>
            ))}
            <Table.Th>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row) => (
            <MonthlyTableRow key={row.month} row={row} fontSize={fontSize} format={format} />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Paper p="md" withBorder>
      <Stack align="center" gap="sm" py="xl">
        <IconTableOff size={48} stroke={1} color="var(--mantine-color-dimmed)" />
        <Text c="dimmed" ta="center">
          {message}
        </Text>
      </Stack>
    </Paper>
  );
}

export function PivotTable() {
  const { transactions, categories } = useFinance();
  const { format } = useCurrency();
  const yearlyData = useYearlyPivotTable(transactions, categories);
  const monthlyData = useMonthlyPivotTable(transactions, categories);
  const [fontSize, setFontSize] = useState<MantineSize>('sm');

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={3}>Pivot Tables</Title>
        <SegmentedControl
          size="xs"
          value={fontSize}
          onChange={(v) => setFontSize(v as MantineSize)}
          data={[
            { label: 'XS', value: 'xs' },
            { label: 'SM', value: 'sm' },
            { label: 'MD', value: 'md' },
          ]}
        />
      </Group>

      <Stack gap="md">
        <Title order={4}>Yearly</Title>
        {yearlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the yearly summary." />
        ) : (
          <YearlyTable data={yearlyData} fontSize={fontSize} format={format} />
        )}
      </Stack>

      <Stack gap="md">
        <Title order={4}>Monthly</Title>
        {monthlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the monthly summary." />
        ) : (
          <MonthlyTable data={monthlyData} fontSize={fontSize} format={format} />
        )}
      </Stack>
    </Stack>
  );
}
