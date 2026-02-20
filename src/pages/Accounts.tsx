import { useState, useMemo } from 'react';
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import type { Account } from '@/types';

interface AccountFormData {
  name: string;
  isDefault: boolean;
}

export function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useFinance();
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const defaultAccount = useMemo(() => accounts.find((a) => a.isDefault), [accounts]);

  const form = useForm<AccountFormData>({
    initialValues: {
      name: '',
      isDefault: false,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  const openCreateModal = () => {
    setEditingAccount(null);
    form.reset();
    setModalOpened(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    form.setValues({
      name: account.name,
      isDefault: account.isDefault,
    });
    setModalOpened(true);
  };

  const openDeleteModal = (account: Account) => {
    const hasTransactions = transactions.some(
      (t) => t.accountId === account.id || t.transferAccountId === account.id
    );
    if (hasTransactions) {
      setDeleteError('Cannot delete account with associated transactions.');
    } else {
      setDeleteError(null);
    }
    setDeletingAccount(account);
    setDeleteOpened(true);
  };

  const handleSubmit = (values: AccountFormData) => {
    if (editingAccount) {
      if (values.isDefault && !editingAccount.isDefault && defaultAccount) {
        updateAccount({ ...defaultAccount, isDefault: false });
      }
      updateAccount({
        ...editingAccount,
        name: values.name.trim(),
        isDefault: values.isDefault,
      });
    } else {
      if (values.isDefault && defaultAccount) {
        updateAccount({ ...defaultAccount, isDefault: false });
      }
      addAccount({
        id: generateId(),
        name: values.name.trim(),
        isDefault: values.isDefault,
      });
    }
    setModalOpened(false);
    form.reset();
  };

  const handleDelete = () => {
    if (deletingAccount && !deleteError) {
      deleteAccount(deletingAccount.id);
      setDeleteOpened(false);
      setDeletingAccount(null);
    }
  };

  const rows = accounts.map((account) => (
    <Table.Tr key={account.id}>
      <Table.Td>{account.name}</Table.Td>
      <Table.Td>
        {account.isDefault ? (
          <Text c="brand.6" fw={500}>
            Default
          </Text>
        ) : (
          <Text c="dimmed">—</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button size="xs" variant="light" onClick={() => openEditModal(account)}>
            Edit
          </Button>
          <Button size="xs" variant="light" color="danger" onClick={() => openDeleteModal(account)}>
            Delete
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Accounts</Title>
        <Button onClick={openCreateModal}>Add Account</Button>
      </Group>

      {accounts.length === 0 ? (
        <Text c="dimmed">No accounts yet. Click &quot;Add Account&quot; to create one.</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Default</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter account name"
              {...form.getInputProps('name')}
            />
            <Checkbox
              label="Set as default account"
              description="The default account is used for CSV imports"
              {...form.getInputProps('isDefault', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingAccount ? 'Save' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Delete Account">
        <Stack gap="md">
          {deleteError ? (
            <Text c="danger.6">{deleteError}</Text>
          ) : (
            <Text>
              Are you sure you want to delete &quot;{deletingAccount?.name}&quot;? This action
              cannot be undone.
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteOpened(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={handleDelete} disabled={!!deleteError}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
