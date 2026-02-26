import { useState, useEffect, useCallback } from 'react';
import { Button, Group, Modal, Stack, Table, Badge, Text, ScrollArea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getValidAccessToken } from '@/sync/oauthFlow';
import { listBackups, downloadBackup, type BackupInfo } from '@/sync/syncEngine';
import { importFullState } from '@/db/import';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RestoreBackupModalProps {
  opened: boolean;
  onClose: () => void;
  onRestore: () => Promise<void>;
  settings: Map<string, string>;
  setSetting: (key: string, value: string) => void;
}

export function RestoreBackupModal({
  opened,
  onClose,
  onRestore,
  settings,
  setSetting,
}: RestoreBackupModalProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const accessToken = await getValidAccessToken(settings, setSetting);
      const backupList = await listBackups(accessToken);
      setBackups(backupList);
    } catch (err) {
      notifications.show({
        title: 'Failed to Load Backups',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsLoadingBackups(false);
    }
  }, [settings, setSetting]);

  useEffect(() => {
    if (opened) {
      setSelectedBackup(null);
      void loadBackups();
    }
  }, [opened, loadBackups]);

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setIsRestoring(true);
    try {
      const accessToken = await getValidAccessToken(settings, setSetting);
      const data = await downloadBackup(accessToken, selectedBackup.id);
      await importFullState(data);
      await onRestore();
      notifications.show({
        title: 'Backup Restored',
        message: `Restored backup from ${selectedBackup.date}`,
        color: 'brand',
      });
      onClose();
      setSelectedBackup(null);
    } catch (err) {
      notifications.show({
        title: 'Restore Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedBackup(null);
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Restore from Backup" size="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select a backup to restore. This will replace ALL existing local data.
        </Text>

        {backups.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {isLoadingBackups ? 'Loading backups...' : 'No backups found on Google Drive.'}
          </Text>
        ) : (
          <ScrollArea.Autosize mah={300}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Modified</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {backups.map((backup) => (
                  <BackupRow
                    key={backup.id}
                    backup={backup}
                    isSelected={selectedBackup?.id === backup.id}
                    onSelect={() => setSelectedBackup(backup)}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            color="brand"
            disabled={!selectedBackup}
            loading={isRestoring}
            onClick={() => void handleRestore()}
          >
            Restore Selected Backup
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface BackupRowProps {
  backup: BackupInfo;
  isSelected: boolean;
  onSelect: () => void;
}

function BackupRow({ backup, isSelected, onSelect }: BackupRowProps) {
  return (
    <Table.Tr
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-brand-light)' : undefined,
      }}
      onClick={onSelect}
    >
      <Table.Td>{backup.date}</Table.Td>
      <Table.Td>{backup.size !== undefined ? formatFileSize(backup.size) : '-'}</Table.Td>
      <Table.Td>{new Date(backup.modifiedTime).toLocaleString()}</Table.Td>
      <Table.Td>
        {isSelected && (
          <Badge size="xs" color="brand">
            Selected
          </Badge>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
