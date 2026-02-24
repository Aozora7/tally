import { ActionIcon, Popover, Stack, Text, Button, Group, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCloud,
  IconCloudCheck,
  IconCloudUpload,
  IconCloudOff,
  IconCloudExclamation,
} from '@tabler/icons-react';
import { useSync } from '@/context/SyncContext';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SyncIndicator() {
  const {
    syncStatus,
    lastSyncedAt,
    lastError,
    syncNow,
    isConfigured,
    remoteNewer,
    acceptRemote,
    dismissRemote,
  } = useSync();
  const [popoverOpened, { toggle: togglePopover, close: closePopover }] = useDisclosure(false);

  const getIcon = () => {
    switch (syncStatus) {
      case 'not-configured':
        return <IconCloudOff size={18} stroke={1.5} />;
      case 'syncing':
        return <IconCloudUpload size={18} stroke={1.5} />;
      case 'synced':
        return <IconCloudCheck size={18} stroke={1.5} />;
      case 'error':
        return <IconCloudExclamation size={18} stroke={1.5} />;
      default:
        return <IconCloud size={18} stroke={1.5} />;
    }
  };

  const getColor = () => {
    switch (syncStatus) {
      case 'synced':
        return 'teal';
      case 'syncing':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'dimmed';
    }
  };

  const getLabel = () => {
    switch (syncStatus) {
      case 'not-configured':
        return 'Sync off';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt)}` : 'Synced';
      case 'error':
        return 'Sync error';
      default:
        return lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt)}` : 'Idle';
    }
  };

  return (
    <>
      <Popover opened={popoverOpened} onClose={closePopover} position="right" withArrow>
        <Popover.Target>
          <Group
            gap="xs"
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
            onClick={togglePopover}
          >
            <ActionIcon variant="subtle" color={getColor()} size="sm">
              {getIcon()}
            </ActionIcon>
            <Text size="xs" c={getColor()}>
              {getLabel()}
            </Text>
          </Group>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs" style={{ minWidth: 200 }}>
            <Text size="sm" fw={500}>
              Google Drive Sync
            </Text>
            {!isConfigured && (
              <Text size="xs" c="dimmed">
                Configure in Settings to enable sync.
              </Text>
            )}
            {lastSyncedAt && (
              <Text size="xs" c="dimmed">
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </Text>
            )}
            {lastError && (
              <Text size="xs" c="red">
                {lastError}
              </Text>
            )}
            {isConfigured && (
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  closePopover();
                  void syncNow();
                }}
                loading={syncStatus === 'syncing'}
              >
                Sync Now
              </Button>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <Modal opened={remoteNewer} onClose={dismissRemote} title="Remote Data Available" size="sm">
        <Stack gap="md">
          <Text size="sm">
            A newer version of your data was found on Google Drive. Would you like to use the remote
            data or keep your local data?
          </Text>
          <Text size="xs" c="dimmed">
            Choosing remote will replace all local data. Keeping local will overwrite the remote on
            next sync.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={dismissRemote}>
              Keep Local
            </Button>
            <Button color="brand" onClick={() => void acceptRemote()}>
              Use Remote
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
