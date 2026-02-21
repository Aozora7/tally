import { useState } from 'react';
import {
  Button,
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
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import type { TransactionCategory, CategoryType, CategoryFrequency } from '@/types';
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

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Essential', 'Discretionary'];
const CATEGORY_FREQUENCIES: CategoryFrequency[] = ['Regular', 'Irregular'];

interface CategoryFormData {
  name: string;
  type: CategoryType;
  frequency: CategoryFrequency;
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
    <Table.Tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Table.Td>{category.name}</Table.Td>
      <Table.Td>{category.type}</Table.Td>
      <Table.Td>{category.frequency}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
          >
            Edit
          </Button>
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
          >
            Delete
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
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

  const form = useForm<CategoryFormData>({
    initialValues: {
      name: '',
      type: 'Essential',
      frequency: 'Regular',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    form.reset();
    setModalOpened(true);
  };

  const openEditModal = (category: TransactionCategory) => {
    setEditingCategory(category);
    form.setValues({
      name: category.name,
      type: category.type,
      frequency: category.frequency,
    });
    setModalOpened(true);
  };

  const openDeleteModal = (category: TransactionCategory) => {
    setDeletingCategory(category);
    setDeleteOpened(true);
  };

  const handleSubmit = (values: CategoryFormData) => {
    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        name: values.name.trim(),
        type: values.type,
        frequency: values.frequency,
      });
    } else {
      addCategory({
        id: generateId(),
        name: values.name.trim(),
        type: values.type,
        frequency: values.frequency,
        sortOrder: categories.length,
      });
    }
    setModalOpened(false);
    form.reset();
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
        <Title order={2}>Categories</Title>
        <Button onClick={openCreateModal}>Add Category</Button>
      </Group>

      {categories.length === 0 ? (
        <Paper p="md" withBorder>
          <Text c="dimmed" ta="center">
            No categories yet. Click &quot;Add Category&quot; to create one.
          </Text>
        </Paper>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Frequency</Table.Th>
                  <Table.Th>Actions</Table.Th>
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
          </SortableContext>
        </DndContext>
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
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
            <Select
              label="Frequency"
              data={CATEGORY_FREQUENCIES}
              {...form.getInputProps('frequency')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingCategory ? 'Save' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Delete Category">
        <Text>Are you sure you want to delete &quot;{deletingCategory?.name}&quot;?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => setDeleteOpened(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
