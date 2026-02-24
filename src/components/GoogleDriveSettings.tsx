import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
  Modal,
  Table,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandGoogleDrive, IconLink, IconLinkOff, IconRefresh } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useSync } from '@/context/SyncContext';
import { startOAuthFlow, isOAuthConfigured, clearOAuthTokens } from '@/sync/oauthFlow';
import { getValidAccessToken } from '@/sync/oauthFlow';
import { listBackups, downloadBackup, type BackupInfo } from '@/sync/syncEngine';
import { importFullState } from '@/db/import';
import { useSecurities } from '@/context/SecuritiesContext';

export function GoogleDriveSettings() {
  const { settings, setSetting, reloadFromDb: reloadFinance } = useFinance();
  const { reloadFromDb: reloadSecurities } = useSecurities();
  const { syncStatus, syncNow } = useSync();

  const [clientId, setClientId] = useState(settings.get('google_client_id') || '');
  const [clientSecret, setClientSecret] = useState(settings.get('google_client_secret') || '');
  const [backupCount, setBackupCount] = useState(parseInt(settings.get('backupCount') || '7'));
  const [isConnecting, setIsConnecting] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const configured = isOAuthConfigured(settings);

  useEffect(() => {
    setClientId(settings.get('google_client_id') || '');
    setClientSecret(settings.get('google_client_secret') || '');
    setBackupCount(parseInt(settings.get('backupCount') || '7'));
  }, [settings]);

  const handleSaveCredentials = () => {
    setSetting('google_client_id', clientId.trim());
    setSetting('google_client_secret', clientSecret.trim());
    notifications.show({
      title: 'Credentials Saved',
      message: 'Google OAuth credentials have been saved.',
      color: 'brand',
    });
  };

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      notifications.show({
        title: 'Missing Credentials',
        message: 'Please enter and save your Client ID and Client Secret first.',
        color: 'warning',
      });
      return;
    }

    setIsConnecting(true);
    try {
      setSetting('google_client_id', clientId.trim());
      setSetting('google_client_secret', clientSecret.trim());
      await startOAuthFlow(clientId.trim(), clientSecret.trim(), setSetting);
      notifications.show({
        title: 'Connected',
        message: 'Successfully connected to Google Drive.',
        color: 'brand',
      });
    } catch (err) {
      notifications.show({
        title: 'Connection Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        color: 'danger',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearOAuthTokens(setSetting);
    notifications.show({
      title: 'Disconnected',
      message: 'Google Drive sync has been disconnected.',
      color: 'brand',
    });
  };

  const handleBackupCountChange = (value: string | number) => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num >= 1 && num <= 30) {
      setBackupCount(num);
      setSetting('backupCount', num.toString());
    }
  };

  const loadBackups = useCallback(async () => {
    if (!configured) return;
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
  }, [configured, settings, setSetting]);

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    setIsRestoring(true);
    try {
      const accessToken = await getValidAccessToken(settings, setSetting);
      const data = await downloadBackup(accessToken, selectedBackup.id);
      await importFullState(data);
      await reloadFinance();
      await reloadSecurities();
      notifications.show({
        title: 'Backup Restored',
        message: `Restored backup from ${selectedBackup.date}`,
        color: 'brand',
      });
      setRestoreModalOpen(false);
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

  return (
    <>
      <Paper p="md" withBorder>
        <Group gap="xs" mb="xs">
          <IconBrandGoogleDrive size={20} />
          <Title order={4}>Google Drive Sync</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Sync your data to Google Drive for automatic backup. You need to provide your own Google
          OAuth credentials from the Google Cloud Console.
        </Text>

        <Stack gap="md">
          <Group grow>
            <PasswordInput
              label="Client ID"
              placeholder="Your Google OAuth Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.currentTarget.value)}
            />
            <PasswordInput
              label="Client Secret"
              placeholder="Your Google OAuth Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.currentTarget.value)}
            />
          </Group>

          <Group gap="sm">
            {!configured ? (
              <>
                <Button
                  leftSection={<IconLink size={16} />}
                  onClick={() => void handleConnect()}
                  loading={isConnecting}
                >
                  Connect Google Drive
                </Button>
                <Button variant="light" onClick={handleSaveCredentials}>
                  Save Credentials
                </Button>
              </>
            ) : (
              <>
                <Badge color="teal" variant="light" size="lg">
                  Connected
                </Badge>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => void syncNow()}
                  loading={syncStatus === 'syncing'}
                >
                  Sync Now
                </Button>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconLinkOff size={16} />}
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </>
            )}
          </Group>

          {configured && (
            <>
              <NumberInput
                label="Rotating Backup Count"
                description="Number of daily backups to keep on Google Drive"
                value={backupCount}
                onChange={handleBackupCountChange}
                min={1}
                max={30}
                w={250}
              />

              <div>
                <Text size="sm" fw={500} mb="xs">
                  Restore from Backup
                </Text>
                <Group gap="sm">
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => {
                      void loadBackups();
                      setRestoreModalOpen(true);
                    }}
                    loading={isLoadingBackups}
                  >
                    View Backups
                  </Button>
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setSelectedBackup(null);
        }}
        title="Restore from Backup"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select a backup to restore. This will replace ALL existing local data.
          </Text>

          {backups.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {isLoadingBackups ? 'Loading backups...' : 'No backups found on Google Drive.'}
            </Text>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Modified</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {backups.map((backup) => (
                  <Table.Tr
                    key={backup.id}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        selectedBackup?.id === backup.id
                          ? 'var(--mantine-color-brand-light)'
                          : undefined,
                    }}
                    onClick={() => setSelectedBackup(backup)}
                  >
                    <Table.Td>{backup.date}</Table.Td>
                    <Table.Td>{new Date(backup.modifiedTime).toLocaleString()}</Table.Td>
                    <Table.Td>
                      {selectedBackup?.id === backup.id && (
                        <Badge size="xs" color="brand">
                          Selected
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setRestoreModalOpen(false);
                setSelectedBackup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="brand"
              disabled={!selectedBackup}
              loading={isRestoring}
              onClick={() => void handleRestoreBackup()}
            >
              Restore Selected Backup
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
