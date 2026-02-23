import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Paper,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil, IconTrash, IconPlus, IconTags } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import type { TransactionCategory, CategoryType } from '@/types';
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

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Fixed', 'Cyclical', 'Irregular'];

interface CategoryFormData {
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;
}

interface SortableCategoryRowProps {
  category: TransactionCategory;
  onEdit: (category: TransactionCategory) => void;
  onDelete: (category: TransactionCategory) => void;
}

function SortableCategoryRow({ category, onEdit, onDelete }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <Table.Tr ref={setNodeRef} style={style} {...attributes}>
      <Table.Td {...listeners}>{category.name}</Table.Td>
      <Table.Td {...listeners}>{category.type}</Table.Td>
      <Table.Td>
        <Group gap={4}>
          <ActionIcon
            color="accent"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            aria-label="Edit"
          >
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>
          <ActionIcon
            color="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
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

interface CategoryFormModalProps {
  opened: boolean;
  onClose: () => void;
  editingCategory: TransactionCategory | null;
  categoryCount: number;
  onSubmit: (category: TransactionCategory) => void;
}

function CategoryFormModal({
  opened,
  onClose,
  editingCategory,
  categoryCount,
  onSubmit,
}: CategoryFormModalProps) {
  const form = useForm<CategoryFormData>({
    initialValues: {
      name: '',
      type: 'Fixed',
      excludeFromReports: false,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  useEffect(() => {
    if (opened) {
      if (editingCategory) {
        form.setValues({
          name: editingCategory.name,
          type: editingCategory.type,
          excludeFromReports: editingCategory.excludeFromReports,
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editingCategory]);

  const handleSubmit = (values: CategoryFormData) => {
    if (editingCategory) {
      onSubmit({
        ...editingCategory,
        name: values.name.trim(),
        type: values.type,
        excludeFromReports: values.excludeFromReports,
      });
    } else {
      onSubmit({
        id: generateId(),
        name: values.name.trim(),
        type: values.type,
        sortOrder: categoryCount,
        excludeFromReports: values.excludeFromReports,
      });
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editingCategory ? 'Edit Category' : 'Add Category'}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Enter category name"
            {...form.getInputProps('name')}
          />
          <Select label="Type" data={CATEGORY_TYPES} {...form.getInputProps('type')} />
          <Checkbox
            label="Exclude from reports"
            description="Hide transactions in this category from pivot tables and visualizations"
            {...form.getInputProps('excludeFromReports', { type: 'checkbox' })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{editingCategory ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  category: TransactionCategory | null;
  onConfirm: () => void;
}

function DeleteConfirmModal({ opened, onClose, category, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Delete Category">
      <Text>Are you sure you want to delete &quot;{category?.name}&quot;?</Text>
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button color="danger" onClick={onConfirm}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } =
    useFinance();
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TransactionCategory | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setModalOpened(true);
  };

  const openEditModal = (category: TransactionCategory) => {
    setEditingCategory(category);
    setModalOpened(true);
  };

  const openDeleteModal = (category: TransactionCategory) => {
    setDeletingCategory(category);
    setDeleteOpened(true);
  };

  const handleSubmit = (category: TransactionCategory) => {
    if (editingCategory) {
      updateCategory(category);
    } else {
      addCategory(category);
    }
    setModalOpened(false);
  };

  const handleDelete = () => {
    if (deletingCategory) {
      deleteCategory(deletingCategory.id);
      setDeleteOpened(false);
      setDeletingCategory(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      reorderCategories(newCategories);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Categories</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Add Category
        </Button>
      </Group>

      {categories.length === 0 ? (
        <Paper p="md" withBorder>
          <Stack align="center" gap="sm" py="xl">
            <IconTags size={48} stroke={1} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              No categories yet. Click &quot;Add Category&quot; to create one.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <Paper p="md" withBorder>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th w={80}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {categories.map((category) => (
                    <SortableCategoryRow
                      key={category.id}
                      category={category}
                      onEdit={openEditModal}
                      onDelete={openDeleteModal}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </SortableContext>
        </DndContext>
      )}

      <CategoryFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        editingCategory={editingCategory}
        categoryCount={categories.length}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmModal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        category={deletingCategory}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
