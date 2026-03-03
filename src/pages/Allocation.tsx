import { useState, useMemo, useCallback } from 'react';
import { Stack, Title, Paper, Text, TextInput, Button, Group, ActionIcon, Table, Alert, NumberInput } from '@mantine/core';
import { IconPlus, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { useSecurities } from '@/context/SecuritiesContext';
import { usePortfolioCheckpoints } from '@/utils/usePortfolioCheckpoints';
import { useCurrency } from '@/utils/currency';
import { useApp } from '@/context/AppContext';
import {
  solveAllocations,
  recommendRebalance,
  type AllocationResult,
  type RebalanceRecommendation,
} from '@/utils/allocationSolver';

const SETTINGS_KEY = 'allocationRules';

function loadRules(settings: Map<string, string>): string[] {
  const raw = settings.get(SETTINGS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    // ignore
  }
  return [];
}

const formatPct = (pct: number) => `${(pct * 100).toFixed(2)}%`;
const formatDeviation = (pct: number) => {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${(pct * 100).toFixed(2)}%`;
};

// ── Sub-components ───────────────────────────────────────────────────────────

interface RulesEditorProps {
  rules: string[];
  solverResult: AllocationResult | null;
  onAddRule: () => void;
  onChangeRule: (index: number, value: string) => void;
  onRemoveRule: (index: number) => void;
}

function RulesEditor({ rules, solverResult, onAddRule, onChangeRule, onRemoveRule }: RulesEditorProps) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            Allocation Rules
          </Text>
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAddRule}>
            Add Rule
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Define target allocations using equations. Use ticker symbols and &quot;Total&quot;. Example: Total * 0.60 = AAPL
        </Text>

        {rules.map((rule, idx) => (
          <Group key={idx} gap="xs">
            <TextInput
              value={rule}
              onChange={(e) => onChangeRule(idx, e.currentTarget.value)}
              placeholder="e.g. Total * 0.60 = AAPL"
              style={{ flex: 1 }}
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
            <ActionIcon variant="subtle" color="red" onClick={() => onRemoveRule(idx)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}

        {rules.length === 0 && (
          <Text size="sm" c="dimmed" fs="italic">
            No rules defined. Click &quot;Add Rule&quot; to get started.
          </Text>
        )}

        {solverResult && solverResult.errors.length > 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Solver Errors">
            {solverResult.errors.map((err, i) => (
              <Text key={i} size="sm">
                {err}
              </Text>
            ))}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

// ── Allocation row ───────────────────────────────────────────────────────────

interface AllocationRow {
  ticker: string;
  currentValue: number;
  currentPct: number;
  targetPct: number;
  deviation: number;
  targetValue: number;
  deviationValue: number;
}

function AllocationTableRow({
  row,
  format,
  privacyMode,
}: {
  row: AllocationRow;
  format: (cents: number) => string;
  privacyMode: boolean;
}) {
  const deviationColor = privacyMode || Math.abs(row.deviation) < 0.005 ? 'inherit' : 'warning.6';
  const devValueColor =
    privacyMode || Math.abs(row.deviationValue) < 100 ? 'inherit' : row.deviationValue > 0 ? 'income.6' : 'expense.6';

  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={500} ff="monospace">
          {row.ticker}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{privacyMode ? 'XXXX' : format(row.currentValue)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{privacyMode ? 'XXXX' : formatPct(row.currentPct)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{formatPct(row.targetPct)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace" c={deviationColor}>
          {privacyMode ? 'XXXX' : formatDeviation(row.deviation)}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{privacyMode ? 'XXXX' : format(row.targetValue)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace" c={devValueColor}>
          {privacyMode ? 'XXXX' : format(row.deviationValue)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

// ── Allocation table ─────────────────────────────────────────────────────────
/* eslint-disable react/jsx-max-depth */
function AllocationTable({
  rows,
  totalValue,
  format,
  privacyMode,
}: {
  rows: AllocationRow[];
  totalValue: number;
  format: (cents: number) => string;
  privacyMode: boolean;
}) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Text fw={600} size="sm">
          Current vs Target Allocation
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ticker</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Current Value</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Current %</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Target %</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Deviation</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Target Value</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Deviation Value</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <AllocationTableRow key={row.ticker} row={row} format={format} privacyMode={privacyMode} />
            ))}
            <Table.Tr style={{ fontWeight: 700 }}>
              <Table.Td>Total</Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={700} ff="monospace">
                  {privacyMode ? 'XXXX' : format(totalValue)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={700} ff="monospace">
                  100.00%
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={700} ff="monospace">
                  100.00%
                </Text>
              </Table.Td>
              <Table.Td />
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={700} ff="monospace">
                  {privacyMode ? 'XXXX' : format(totalValue)}
                </Text>
              </Table.Td>
              <Table.Td />
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}
/* eslint-enable react/jsx-max-depth */

// ── Rebalance result row ─────────────────────────────────────────────────────

function RebalanceResultRow({
  ticker,
  dev,
  target,
  privacyMode,
}: {
  ticker: string;
  dev: number;
  target: number;
  privacyMode: boolean;
}) {
  const resultPct = target + dev;
  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={500} ff="monospace">
          {ticker}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{privacyMode ? 'XXXX' : formatPct(resultPct)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace">{formatPct(target)}</Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text ff="monospace" c={Math.abs(dev) < 0.005 ? 'inherit' : 'warning.6'}>
          {privacyMode ? 'XXXX' : formatDeviation(dev)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

// ── Rebalance calculator ─────────────────────────────────────────────────────

function RebalanceCalculator({
  solverResult,
  recommendation,
  depositDollars,
  depositCents,
  hasCheckpoint,
  format,
  privacyMode,
  onDepositChange,
}: {
  solverResult: AllocationResult;
  recommendation: RebalanceRecommendation | null;
  depositDollars: number | string;
  depositCents: number;
  hasCheckpoint: boolean;
  format: (cents: number) => string;
  privacyMode: boolean;
  onDepositChange: (val: number | string) => void;
}) {
  const sortedDeviations = useMemo(
    () =>
      recommendation ? Array.from(recommendation.resultingDeviations.entries()).sort(([a], [b]) => a.localeCompare(b)) : [],
    [recommendation]
  );

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Text fw={600} size="sm">
          Rebalance Calculator
        </Text>
        <Text size="xs" c="dimmed">
          Enter a deposit (positive) or withdrawal (negative) amount to see which single security to trade.
        </Text>
        <NumberInput
          label="Transaction Amount"
          placeholder="e.g. 1000 or -500"
          value={depositDollars}
          onChange={onDepositChange}
          decimalScale={2}
          thousandSeparator=","
          allowNegative
          w={250}
        />

        {recommendation && (
          <Alert color={recommendation.action === 'Buy' ? 'green' : 'red'} title="Recommendation">
            <Text size="sm" fw={600}>
              {recommendation.action} {format(recommendation.amount)} of {recommendation.ticker}
            </Text>
            <Table mt="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ticker</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Resulting %</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Target %</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Deviation</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedDeviations.map(([ticker, dev]) => (
                  <RebalanceResultRow
                    key={ticker}
                    ticker={ticker}
                    dev={dev}
                    target={solverResult.allocations.get(ticker) ?? 0}
                    privacyMode={privacyMode}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Alert>
        )}

        {depositCents !== 0 && !recommendation && hasCheckpoint && (
          <Text size="sm" c="dimmed" fs="italic">
            No recommendation available. Ensure your allocation rules cover the securities in your portfolio.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function Allocation() {
  const { securities, securityTransactions, securityPriceCache } = useSecurities();
  const { format, privacyMode } = useCurrency();
  const { settings, setSetting } = useApp();

  const [rules, setRules] = useState<string[]>(() => loadRules(settings));
  const [depositDollars, setDepositDollars] = useState<number | string>('');

  const checkpoints = usePortfolioCheckpoints(securities, securityTransactions, securityPriceCache);

  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return checkpoints[checkpoints.length - 1] ?? null;
  }, [checkpoints]);

  const knownTickers = useMemo(() => securities.map((s) => s.ticker), [securities]);

  const solverResult = useMemo(() => {
    const nonEmpty = rules.filter((r) => r.trim() !== '');
    if (nonEmpty.length === 0) return null;
    return solveAllocations(nonEmpty, knownTickers);
  }, [rules, knownTickers]);

  const allocationRows = useMemo(() => {
    if (!latestCheckpoint || !solverResult || solverResult.errors.length > 0) return [];

    const totalValue = latestCheckpoint.totalValue;
    return latestCheckpoint.holdings
      .map((h) => {
        const targetPct = solverResult.allocations.get(h.ticker) ?? 0;
        const currentPct = totalValue > 0 ? h.value / totalValue : 0;
        const deviation = currentPct - targetPct;
        const targetValue = Math.round(targetPct * totalValue);
        const deviationValue = h.value - targetValue;
        return {
          ticker: h.ticker,
          currentValue: h.value,
          currentPct,
          targetPct,
          deviation,
          targetValue,
          deviationValue,
        };
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [latestCheckpoint, solverResult]);

  const depositCents = useMemo(() => {
    const val = typeof depositDollars === 'string' ? parseFloat(depositDollars) : depositDollars;
    if (isNaN(val) || val === 0) return 0;
    return Math.round(val * 100);
  }, [depositDollars]);

  const recommendation: RebalanceRecommendation | null = useMemo(() => {
    if (!latestCheckpoint || !solverResult || solverResult.errors.length > 0 || depositCents === 0) return null;

    const holdings = latestCheckpoint.holdings.map((h) => ({
      ticker: h.ticker,
      value: h.value,
    }));

    return recommendRebalance(holdings, solverResult.allocations, depositCents);
  }, [latestCheckpoint, solverResult, depositCents]);

  const saveRules = useCallback(
    (newRules: string[]) => {
      setRules(newRules);
      setSetting(SETTINGS_KEY, JSON.stringify(newRules));
    },
    [setSetting]
  );

  const handleRuleChange = useCallback(
    (index: number, value: string) => {
      const updated = [...rules];
      updated[index] = value;
      saveRules(updated);
    },
    [rules, saveRules]
  );

  const handleAddRule = useCallback(() => {
    saveRules([...rules, '']);
  }, [rules, saveRules]);

  const handleRemoveRule = useCallback(
    (index: number) => {
      saveRules(rules.filter((_, i) => i !== index));
    },
    [rules, saveRules]
  );

  const showRebalance = solverResult && solverResult.errors.length === 0 && solverResult.allocations.size > 0;

  return (
    <Stack gap="lg">
      <Title order={2}>Target Allocation</Title>

      <RulesEditor
        rules={rules}
        solverResult={solverResult}
        onAddRule={handleAddRule}
        onChangeRule={handleRuleChange}
        onRemoveRule={handleRemoveRule}
      />

      {allocationRows.length > 0 && (
        <AllocationTable
          rows={allocationRows}
          totalValue={latestCheckpoint?.totalValue ?? 0}
          format={format}
          privacyMode={privacyMode}
        />
      )}

      {showRebalance && (
        <RebalanceCalculator
          solverResult={solverResult}
          recommendation={recommendation}
          depositDollars={depositDollars}
          depositCents={depositCents}
          hasCheckpoint={!!latestCheckpoint}
          format={format}
          privacyMode={privacyMode}
          onDepositChange={setDepositDollars}
        />
      )}

      {!latestCheckpoint && (
        <Text size="sm" c="dimmed" fs="italic">
          No portfolio data available. Add securities, trades, and fetch prices first.
        </Text>
      )}
    </Stack>
  );
}
