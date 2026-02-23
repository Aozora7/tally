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
import type { TransactionCategory } from '@/types';
import type { MantineSize } from '@mantine/core';

interface YearlyTableProps {
  data: YearlyPivotRow[];
  sortedCategories: TransactionCategory[];
  fontSize: MantineSize;
  format: (cents: number) => string;
}

function YearlyTableRow({
  row,
  categoryIds,
  fontSize,
  format,
}: {
  row: YearlyPivotRow;
  categoryIds: string[];
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
      {categoryIds.map((catId) => {
        const cat = row.categories.find((c: { categoryId: string }) => c.categoryId === catId);
        const amount = cat?.total ?? 0;
        const color = amount === 0 ? 'dimmed' : amount > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={catId}>
            <Text size={fontSize} c={color}>
              {format(amount)}
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

function YearlyTable({ data, sortedCategories, fontSize, format }: YearlyTableProps) {
  const categoryIds = sortedCategories.map((c) => c.id);

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
              {sortedCategories.map((cat) => (
                <Table.Th key={cat.id}>{cat.name}</Table.Th>
              ))}
              <Table.Th>SR</Table.Th>
              <Table.Th>Expenses/m</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) => (
              <YearlyTableRow
                key={row.year}
                row={row}
                categoryIds={categoryIds}
                fontSize={fontSize}
                format={format}
              />
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
  sortedCategories: TransactionCategory[];
  fontSize: MantineSize;
  format: (cents: number) => string;
}

function MonthlyTableRow({
  row,
  categoryIds,
  fontSize,
  format,
}: {
  row: MonthlyPivotRow;
  categoryIds: string[];
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
      {categoryIds.map((catId) => {
        const cat = row.categories.find((c: { categoryId: string }) => c.categoryId === catId);
        const amount = cat?.total ?? 0;
        const color = amount === 0 ? 'dimmed' : amount > 0 ? 'income.6' : 'expense.6';
        return (
          <Table.Td key={catId}>
            <Text size={fontSize} c={color}>
              {format(amount)}
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

function MonthlyTable({ data, sortedCategories, fontSize, format }: MonthlyTableProps) {
  const categoryIds = sortedCategories.map((c) => c.id);

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
            {sortedCategories.map((cat) => (
              <Table.Th key={cat.id}>{cat.name}</Table.Th>
            ))}
            <Table.Th>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row) => (
            <MonthlyTableRow
              key={row.month}
              row={row}
              categoryIds={categoryIds}
              fontSize={fontSize}
              format={format}
            />
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

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

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
          <YearlyTable
            data={yearlyData}
            sortedCategories={sortedCategories}
            fontSize={fontSize}
            format={format}
          />
        )}
      </Stack>

      <Stack gap="md">
        <Title order={4}>Monthly</Title>
        {monthlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the monthly summary." />
        ) : (
          <MonthlyTable
            data={monthlyData}
            sortedCategories={sortedCategories}
            fontSize={fontSize}
            format={format}
          />
        )}
      </Stack>
    </Stack>
  );
}
