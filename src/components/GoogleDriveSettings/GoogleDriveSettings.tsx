import { useState, useEffect } from 'react';
import { Button, Group, NumberInput, Paper, PasswordInput, Stack, Text, Title, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandGoogleDrive, IconLink, IconLinkOff, IconRefresh } from '@tabler/icons-react';
import { useFinance } from '@/context/FinanceContext';
import { useSync } from '@/context/SyncContext';
import { startOAuthFlow, isOAuthConfigured, clearOAuthTokens } from '@/sync/oauthFlow';
import { useSecurities } from '@/context/SecuritiesContext';
import { RestoreBackupModal } from './RestoreBackupModal';

const ENV_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const ENV_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? '';
const CREDENTIALS_FROM_ENV = !!(ENV_CLIENT_ID && ENV_CLIENT_SECRET);

export function GoogleDriveSettings() {
  const { settings, setSetting, reloadFromDb: reloadFinance } = useFinance();
  const { reloadFromDb: reloadSecurities } = useSecurities();
  const { syncStatus, syncNow } = useSync();

  const [clientId, setClientId] = useState(CREDENTIALS_FROM_ENV ? ENV_CLIENT_ID : settings.get('google_client_id') || '');
  const [clientSecret, setClientSecret] = useState(
    CREDENTIALS_FROM_ENV ? ENV_CLIENT_SECRET : settings.get('google_client_secret') || ''
  );
  const [backupCount, setBackupCount] = useState(parseInt(settings.get('backupCount') || '7'));
  const [isConnecting, setIsConnecting] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  const configured = isOAuthConfigured(settings);

  useEffect(() => {
    if (!CREDENTIALS_FROM_ENV) {
      setClientId(settings.get('google_client_id') || '');
      setClientSecret(settings.get('google_client_secret') || '');
    }
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
    if (!CREDENTIALS_FROM_ENV && (!clientId.trim() || !clientSecret.trim())) {
      notifications.show({
        title: 'Missing Credentials',
        message: 'Please enter and save your Client ID and Client Secret first.',
        color: 'warning',
      });
      return;
    }

    setIsConnecting(true);
    try {
      if (!CREDENTIALS_FROM_ENV) {
        setSetting('google_client_id', clientId.trim());
        setSetting('google_client_secret', clientSecret.trim());
      }
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

  const handleRestore = async () => {
    await reloadFinance();
    await reloadSecurities();
  };

  return (
    <>
      <GoogleDriveSettingsPanel
        clientId={clientId}
        clientSecret={clientSecret}
        backupCount={backupCount}
        configured={configured}
        isConnecting={isConnecting}
        syncStatus={syncStatus}
        credentialsFromEnv={CREDENTIALS_FROM_ENV}
        onClientIdChange={setClientId}
        onClientSecretChange={setClientSecret}
        onBackupCountChange={handleBackupCountChange}
        onConnect={() => void handleConnect()}
        onSaveCredentials={handleSaveCredentials}
        onDisconnect={handleDisconnect}
        onSyncNow={() => void syncNow()}
        onOpenRestoreModal={() => setRestoreModalOpen(true)}
      />

      <RestoreBackupModal
        opened={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onRestore={handleRestore}
        settings={settings}
        setSetting={setSetting}
      />
    </>
  );
}

interface GoogleDriveSettingsPanelProps {
  clientId: string;
  clientSecret: string;
  backupCount: number;
  configured: boolean;
  isConnecting: boolean;
  syncStatus: string;
  credentialsFromEnv: boolean;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onBackupCountChange: (value: string | number) => void;
  onConnect: () => void;
  onSaveCredentials: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onOpenRestoreModal: () => void;
}

function GoogleDriveSettingsPanel({
  clientId,
  clientSecret,
  backupCount,
  configured,
  isConnecting,
  syncStatus,
  credentialsFromEnv,
  onClientIdChange,
  onClientSecretChange,
  onBackupCountChange,
  onConnect,
  onSaveCredentials,
  onDisconnect,
  onSyncNow,
  onOpenRestoreModal,
}: GoogleDriveSettingsPanelProps) {
  return (
    <Paper p="md" withBorder>
      <Group gap="xs" mb="xs">
        <IconBrandGoogleDrive size={20} />
        <Title order={4}>Google Drive Sync</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        {credentialsFromEnv
          ? 'Sync your data to Google Drive for automatic backup.'
          : 'Sync your data to Google Drive for automatic backup. You need to provide your own Google OAuth credentials from the Google Cloud Console.'}
      </Text>

      <Stack gap="md">
        {!credentialsFromEnv && (
          <Group grow>
            <PasswordInput
              label="Client ID"
              placeholder="Your Google OAuth Client ID"
              value={clientId}
              onChange={(e) => onClientIdChange(e.currentTarget.value)}
            />
            <PasswordInput
              label="Client Secret"
              placeholder="Your Google OAuth Client Secret"
              value={clientSecret}
              onChange={(e) => onClientSecretChange(e.currentTarget.value)}
            />
          </Group>
        )}

        <ConnectionControls
          configured={configured}
          isConnecting={isConnecting}
          syncStatus={syncStatus}
          credentialsFromEnv={credentialsFromEnv}
          onConnect={onConnect}
          onSaveCredentials={onSaveCredentials}
          onDisconnect={onDisconnect}
          onSyncNow={onSyncNow}
        />

        {configured && (
          <ConfiguredSettings
            backupCount={backupCount}
            onBackupCountChange={onBackupCountChange}
            onOpenRestoreModal={onOpenRestoreModal}
          />
        )}
      </Stack>
    </Paper>
  );
}

interface ConfiguredSettingsProps {
  backupCount: number;
  onBackupCountChange: (value: string | number) => void;
  onOpenRestoreModal: () => void;
}

function ConfiguredSettings({ backupCount, onBackupCountChange, onOpenRestoreModal }: ConfiguredSettingsProps) {
  return (
    <>
      <NumberInput
        label="Rotating Backup Count"
        description="Number of daily backups to keep on Google Drive"
        value={backupCount}
        onChange={onBackupCountChange}
        min={1}
        max={30}
        w={250}
      />

      <div>
        <Text size="sm" fw={500} mb="xs">
          Restore from Backup
        </Text>
        <Button variant="light" size="xs" onClick={onOpenRestoreModal}>
          View Backups
        </Button>
      </div>
    </>
  );
}

interface ConnectionControlsProps {
  configured: boolean;
  isConnecting: boolean;
  syncStatus: string;
  credentialsFromEnv: boolean;
  onConnect: () => void;
  onSaveCredentials: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

function ConnectionControls({
  configured,
  isConnecting,
  syncStatus,
  credentialsFromEnv,
  onConnect,
  onSaveCredentials,
  onDisconnect,
  onSyncNow,
}: ConnectionControlsProps) {
  if (!configured) {
    return (
      <Group gap="sm" align="center">
        <Button leftSection={<IconLink size={16} />} onClick={onConnect} loading={isConnecting}>
          Connect Google Drive
        </Button>
        {!credentialsFromEnv && (
          <Button variant="light" onClick={onSaveCredentials}>
            Save Credentials
          </Button>
        )}
      </Group>
    );
  }

  return (
    <Group gap="sm" align="center">
      <Badge color="teal" variant="light" size="lg">
        Connected
      </Badge>
      <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={onSyncNow} loading={syncStatus === 'syncing'}>
        Sync Now
      </Button>
      <Button variant="light" color="red" leftSection={<IconLinkOff size={16} />} onClick={onDisconnect}>
        Disconnect
      </Button>
    </Group>
  );
}
