import { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  NumberInput,
  Checkbox,
  Select,
  ActionIcon,
  Title,
  Badge,
  Paper,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import { centsToDisplay, displayToCents } from '@/utils/currency';
import { validateRule } from '@/utils/rulesEngine';
import type { CategorizationRule } from '@/types';

function centsToDecimalString(cents: number): string {
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

interface RuleFormData {
  name: string;
  matchPattern: string;
  matchMinAmount: string;
  matchMaxAmount: string;
  matchMinDate: string;
  matchMaxDate: string;
  actionCategoryId: string;
  actionTransferAccountId: string;
  actionDelete: boolean;
}

export function Rules() {
  const { rules, categories, accounts, addRule, updateRule, deleteRule, reorderRules } =
    useFinance();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingRule, setEditingRule] = useState<{
    rule: CategorizationRule;
    index: number;
  } | null>(null);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const transferOptions = useMemo(
    () => accounts.filter((a) => !a.isDefault).map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const form = useForm<RuleFormData>({
    initialValues: {
      name: '',
      matchPattern: '',
      matchMinAmount: '',
      matchMaxAmount: '',
      matchMinDate: '',
      matchMaxDate: '',
      actionCategoryId: '',
      actionTransferAccountId: '',
      actionDelete: false,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  const openAddModal = () => {
    setEditingRule(null);
    form.reset();
    setModalOpened(true);
  };

  const openEditModal = (rule: CategorizationRule, index: number) => {
    setEditingRule({ rule, index });
    form.setValues({
      name: rule.name,
      matchPattern: rule.matchPattern ?? '',
      matchMinAmount:
        rule.matchMinAmount !== undefined ? centsToDecimalString(rule.matchMinAmount) : '',
      matchMaxAmount:
        rule.matchMaxAmount !== undefined ? centsToDecimalString(rule.matchMaxAmount) : '',
      matchMinDate: rule.matchMinDate ?? '',
      matchMaxDate: rule.matchMaxDate ?? '',
      actionCategoryId: rule.actionCategoryId ?? '',
      actionTransferAccountId: rule.actionTransferAccountId ?? '',
      actionDelete: rule.actionDelete ?? false,
    });
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingRule(null);
    form.reset();
  };

  const handleSubmit = (values: RuleFormData) => {
    const minAmountCents = values.matchMinAmount
      ? displayToCents(values.matchMinAmount)
      : undefined;
    const maxAmountCents = values.matchMaxAmount
      ? displayToCents(values.matchMaxAmount)
      : undefined;

    const ruleData: CategorizationRule = {
      id: editingRule?.rule.id ?? generateId(),
      name: values.name.trim(),
      ...(values.matchPattern.trim() && { matchPattern: values.matchPattern.trim() }),
      ...(minAmountCents !== undefined && { matchMinAmount: minAmountCents }),
      ...(maxAmountCents !== undefined && { matchMaxAmount: maxAmountCents }),
      ...(values.matchMinDate && { matchMinDate: values.matchMinDate }),
      ...(values.matchMaxDate && { matchMaxDate: values.matchMaxDate }),
      ...(values.actionCategoryId && { actionCategoryId: values.actionCategoryId }),
      ...(values.actionTransferAccountId && {
        actionTransferAccountId: values.actionTransferAccountId,
      }),
      ...(values.actionDelete && { actionDelete: true }),
    };

    const validationError = validateRule(ruleData);
    if (validationError) {
      form.setFieldError('name', validationError);
      return;
    }

    if (editingRule) {
      updateRule(ruleData, editingRule.index);
    } else {
      addRule(ruleData);
    }

    closeModal();
  };

  const moveRuleUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const newRules = [...rules];
      const temp = newRules[index - 1];
      if (temp) {
        newRules[index - 1] = newRules[index]!;
        newRules[index] = temp;
      }
      reorderRules(newRules);
    },
    [rules, reorderRules]
  );

  const moveRuleDown = useCallback(
    (index: number) => {
      if (index >= rules.length - 1) return;
      const newRules = [...rules];
      const temp = newRules[index + 1];
      if (temp) {
        newRules[index + 1] = newRules[index]!;
        newRules[index] = temp;
      }
      reorderRules(newRules);
    },
    [rules, reorderRules]
  );

  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      deleteRule(id);
    }
  };

  const getRuleSummary = (rule: CategorizationRule): string => {
    const conditions: string[] = [];
    if (rule.matchPattern) conditions.push(`Pattern: ${rule.matchPattern}`);
    if (rule.matchMinAmount !== undefined || rule.matchMaxAmount !== undefined) {
      const min = rule.matchMinAmount !== undefined ? centsToDisplay(rule.matchMinAmount) : '-∞';
      const max = rule.matchMaxAmount !== undefined ? centsToDisplay(rule.matchMaxAmount) : '∞';
      conditions.push(`Amount: ${min} to ${max}`);
    }
    if (rule.matchMinDate || rule.matchMaxDate) {
      const min = rule.matchMinDate ?? '-∞';
      const max = rule.matchMaxDate ?? '∞';
      conditions.push(`Date: ${min} to ${max}`);
    }
    return conditions.join(' | ') || 'No conditions';
  };

  const getActionSummary = (rule: CategorizationRule): { label: string; color: string } => {
    if (rule.actionDelete) return { label: 'Delete', color: 'danger' };
    if (rule.actionCategoryId) {
      const cat = categories.find((c) => c.id === rule.actionCategoryId);
      return { label: `Category: ${cat?.name ?? 'Unknown'}`, color: 'brand' };
    }
    if (rule.actionTransferAccountId) {
      const acc = accounts.find((a) => a.id === rule.actionTransferAccountId);
      return { label: `Transfer: ${acc?.name ?? 'Unknown'}`, color: 'accent' };
    }
    return { label: 'No action', color: 'gray' };
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Rules</Title>
        <Button onClick={openAddModal}>Add Rule</Button>
      </Group>

      {rules.length === 0 ? (
        <Paper p="md" withBorder>
          <Text c="dimmed" ta="center">
            No rules defined. Create rules to automatically categorize transactions.
          </Text>
        </Paper>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50}>#</Table.Th>
              <Table.Th w={50}>Order</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Conditions</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th w={100}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rules.map((rule, index) => {
              const action = getActionSummary(rule);
              return (
                <Table.Tr key={rule.id}>
                  <Table.Td>
                    <Text fw={600}>{index + 1}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => moveRuleUp(index)}
                        disabled={index === 0}
                      >
                        ▲
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => moveRuleDown(index)}
                        disabled={index === rules.length - 1}
                      >
                        ▼
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{rule.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {getRuleSummary(rule)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={action.color}>{action.label}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="accent"
                        onClick={() => openEditModal(rule, index)}
                      >
                        ✎
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="danger"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        ✕
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingRule ? 'Edit Rule' : 'Add Rule'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Rule Name"
              placeholder="Enter rule name"
              required
              {...form.getInputProps('name')}
            />

            <Text fw={500} mt="sm">
              Conditions (at least one required)
            </Text>

            <TextInput
              label="Match Pattern (Regex)"
              placeholder="e.g., amazon|AMZN"
              description="Regular expression to match against transaction description"
              {...form.getInputProps('matchPattern')}
            />

            <Group grow>
              <NumberInput
                label="Min Amount"
                placeholder="No limit"
                decimalScale={2}
                fixedDecimalScale
                {...form.getInputProps('matchMinAmount')}
              />
              <NumberInput
                label="Max Amount"
                placeholder="No limit"
                decimalScale={2}
                fixedDecimalScale
                {...form.getInputProps('matchMaxAmount')}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Min Date"
                placeholder="YYYY-MM-DD"
                {...form.getInputProps('matchMinDate')}
              />
              <TextInput
                label="Max Date"
                placeholder="YYYY-MM-DD"
                {...form.getInputProps('matchMaxDate')}
              />
            </Group>

            <Text fw={500} mt="sm">
              Action (exactly one required)
            </Text>

            <Select
              label="Assign Category"
              data={[{ value: '', label: 'None' }, ...categoryOptions]}
              {...form.getInputProps('actionCategoryId')}
              onChange={(value) => {
                form.setFieldValue('actionCategoryId', value ?? '');
                if (value) {
                  form.setFieldValue('actionTransferAccountId', '');
                  form.setFieldValue('actionDelete', false);
                }
              }}
            />

            {transferOptions.length > 0 && (
              <Select
                label="Transfer To Account"
                data={[{ value: '', label: 'None' }, ...transferOptions]}
                {...form.getInputProps('actionTransferAccountId')}
                onChange={(value) => {
                  form.setFieldValue('actionTransferAccountId', value ?? '');
                  if (value) {
                    form.setFieldValue('actionCategoryId', '');
                    form.setFieldValue('actionDelete', false);
                  }
                }}
              />
            )}

            <Checkbox
              label="Delete matching transactions"
              {...form.getInputProps('actionDelete', { type: 'checkbox' })}
              onChange={(e) => {
                form.setFieldValue('actionDelete', e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  form.setFieldValue('actionCategoryId', '');
                  form.setFieldValue('actionTransferAccountId', '');
                }
              }}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editingRule ? 'Update' : 'Add'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
