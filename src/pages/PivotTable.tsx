import { useState } from 'react';
import { Stack, Title, Table, Text, Paper, UnstyledButton, Group } from '@mantine/core';
import { IconTableOff, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import {
  useYearlyPivotTable,
  useMonthlyPivotTable,
  type YearlyPivotRow,
  type MonthlyPivotRow,
} from '@/utils/analytics/yearlyPivotTable';
import { useCurrency } from '@/utils/currency';
import type { CategoryType } from '@/types';

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Fixed', 'Cyclical', 'Irregular'];

interface SortControlProps {
  order: 'asc' | 'desc';
  onChange: (order: 'asc' | 'desc') => void;
  label: string;
}

function SortControl({ order, onChange, label }: SortControlProps) {
  return (
    <UnstyledButton onClick={() => onChange(order === 'asc' ? 'desc' : 'asc')}>
      <Group gap={4} wrap="nowrap">
        <Text fw={600}>{label}</Text>
        {order === 'asc' ? <IconArrowUp size={14} stroke={1.5} /> : <IconArrowDown size={14} stroke={1.5} />}
      </Group>
    </UnstyledButton>
  );
}

interface YearlyTableProps {
  data: YearlyPivotRow[];
  format: (cents: number) => string;
}

function YearlyTableRow({ row, format }: { row: YearlyPivotRow; format: (cents: number) => string }) {
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
        <Text fw={600}>{row.year}</Text>
      </Table.Td>
      {row.typeTotals.map(({ type, total }) => {
        const color = total === 0 ? 'dimmed' : total > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={type}>
            <Text c={color}>{format(total)}</Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Text c="expense.6">{format(row.totalExpenses)}</Text>
      </Table.Td>

      <Table.Td>
        <Text c="expense.6">{format(Math.round(row.monthlyAvgExpenses))}</Text>
      </Table.Td>
      <Table.Td>
        <Text>{row.savingsRate.toFixed(1)}%</Text>
      </Table.Td>
    </Table.Tr>
  );
}

function YearlyTable({ data, format }: YearlyTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const sortedYearlyData = sortOrder === 'desc' ? [...data].reverse() : data;
  return (
    <Paper withBorder style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th
              style={{
                position: 'sticky',
                left: 0,
                background: 'var(--mantine-color-body)',
              }}
            >
              <SortControl label="Year" order={sortOrder} onChange={setSortOrder} />
            </Table.Th>
            {CATEGORY_TYPES.map((type) => (
              <Table.Th key={type}>{type}</Table.Th>
            ))}
            <Table.Th>Total</Table.Th>
            <Table.Th>Expenses/m</Table.Th>
            <Table.Th>SR</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedYearlyData.map((row) => (
            <YearlyTableRow key={row.year} row={row} format={format} />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

interface MonthlyTableProps {
  data: MonthlyPivotRow[];
  format: (cents: number) => string;
}

function MonthlyTableRow({ row, format }: { row: MonthlyPivotRow; format: (cents: number) => string }) {
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
        <Text fw={600}>{row.month}</Text>
      </Table.Td>
      {row.typeTotals.map(({ type, total }) => {
        const color = total === 0 ? 'dimmed' : total > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={type}>
            <Text c={color}>{format(total)}</Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Text c="expense.6" fw={600}>
          {format(row.totalExpenses)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function MonthlyTable({ data, format }: MonthlyTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const sortedMonthlyData = sortOrder === 'desc' ? [...data].reverse() : data;

  return (
    <Paper withBorder style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ position: 'sticky', left: 0, background: 'var(--mantine-color-body)' }}>
              <SortControl label="Month" order={sortOrder} onChange={setSortOrder} />
            </Table.Th>
            {CATEGORY_TYPES.map((type) => (
              <Table.Th key={type}>{type}</Table.Th>
            ))}
            <Table.Th>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedMonthlyData.map((row) => (
            <MonthlyTableRow key={row.month} row={row} format={format} />
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

  const formatNoCents = (cents: number) => format(cents, true);

  return (
    <Stack gap="md">
      <Title order={3}>Pivot Tables</Title>

      <Stack gap="md">
        <Title order={4}>Yearly</Title>
        {yearlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the yearly summary." />
        ) : (
          <YearlyTable data={yearlyData} format={formatNoCents} />
        )}
      </Stack>

      <Stack gap="md">
        <Title order={4}>Monthly</Title>
        {monthlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the monthly summary." />
        ) : (
          <MonthlyTable data={monthlyData} format={formatNoCents} />
        )}
      </Stack>
    </Stack>
  );
}
