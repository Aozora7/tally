import { exportFullState, type ExportedState } from '@/db/export';
import { listAppDataFiles, uploadAppDataFile, downloadAppDataFile } from './driveApi';
import { manageBackups } from './backupManager';

let cachedCurrentFileId: string | null = null;

export async function performSync(
  accessToken: string,
  settings: Map<string, string>,
  setSetting: (key: string, value: string) => void
): Promise<void> {
  const state = await exportFullState();
  const stateJson = JSON.stringify(state);

  // Find or use cached current.json file ID
  if (!cachedCurrentFileId) {
    const files = await listAppDataFiles(accessToken);
    const currentFile = files.find((f) => f.name === 'current.json');
    cachedCurrentFileId = currentFile?.id ?? null;
  }

  // Upload current state
  const result = await uploadAppDataFile(
    accessToken,
    'current.json',
    stateJson,
    cachedCurrentFileId ?? undefined
  );
  cachedCurrentFileId = result.id;

  // Manage rotating backups
  await manageBackups(accessToken, stateJson, settings, setSetting);

  setSetting('lastSyncedAt', new Date().toISOString());
}

export interface RemoteState {
  exportedAt: string;
  data: ExportedState;
}

export async function checkRemoteState(accessToken: string): Promise<RemoteState | null> {
  const files = await listAppDataFiles(accessToken);
  const currentFile = files.find((f) => f.name === 'current.json');

  if (!currentFile) {
    cachedCurrentFileId = null;
    return null;
  }

  cachedCurrentFileId = currentFile.id;

  const content = await downloadAppDataFile(accessToken, currentFile.id);
  const data = JSON.parse(content) as ExportedState;

  return { exportedAt: data.exportedAt, data };
}

export interface BackupInfo {
  id: string;
  name: string;
  date: string;
  modifiedTime: string;
}

export async function listBackups(accessToken: string): Promise<BackupInfo[]> {
  const files = await listAppDataFiles(accessToken);
  return files
    .filter((f) => f.name.startsWith('backup-') && f.name.endsWith('.json'))
    .map((f) => ({
      id: f.id,
      name: f.name,
      date: f.name.replace('backup-', '').replace('.json', ''),
      modifiedTime: f.modifiedTime,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function downloadBackup(accessToken: string, fileId: string): Promise<ExportedState> {
  const content = await downloadAppDataFile(accessToken, fileId);
  return JSON.parse(content) as ExportedState;
}

export function resetCachedFileId(): void {
  cachedCurrentFileId = null;
}
