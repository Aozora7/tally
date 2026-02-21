import { Stack, Title, Table, Text, Paper, Group, Badge } from '@mantine/core';
import { useFinance } from '@/context/FinanceContext';
import {
  useYearlyPivotTable,
  useMonthlyPivotTable,
  type YearlyPivotRow,
  type MonthlyPivotRow,
} from '@/utils/analytics/yearlyPivotTable';
import { centsToDisplay } from '@/utils/currency';
import type { TransactionCategory } from '@/types';

interface YearlyTableProps {
  data: YearlyPivotRow[];
  sortedCategories: TransactionCategory[];
}

function YearlyTableRow({ row, categoryIds }: { row: YearlyPivotRow; categoryIds: string[] }) {
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
        {row.year}
      </Table.Td>
      {categoryIds.map((catId) => {
        const cat = row.categories.find((c: { categoryId: string }) => c.categoryId === catId);
        return (
          <Table.Td key={catId}>
            <Text c={cat && cat.total >= 0 ? 'income.6' : 'expense.6'}>
              {cat ? centsToDisplay(cat.total) : '$0.00'}
            </Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Badge
          color={row.savingsRate >= 50 ? 'brand' : row.savingsRate >= 0 ? 'warning' : 'danger'}
        >
          {row.savingsRate.toFixed(1)}%
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text c="expense.6">{centsToDisplay(Math.round(row.monthlyAvgExpenses))}</Text>
      </Table.Td>
    </Table.Tr>
  );
}

function YearlyTable({ data, sortedCategories }: YearlyTableProps) {
  const categoryIds = sortedCategories.map((c) => c.id);

  return (
    <>
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
              <YearlyTableRow key={row.year} row={row} categoryIds={categoryIds} />
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
}

function MonthlyTableRow({ row, categoryIds }: { row: MonthlyPivotRow; categoryIds: string[] }) {
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
        {row.month}
      </Table.Td>
      {categoryIds.map((catId) => {
        const cat = row.categories.find((c: { categoryId: string }) => c.categoryId === catId);
        return (
          <Table.Td key={catId}>
            <Text c={cat && cat.total >= 0 ? 'income.6' : 'expense.6'}>
              {cat ? centsToDisplay(cat.total) : '$0.00'}
            </Text>
          </Table.Td>
        );
      })}
      <Table.Td>
        <Text c="expense.6" fw={600}>
          {centsToDisplay(row.totalExpenses)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function MonthlyTable({ data, sortedCategories }: MonthlyTableProps) {
  const categoryIds = sortedCategories.map((c) => c.id);

  return (
    <Paper withBorder style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover>
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
            <MonthlyTableRow key={row.month} row={row} categoryIds={categoryIds} />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Paper p="md" withBorder>
      <Text c="dimmed" ta="center">
        {message}
      </Text>
    </Paper>
  );
}

export function PivotTable() {
  const { transactions, categories } = useFinance();
  const yearlyData = useYearlyPivotTable(transactions, categories);
  const monthlyData = useMonthlyPivotTable(transactions, categories);

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Title order={3}>Yearly Pivot Table</Title>
        {yearlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the yearly summary." />
        ) : (
          <YearlyTable data={yearlyData} sortedCategories={sortedCategories} />
        )}
      </Stack>

      <Stack gap="md">
        <Title order={3}>Monthly Pivot Table</Title>
        {monthlyData.length === 0 ? (
          <EmptyState message="No data available. Add transactions to see the monthly summary." />
        ) : (
          <MonthlyTable data={monthlyData} sortedCategories={sortedCategories} />
        )}
      </Stack>
    </Stack>
  );
}
