import { useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconUpload, IconTrash, IconFolder } from '@tabler/icons-react';
import { exportFullState, downloadJson } from '@/db/export';
import { importFullState, parseImportFile } from '@/db/import';
import { useFinance } from '@/context/FinanceContext';
import type { ExportedState } from '@/db/export';
import { isTauri, readJsonFile, writeJsonFile, openDataDirectory } from '@/utils/tauri';
import { GoogleDriveSettings } from '@/components/GoogleDriveSettings/GoogleDriveSettings';

const APP_VERSION = '1.0.0';

interface ImportModalProps {
  opened: boolean;
  onClose: () => void;
  initialPreview?: ExportedState | null;
}

function ImportModal({ opened, onClose, initialPreview }: ImportModalProps) {
  const { reloadFromDb } = useFinance();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExportedState | null>(initialPreview ?? null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setImportFile(null);
      setImportPreview(null);
      return;
    }
    setImportFile(file);
    try {
      const data = await parseImportFile(file);
      setImportPreview(data);
    } catch (error) {
      notifications.show({
        title: 'Invalid Backup File',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
      setImportFile(null);
    }
  };

  const handleConfirm = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      await importFullState(importPreview);
      await reloadFromDb();
      notifications.show({
        title: 'Import Successful',
        message: `Imported ${importPreview.transactions.length} transactions`,
        color: 'brand',
      });
      handleClose();
    } catch (error) {
      notifications.show({
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportFile(null);
    setImportPreview(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Import Full State" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isTauri()
            ? 'Review the backup data below. This will replace ALL existing data.'
            : 'Select a backup JSON file to restore your data. This will replace ALL existing data.'}
        </Text>

        {!isTauri() && (
          <FileInput
            label="Backup File"
            placeholder="Select JSON file"
            accept=".json"
            value={importFile}
            onChange={handleFileSelect}
          />
        )}

        {importPreview && <ImportPreview preview={importPreview} />}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            color="brand"
            onClick={handleConfirm}
            disabled={!importPreview}
            loading={isImporting}
          >
            Import & Replace
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface ImportPreviewProps {
  preview: ExportedState;
}

function ImportPreview({ preview }: ImportPreviewProps) {
  return (
    <Paper p="sm" withBorder>
      <Title order={5} mb="xs">
        Preview
      </Title>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm">Exported At:</Text>
          <Text size="sm" fw={500}>
            {new Date(preview.exportedAt).toLocaleString()}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Categories:</Text>
          <Text size="sm" fw={500}>
            {preview.categories.length}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Accounts:</Text>
          <Text size="sm" fw={500}>
            {preview.accounts.length}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Transactions:</Text>
          <Text size="sm" fw={500}>
            {preview.transactions.length}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Triage Transactions:</Text>
          <Text size="sm" fw={500}>
            {preview.triageTransactions.length}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Rules:</Text>
          <Text size="sm" fw={500}>
            {preview.rules.length}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}

interface ClearConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  clearFn: () => Promise<void>;
  title: string;
  message: string;
  warning: string;
  warningColor?: 'danger' | 'warning';
  confirmLabel: string;
  confirmColor?: 'danger' | 'warning';
  successTitle: string;
  successMessage: string;
}

function ClearConfirmModal({
  opened,
  onClose,
  clearFn,
  title,
  message,
  warning,
  warningColor = 'danger',
  confirmLabel,
  confirmColor = 'danger',
  successTitle,
  successMessage,
}: ClearConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await clearFn();
      notifications.show({
        title: successTitle,
        message: successMessage,
        color: 'brand',
      });
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm">
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        <Text size="sm" c={warningColor} fw={500}>
          {warning}
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button color={confirmColor} onClick={handleConfirm} loading={isLoading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface DataManagementPanelProps {
  onImport: () => void;
  onClearTransactions: () => void;
  onClearTriage: () => void;
  onClearAll: () => void;
}

function DataManagementPanel({
  onImport,
  onClearTransactions,
  onClearTriage,
  onClearAll,
}: DataManagementPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportFullState();
      const filename = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (isTauri()) {
        const savedPath = await writeJsonFile(data, {
          title: 'Export Backup',
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (savedPath) {
          notifications.show({
            title: 'Export Successful',
            message: `Exported ${data.transactions.length} transactions to ${savedPath}`,
            color: 'brand',
          });
        }
      } else {
        downloadJson(data, filename);
        notifications.show({
          title: 'Export Successful',
          message: `Exported ${data.transactions.length} transactions to ${filename}`,
          color: 'brand',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="xs">
        Data Management
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Export, import, or clear all your financial data.
      </Text>

      <Group gap="sm">
        <Button
          leftSection={<IconUpload size={16} />}
          variant="filled"
          onClick={handleExport}
          loading={isExporting}
        >
          Export Full State
        </Button>
        <Button leftSection={<IconDownload size={16} />} variant="light" onClick={onImport}>
          Import Full State
        </Button>
        <Button
          leftSection={<IconTrash size={16} />}
          variant="light"
          color="danger"
          onClick={onClearTransactions}
        >
          Clear Transactions
        </Button>
        <Button
          leftSection={<IconTrash size={16} />}
          variant="light"
          color="warning"
          onClick={onClearTriage}
        >
          Clear Triage
        </Button>
        <Button
          leftSection={<IconTrash size={16} />}
          variant="light"
          color="danger"
          onClick={onClearAll}
        >
          Clear All Data
        </Button>
      </Group>
    </Paper>
  );
}

function StoragePanel() {
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="xs">
        Storage
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Open the folder where your data is stored.
      </Text>
      <Button
        leftSection={<IconFolder size={16} />}
        variant="light"
        onClick={() => openDataDirectory()}
      >
        Open Data Directory
      </Button>
    </Paper>
  );
}

function DisplaySettingsPanel() {
  const { settings, setSetting } = useFinance();
  const [currencySymbol, setCurrencySymbol] = useState(settings.get('currency') || '$');
  const [privacyMode, setPrivacyMode] = useState(settings.get('privacyMode') === 'true');

  const handleCurrencyChange = (value: string) => {
    setSetting('currency', value);
    setCurrencySymbol(value);
    notifications.show({
      title: 'Currency Updated',
      message: `Currency symbol set to "${value}"`,
      color: 'brand',
    });
  };

  const handlePrivacyModeChange = (checked: boolean) => {
    setSetting('privacyMode', checked ? 'true' : 'false');
    setPrivacyMode(checked);
  };

  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="xs">
        Display Settings
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Configure how currency values are displayed.
      </Text>
      <Group>
        <Switch
          label="Privacy Mode"
          description="Hide currency amounts and securities units"
          checked={privacyMode}
          onChange={(e) => handlePrivacyModeChange(e.currentTarget.checked)}
          mt="sm"
        />
      </Group>
      <Group>
        <TextInput
          label="Currency"
          placeholder="$"
          value={currencySymbol}
          onChange={(e) => handleCurrencyChange(e.currentTarget.value)}
          w={100}
        />
      </Group>
    </Paper>
  );
}

function AboutPanel() {
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="xs">
        About
      </Title>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Version
        </Text>
        <Text size="sm" fw={500}>
          {APP_VERSION}
        </Text>
      </Group>
    </Paper>
  );
}

export function Settings() {
  const { clearAllData, clearTransactions, clearTriageTransactions } = useFinance();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearTransactionsModalOpen, setClearTransactionsModalOpen] = useState(false);
  const [clearTriageModalOpen, setClearTriageModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportedState | null>(null);

  const handleOpenImport = async () => {
    if (isTauri()) {
      try {
        const result = await readJsonFile<ExportedState>({
          title: 'Import Backup',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (result) {
          setImportPreview(result.data);
          setImportModalOpen(true);
        }
      } catch (error) {
        notifications.show({
          title: 'Invalid Backup File',
          message: error instanceof Error ? error.message : 'Unknown error',
          color: 'danger',
        });
      }
    } else {
      setImportModalOpen(true);
    }
  };

  return (
    <Stack gap="md">
      <Title order={3}>Settings</Title>

      <DataManagementPanel
        onImport={handleOpenImport}
        onClearTransactions={() => setClearTransactionsModalOpen(true)}
        onClearTriage={() => setClearTriageModalOpen(true)}
        onClearAll={() => setClearModalOpen(true)}
      />

      {isTauri() && <StoragePanel />}

      <GoogleDriveSettings />

      <DisplaySettingsPanel />

      <AboutPanel />

      <ImportModal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportPreview(null);
        }}
        initialPreview={importPreview}
      />

      <ClearConfirmModal
        opened={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        clearFn={clearAllData}
        title="Clear All Data"
        message="Are you sure you want to delete ALL data? This action cannot be undone."
        warning="This will permanently delete all categories, accounts, transactions, triage transactions, and rules."
        confirmLabel="Delete All Data"
        successTitle="Data Cleared"
        successMessage="All data has been deleted"
      />

      <ClearConfirmModal
        opened={clearTransactionsModalOpen}
        onClose={() => setClearTransactionsModalOpen(false)}
        clearFn={clearTransactions}
        title="Clear Transactions"
        message="Are you sure you want to delete all transactions? This action cannot be undone."
        warning="This will permanently delete all transactions. Categories, accounts, and rules will be preserved."
        confirmLabel="Delete Transactions"
        successTitle="Transactions Cleared"
        successMessage="All transactions have been deleted"
      />

      <ClearConfirmModal
        opened={clearTriageModalOpen}
        onClose={() => setClearTriageModalOpen(false)}
        clearFn={clearTriageTransactions}
        title="Clear Triage"
        message="Are you sure you want to delete all triage transactions? This action cannot be undone."
        warning="This will permanently delete all triage transactions. All other data will be preserved."
        warningColor="warning"
        confirmLabel="Delete Triage"
        confirmColor="warning"
        successTitle="Triage Cleared"
        successMessage="All triage transactions have been deleted"
      />
    </Stack>
  );
}
