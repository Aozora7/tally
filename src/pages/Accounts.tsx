import { useEffect, useState, useMemo } from 'react';
import { ActionIcon, Button, Checkbox, Group, Modal, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil, IconTrash, IconPlus, IconBuildingBank } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { generateId } from '@/utils/uuid';
import { useCurrency } from '@/utils/currency';
import { useAccountBalances } from '@/utils/analytics/transactionAnalytics';
import type { Account } from '@/types';

interface AccountFormData {
  name: string;
  isDefault: boolean;
}

interface AccountFormModalProps {
  opened: boolean;
  onClose: () => void;
  editingAccount: Account | null;
  onSubmit: (account: Account, isEditing: boolean) => void;
}

function AccountFormModal({ opened, onClose, editingAccount, onSubmit }: AccountFormModalProps) {
  const form = useForm<AccountFormData>({
    initialValues: {
      name: '',
      isDefault: false,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
    },
  });

  useEffect(() => {
    if (opened) {
      if (editingAccount) {
        form.setValues({
          name: editingAccount.name,
          isDefault: editingAccount.isDefault,
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editingAccount]);

  const handleSubmit = (values: AccountFormData) => {
    if (editingAccount) {
      onSubmit(
        {
          ...editingAccount,
          name: values.name.trim(),
          isDefault: values.isDefault,
        },
        true
      );
    } else {
      onSubmit(
        {
          id: generateId(),
          name: values.name.trim(),
          isDefault: values.isDefault,
        },
        false
      );
    }
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={editingAccount ? 'Edit Account' : 'Add Account'}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput label="Name" placeholder="Enter account name" {...form.getInputProps('name')} />
          <Checkbox
            label="Set as default account"
            description="The default account is used for CSV imports"
            {...form.getInputProps('isDefault', { type: 'checkbox' })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{editingAccount ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface DeleteAccountModalProps {
  opened: boolean;
  onClose: () => void;
  deletingAccount: Account | null;
  deleteError: string | null;
  onConfirm: () => void;
}

function DeleteAccountModal({ opened, onClose, deletingAccount, deleteError, onConfirm }: DeleteAccountModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Delete Account">
      <Stack gap="md">
        {deleteError ? (
          <Text c="danger.6">{deleteError}</Text>
        ) : (
          <Text>Are you sure you want to delete &quot;{deletingAccount?.name}&quot;? This action cannot be undone.</Text>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button color="danger" onClick={onConfirm} disabled={!!deleteError}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface AccountsTableProps {
  accounts: Account[];
  balances: Map<string, number>;
  format: (cents: number) => string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

function AccountsTable({ accounts, balances, format, onEdit, onDelete }: AccountsTableProps) {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Balance</Table.Th>
          <Table.Th>Default</Table.Th>
          <Table.Th w={80}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            balance={balances.get(account.id) ?? 0}
            format={format}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

const AccountRow = ({
  account,
  balance,
  format,
  onEdit,
  onDelete,
}: {
  account: Account;
  balance: number;
  format: (cents: number) => string;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
}) => {
  return (
    <Table.Tr key={account.id}>
      <Table.Td>{account.name}</Table.Td>
      <Table.Td>
        <Text fw={500} c={balance >= 0 ? 'income.6' : 'expense.6'} ff="monospace">
          {format(balance)}
        </Text>
      </Table.Td>
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
        <Group gap={4}>
          <ActionIcon color="accent" onClick={() => onEdit(account)} aria-label="Edit">
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>
          <ActionIcon color="danger" onClick={() => onDelete(account)} aria-label="Delete">
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
};

export function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useFinance();
  const { format } = useCurrency();
  const accountBalances = useAccountBalances(transactions, accounts);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const defaultAccount = useMemo(() => accounts.find((a) => a.isDefault), [accounts]);
  const balancesMap = useMemo(() => new Map(accountBalances.map((b) => [b.accountId, b.balance])), [accountBalances]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setModalOpened(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setModalOpened(true);
  };

  const openDeleteModal = (account: Account) => {
    const hasTransactions = transactions.some((t) => t.accountId === account.id || t.transferAccountId === account.id);
    if (hasTransactions) {
      setDeleteError('Cannot delete account with associated transactions.');
    } else {
      setDeleteError(null);
    }
    setDeletingAccount(account);
    setDeleteOpened(true);
  };

  const handleFormSubmit = (account: Account, isEditing: boolean) => {
    if (isEditing) {
      if (account.isDefault && !editingAccount?.isDefault && defaultAccount) {
        updateAccount({ ...defaultAccount, isDefault: false });
      }
      updateAccount(account);
    } else {
      if (account.isDefault && defaultAccount) {
        updateAccount({ ...defaultAccount, isDefault: false });
      }
      addAccount(account);
    }
    setModalOpened(false);
  };

  const handleDelete = () => {
    if (deletingAccount && !deleteError) {
      deleteAccount(deletingAccount.id);
      setDeleteOpened(false);
      setDeletingAccount(null);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Accounts</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Add Account
        </Button>
      </Group>

      <Paper p="md" withBorder>
        {accounts.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <IconBuildingBank size={48} stroke={1} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed">No accounts yet. Click &quot;Add Account&quot; to create one.</Text>
          </Stack>
        ) : (
          <AccountsTable
            accounts={accounts}
            balances={balancesMap}
            format={format}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        )}
      </Paper>

      <AccountFormModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        editingAccount={editingAccount}
        onSubmit={handleFormSubmit}
      />

      <DeleteAccountModal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        deletingAccount={deletingAccount}
        deleteError={deleteError}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
