import { useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  Modal,
  Paper,
  Stack,
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
import { GoogleDriveSettings } from '@/components/GoogleDriveSettings';

const APP_VERSION = '1.0.0';

export function Settings() {
  const {
    reloadFromDb,
    clearAllData,
    clearTransactions,
    clearTriageTransactions,
    settings,
    setSetting,
  } = useFinance();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearTransactionsModalOpen, setClearTransactionsModalOpen] = useState(false);
  const [clearTriageModalOpen, setClearTriageModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExportedState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingTransactions, setIsClearingTransactions] = useState(false);
  const [isClearingTriage, setIsClearingTriage] = useState(false);
  const [currencySymbol, setCurrencySymbolState] = useState(settings.get('currency') || '$');

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

  const handleImportFileSelect = async (file: File | null) => {
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

  const handleImportFromDialog = async () => {
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
  };

  const handleImportConfirm = async () => {
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
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
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

  const handleClearConfirm = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      notifications.show({
        title: 'Data Cleared',
        message: 'All data has been deleted',
        color: 'brand',
      });
      setClearModalOpen(false);
    } catch (error) {
      notifications.show({
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearTransactionsConfirm = async () => {
    setIsClearingTransactions(true);
    try {
      await clearTransactions();
      notifications.show({
        title: 'Transactions Cleared',
        message: 'All transactions have been deleted',
        color: 'brand',
      });
      setClearTransactionsModalOpen(false);
    } catch (error) {
      notifications.show({
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsClearingTransactions(false);
    }
  };

  const handleClearTriageConfirm = async () => {
    setIsClearingTriage(true);
    try {
      await clearTriageTransactions();
      notifications.show({
        title: 'Triage Cleared',
        message: 'All triage transactions have been deleted',
        color: 'brand',
      });
      setClearTriageModalOpen(false);
    } catch (error) {
      notifications.show({
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsClearingTriage(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setSetting('currency', value);
    setCurrencySymbolState(value);
    notifications.show({
      title: 'Currency Updated',
      message: `Currency symbol set to "${value}"`,
      color: 'brand',
    });
  };

  return (
    <Stack gap="md">
      <Title order={3}>Settings</Title>

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
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={() => {
              if (isTauri()) {
                handleImportFromDialog();
              } else {
                setImportModalOpen(true);
              }
            }}
          >
            Import Full State
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="danger"
            onClick={() => setClearTransactionsModalOpen(true)}
          >
            Clear Transactions
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="warning"
            onClick={() => setClearTriageModalOpen(true)}
          >
            Clear Triage
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="danger"
            onClick={() => setClearModalOpen(true)}
          >
            Clear All Data
          </Button>
        </Group>
      </Paper>

      {isTauri() && (
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
      )}

      <GoogleDriveSettings />

      <Paper p="md" withBorder>
        <Title order={4} mb="xs">
          Display Settings
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Configure how currency values are displayed.
        </Text>

        <Group>
          <TextInput
            label="Currency Symbol"
            placeholder="$"
            value={currencySymbol}
            onChange={(e) => handleCurrencyChange(e.currentTarget.value)}
            w={100}
          />
        </Group>
      </Paper>

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

      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportFile(null);
          setImportPreview(null);
        }}
        title="Import Full State"
        size="lg"
      >
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
              onChange={handleImportFileSelect}
            />
          )}

          {importPreview && (
            <Paper p="sm" withBorder>
              <Title order={5} mb="xs">
                Preview
              </Title>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm">Exported At:</Text>
                  <Text size="sm" fw={500}>
                    {new Date(importPreview.exportedAt).toLocaleString()}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Categories:</Text>
                  <Text size="sm" fw={500}>
                    {importPreview.categories.length}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Accounts:</Text>
                  <Text size="sm" fw={500}>
                    {importPreview.accounts.length}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Transactions:</Text>
                  <Text size="sm" fw={500}>
                    {importPreview.transactions.length}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Triage Transactions:</Text>
                  <Text size="sm" fw={500}>
                    {importPreview.triageTransactions.length}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Rules:</Text>
                  <Text size="sm" fw={500}>
                    {importPreview.rules.length}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
                setImportPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="brand"
              onClick={handleImportConfirm}
              disabled={!importPreview}
              loading={isImporting}
            >
              Import & Replace
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear All Data"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete ALL data? This action cannot be undone.
          </Text>
          <Text size="sm" c="danger" fw={500}>
            This will permanently delete all categories, accounts, transactions, triage
            transactions, and rules.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setClearModalOpen(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={handleClearConfirm} loading={isClearing}>
              Delete All Data
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={clearTransactionsModalOpen}
        onClose={() => setClearTransactionsModalOpen(false)}
        title="Clear Transactions"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete all transactions? This action cannot be undone.
          </Text>
          <Text size="sm" c="danger" fw={500}>
            This will permanently delete all transactions. Categories, accounts, and rules will be
            preserved.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setClearTransactionsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={handleClearTransactionsConfirm}
              loading={isClearingTransactions}
            >
              Delete Transactions
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={clearTriageModalOpen}
        onClose={() => setClearTriageModalOpen(false)}
        title="Clear Triage"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete all triage transactions? This action cannot be undone.
          </Text>
          <Text size="sm" c="warning" fw={500}>
            This will permanently delete all triage transactions. All other data will be preserved.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setClearTriageModalOpen(false)}>
              Cancel
            </Button>
            <Button color="warning" onClick={handleClearTriageConfirm} loading={isClearingTriage}>
              Delete Triage
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
