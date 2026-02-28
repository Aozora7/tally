import { listAppDataFiles, uploadAppDataFile, deleteAppDataFile } from './driveApi';

const DEFAULT_BACKUP_COUNT = 30;

export async function manageBackups(
  accessToken: string,
  stateJson: string,
  settings: Map<string, string>,
  setSetting: (key: string, value: string) => void
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!;
  const lastBackupDate = settings.get('lastBackupDate');

  if (lastBackupDate === today) return;

  const files = await listAppDataFiles(accessToken);
  const backupFiles = files
    .filter((f) => f.name.startsWith('backup-') && f.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Create today's backup
  await uploadAppDataFile(accessToken, `backup-${today}.json`, stateJson);

  // Delete oldest backups if over limit
  const maxBackups = parseInt(settings.get('backupCount') || String(DEFAULT_BACKUP_COUNT));
  const totalAfterAdd = backupFiles.length + 1;
  const toDelete = totalAfterAdd - maxBackups;
  if (toDelete > 0) {
    for (let i = 0; i < toDelete && i < backupFiles.length; i++) {
      await deleteAppDataFile(accessToken, backupFiles[i]!.id);
    }
  }

  setSetting('lastBackupDate', today);
}
