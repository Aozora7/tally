import { useEffect, useState, useMemo } from 'react';
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
import { IconPencil, IconTrash, IconPlus, IconRobotOff } from '@tabler/icons-react';
import { centsToDisplay, displayToCents } from '@/utils/currency';
import { validateRule } from '@/utils/rulesEngine';
import type { CategorizationRule } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableRuleRowProps {
  rule: CategorizationRule;
  index: number;
  onEdit: (rule: CategorizationRule, index: number) => void;
  onDelete: (id: string) => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
}

function SortableRuleRow({
  rule,
  index,
  onEdit,
  onDelete,
  categories,
  accounts,
}: SortableRuleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const getRuleSummary = (r: CategorizationRule): string => {
    const conditions: string[] = [];
    if (r.matchPattern) conditions.push(`Pattern: ${r.matchPattern}`);
    if (r.matchMinAmount !== undefined || r.matchMaxAmount !== undefined) {
      const min = r.matchMinAmount !== undefined ? centsToDisplay(r.matchMinAmount) : '-∞';
      const max = r.matchMaxAmount !== undefined ? centsToDisplay(r.matchMaxAmount) : '∞';
      conditions.push(`Amount: ${min} to ${max}`);
    }
    if (r.matchMinDate || r.matchMaxDate) {
      const min = r.matchMinDate ?? '-∞';
      const max = r.matchMaxDate ?? '∞';
      conditions.push(`Date: ${min} to ${max}`);
    }
    return conditions.join(' | ') || 'No conditions';
  };

  const getActionSummary = (r: CategorizationRule): { label: string; color: string } => {
    if (r.actionDelete) return { label: 'Delete', color: 'danger' };
    if (r.actionCategoryId) {
      const cat = categories.find((c) => c.id === r.actionCategoryId);
      return { label: `Category: ${cat?.name ?? 'Unknown'}`, color: 'brand' };
    }
    if (r.actionTransferAccountId) {
      const acc = accounts.find((a) => a.id === r.actionTransferAccountId);
      return { label: `Transfer: ${acc?.name ?? 'Unknown'}`, color: 'accent' };
    }
    return { label: 'No action', color: 'gray' };
  };

  const action = getActionSummary(rule);

  return (
    <Table.Tr ref={setNodeRef} style={style} {...attributes}>
      <Table.Td {...listeners}>
        <Text size="sm" fw={500}>
          {rule.name}
        </Text>
      </Table.Td>
      <Table.Td {...listeners}>
        <Text size="sm" c="dimmed">
          {getRuleSummary(rule)}
        </Text>
      </Table.Td>
      <Table.Td {...listeners}>
        <Badge color={action.color}>{action.label}</Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          <ActionIcon
            color="accent"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(rule, index);
            }}
            aria-label="Edit"
          >
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>
          <ActionIcon
            color="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rule.id);
            }}
            aria-label="Delete"
          >
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

interface RuleFormModalProps {
  opened: boolean;
  onClose: () => void;
  editingRule: { rule: CategorizationRule; index: number } | null;
  rules: CategorizationRule[];
  categories: { id: string; name: string }[];
  transferOptions: { value: string; label: string }[];
  onSubmit: (rule: CategorizationRule, index?: number) => void;
}

function RuleFormModal({
  opened,
  onClose,
  editingRule,
  rules,
  categories,
  transferOptions,
  onSubmit,
}: RuleFormModalProps) {
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
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

  useEffect(() => {
    if (opened) {
      if (editingRule) {
        const r = editingRule.rule;
        form.setValues({
          name: r.name,
          matchPattern: r.matchPattern ?? '',
          matchMinAmount: r.matchMinAmount !== undefined ? centsToDisplay(r.matchMinAmount) : '',
          matchMaxAmount: r.matchMaxAmount !== undefined ? centsToDisplay(r.matchMaxAmount) : '',
          matchMinDate: r.matchMinDate ?? '',
          matchMaxDate: r.matchMaxDate ?? '',
          actionCategoryId: r.actionCategoryId ?? '',
          actionTransferAccountId: r.actionTransferAccountId ?? '',
          actionDelete: r.actionDelete ?? false,
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editingRule]);

  const handleSubmit = (values: RuleFormData) => {
    const minAmountCents =
      values.matchMinAmount !== undefined && values.matchMinAmount.toString().trim() !== ''
        ? displayToCents(values.matchMinAmount.toString())
        : undefined;
    const maxAmountCents =
      values.matchMaxAmount !== undefined && values.matchMaxAmount.toString().trim() !== ''
        ? displayToCents(values.matchMaxAmount.toString())
        : undefined;

    const ruleData: CategorizationRule = {
      id: editingRule?.rule.id ?? generateId(),
      name: values.name.trim(),
      sortOrder: editingRule?.rule.sortOrder ?? rules.length,
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
      onSubmit(ruleData, editingRule.index);
    } else {
      onSubmit(ruleData);
    }

    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
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
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{editingRule ? 'Update' : 'Add'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function Rules() {
  const { rules, categories, accounts, addRule, updateRule, deleteRule, reorderRules } =
    useFinance();
  const [modalOpened, setModalOpened] = useState(false);
  const [editingRule, setEditingRule] = useState<{
    rule: CategorizationRule;
    index: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const transferOptions = useMemo(
    () => accounts.filter((a) => !a.isDefault).map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  );

  const openAddModal = () => {
    setEditingRule(null);
    setModalOpened(true);
  };

  const openEditModal = (rule: CategorizationRule, index: number) => {
    setEditingRule({ rule, index });
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingRule(null);
  };

  const handleSubmit = (ruleData: CategorizationRule, index?: number) => {
    if (index !== undefined) {
      updateRule(ruleData, index);
    } else {
      addRule(ruleData);
    }
    closeModal();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      const newRules = arrayMove(rules, oldIndex, newIndex);
      reorderRules(newRules);
    }
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      deleteRule(id);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Rules</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
          Add Rule
        </Button>
      </Group>

      <Paper p="md" withBorder>
        {rules.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <IconRobotOff size={48} stroke={1} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No rules defined. Create rules to automatically categorize transactions.
            </Text>
          </Stack>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Conditions</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th w={100}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rules.map((rule, index) => (
                    <SortableRuleRow
                      key={rule.id}
                      rule={rule}
                      index={index}
                      onEdit={openEditModal}
                      onDelete={handleDeleteRule}
                      categories={categories}
                      accounts={accounts}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </SortableContext>
          </DndContext>
        )}
      </Paper>

      <RuleFormModal
        opened={modalOpened}
        onClose={closeModal}
        editingRule={editingRule}
        rules={rules}
        categories={categories}
        transferOptions={transferOptions}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
