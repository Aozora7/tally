import { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Checkbox,
  Table,
  Badge,
  Paper,
  ScrollArea,
  Divider,
  Select,
} from '@mantine/core';
import { useFinance } from '@/context/FinanceContext';
import { useCurrency } from '@/utils/currency';
import { generateId } from '@/utils/uuid';
import {
  previewSelectedRules,
  applyPreviewToTransaction,
  isDuplicateTransaction,
  type RulePreview,
} from '@/utils/rulesEngine';
import type { CategorizationRule, Transaction } from '@/types';

interface RulePreviewModalProps {
  opened: boolean;
  onClose: () => void;
  source: 'triage' | 'transaction';
}

interface RuleSelectorProps {
  rules: CategorizationRule[];
  selectedRuleIds: Set<string>;
  onToggle: (ruleId: string) => void;
  onSelectAll: () => void;
}

function RuleSelector({ rules, selectedRuleIds, onToggle, onSelectAll }: RuleSelectorProps) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between">
        <Text fw={500}>Select Rules to Apply</Text>
        <Checkbox
          label="Select All"
          checked={selectedRuleIds.size === rules.length && rules.length > 0}
          indeterminate={selectedRuleIds.size > 0 && selectedRuleIds.size < rules.length}
          onChange={onSelectAll}
        />
      </Group>
      <ScrollArea.Autosize mah={150} mt="sm">
        <Stack gap="xs">
          {rules.length === 0 ? (
            <Text c="dimmed" ta="center">
              No rules defined. Create rules first.
            </Text>
          ) : (
            rules.map((rule) => (
              <Checkbox
                key={rule.id}
                label={rule.name}
                checked={selectedRuleIds.has(rule.id)}
                onChange={() => onToggle(rule.id)}
              />
            ))
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  );
}

interface PreviewTableProps {
  previews: RulePreview[];
  getCategoryName: (id: string | undefined) => string;
  getAccountName: (id: string | undefined) => string;
  renderChangeValue: (change: RulePreview['changes'][number]) => {
    oldDisplay: string;
    newDisplay: string;
  };
  format: (cents: number) => string;
}

function PreviewTable({ previews, renderChangeValue, format }: PreviewTableProps) {
  return (
    <ScrollArea.Autosize mah={300}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Field</Table.Th>
            <Table.Th>Old Value</Table.Th>
            <Table.Th>New Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {previews.map((preview) =>
            preview.changes.map((change, changeIndex) => (
              <PreviewTableRow
                key={`${preview.transactionId}-${changeIndex}`}
                preview={preview}
                change={change}
                changeIndex={changeIndex}
                renderChangeValue={renderChangeValue}
                format={format}
              />
            ))
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

function PreviewTableRow({
  preview,
  change,
  changeIndex,
  renderChangeValue,
  format,
}: {
  preview: RulePreview;
  change: RulePreview['changes'][number];
  changeIndex: number;
  renderChangeValue: (change: RulePreview['changes'][number]) => {
    oldDisplay: string;
    newDisplay: string;
  };
  format: (cents: number) => string;
}) {
  const { oldDisplay, newDisplay } = renderChangeValue(change);
  const fieldLabel =
    change.field === 'clearCategory'
      ? 'Category'
      : change.field === 'clearTransfer'
        ? 'Transfer'
        : change.field === 'categoryId'
          ? 'Category'
          : change.field === 'transferAccountId'
            ? 'Transfer'
            : 'Delete';

  return (
    <Table.Tr>
      <Table.Td>{changeIndex === 0 ? preview.transaction.date : ''}</Table.Td>
      <Table.Td>{changeIndex === 0 ? preview.transaction.description : ''}</Table.Td>
      <Table.Td>
        {changeIndex === 0 ? (
          <Text c={preview.transaction.amount >= 0 ? 'income.6' : 'expense.6'}>
            {format(preview.transaction.amount)}
          </Text>
        ) : (
          ''
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={change.field === 'delete' ? 'danger' : 'accent'} variant="light">
          {fieldLabel}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text c="dimmed">{oldDisplay}</Text>
      </Table.Td>
      <Table.Td>
        <Text fw={500} c="brand">
          {newDisplay}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

export function RulePreviewModal({ opened, onClose, source }: RulePreviewModalProps) {
  const {
    rules,
    categories,
    accounts,
    triageTransactions,
    transactions,
    updateTransaction,
    deleteTransaction,
    deleteTriageTransaction,
    addTransactions,
  } = useFinance();
  const { format } = useCurrency();

  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');

  const defaultAccount = useMemo(() => accounts.find((a) => a.isDefault), [accounts]);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const handleToggleRule = useCallback((ruleId: string) => {
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRuleIds.size === rules.length) {
      setSelectedRuleIds(new Set());
    } else {
      setSelectedRuleIds(new Set(rules.map((r) => r.id)));
    }
  }, [rules, selectedRuleIds.size]);

  const previews = useMemo(() => {
    if (selectedRuleIds.size === 0) return [];
    return previewSelectedRules(
      Array.from(selectedRuleIds),
      rules,
      source === 'triage' ? triageTransactions : [],
      source === 'transaction' ? transactions : []
    );
  }, [selectedRuleIds, rules, triageTransactions, transactions, source]);

  const relevantPreviews = useMemo(() => {
    return previews.filter((p) => p.source === source);
  }, [previews, source]);

  const deleteCount = useMemo(
    () => relevantPreviews.filter((p) => p.willDelete).length,
    [relevantPreviews]
  );

  const updateCount = useMemo(
    () => relevantPreviews.filter((p) => !p.willDelete).length,
    [relevantPreviews]
  );

  const accountId = defaultAccountId || defaultAccount?.id || '';

  const handleApply = useCallback(() => {
    const newTransactions: Transaction[] = [];
    const triageIdsToDelete: string[] = [];

    for (const preview of relevantPreviews) {
      if (preview.willDelete) {
        if (preview.source === 'triage') {
          triageIdsToDelete.push(preview.transactionId);
        } else {
          deleteTransaction(preview.transactionId);
        }
      } else if (preview.source === 'triage') {
        const triageTx = triageTransactions.find((t) => t.id === preview.transactionId);
        if (triageTx && accountId) {
          const newTx: Transaction = {
            id: generateId(),
            date: triageTx.date,
            amount: triageTx.amount,
            description: triageTx.description,
            accountId,
          };

          for (const change of preview.changes) {
            if (change.field === 'categoryId') {
              newTx.categoryId = change.newValue;
            } else if (change.field === 'transferAccountId') {
              newTx.transferAccountId = change.newValue;
            }
          }

          if (!isDuplicateTransaction(newTx, [...transactions, ...newTransactions])) {
            newTransactions.push(newTx);
          }
          triageIdsToDelete.push(preview.transactionId);
        }
      } else if (preview.source === 'transaction') {
        const transaction = transactions.find((t) => t.id === preview.transactionId);
        if (transaction) {
          const updated = applyPreviewToTransaction(preview, transaction);
          updateTransaction(updated);
        }
      }
    }

    if (newTransactions.length > 0) {
      addTransactions(newTransactions);
    }

    for (const id of triageIdsToDelete) {
      deleteTriageTransaction(id);
    }

    setSelectedRuleIds(new Set());
    setDefaultAccountId('');
    onClose();
  }, [
    relevantPreviews,
    deleteTriageTransaction,
    deleteTransaction,
    transactions,
    updateTransaction,
    addTransactions,
    triageTransactions,
    accountId,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    setSelectedRuleIds(new Set());
    setDefaultAccountId('');
    onClose();
  }, [onClose]);

  const getCategoryName = (id: string | undefined): string => {
    if (!id) return '-';
    return categories.find((c) => c.id === id)?.name ?? 'Unknown';
  };

  const getAccountName = (id: string | undefined): string => {
    if (!id) return '-';
    return accounts.find((a) => a.id === id)?.name ?? 'Unknown';
  };

  const renderChangeValue = (
    change: RulePreview['changes'][number]
  ): { oldDisplay: string; newDisplay: string } => {
    if (change.field === 'categoryId') {
      return {
        oldDisplay: getCategoryName(change.oldValue),
        newDisplay: getCategoryName(change.newValue),
      };
    }
    if (change.field === 'transferAccountId') {
      return {
        oldDisplay: getAccountName(change.oldValue),
        newDisplay: getAccountName(change.newValue),
      };
    }
    if (change.field === 'clearCategory') {
      return {
        oldDisplay: getCategoryName(change.oldValue),
        newDisplay: '(cleared)',
      };
    }
    if (change.field === 'clearTransfer') {
      return {
        oldDisplay: getAccountName(change.oldValue),
        newDisplay: '(cleared)',
      };
    }
    return { oldDisplay: '-', newDisplay: '(delete)' };
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Apply Rules" size="xl">
      <Stack gap="md">
        <RuleSelector
          rules={rules}
          selectedRuleIds={selectedRuleIds}
          onToggle={handleToggleRule}
          onSelectAll={handleSelectAll}
        />

        <Divider />

        {selectedRuleIds.size > 0 && (
          <>
            <Group>
              <Badge color="brand" size="lg">
                {updateCount} update{updateCount !== 1 ? 's' : ''}
              </Badge>
              <Badge color="danger" size="lg">
                {deleteCount} deletion{deleteCount !== 1 ? 's' : ''}
              </Badge>
            </Group>

            {relevantPreviews.length === 0 ? (
              <Text c="dimmed" ta="center">
                No transactions match the selected rules.
              </Text>
            ) : (
              <PreviewTable
                previews={relevantPreviews}
                getCategoryName={getCategoryName}
                getAccountName={getAccountName}
                renderChangeValue={renderChangeValue}
                format={format}
              />
            )}

            <Divider />

            {source === 'triage' && relevantPreviews.some((p) => !p.willDelete) && (
              <Select
                label="Account for converted transactions"
                data={accountOptions}
                value={accountId}
                onChange={(value) => setDefaultAccountId(value ?? '')}
                required
              />
            )}

            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button disabled={relevantPreviews.length === 0} onClick={handleApply}>
                Apply {relevantPreviews.length} Change{relevantPreviews.length !== 1 ? 's' : ''}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
