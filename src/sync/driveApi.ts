const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listAppDataFiles(accessToken: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,modifiedTime)',
    pageSize: '100',
    orderBy: 'name',
  });

  const resp = await fetch(`${DRIVE_API}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`Failed to list files: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as { files: DriveFile[] };
  return data.files || [];
}

export async function uploadAppDataFile(
  accessToken: string,
  fileName: string,
  content: string,
  existingFileId?: string
): Promise<DriveFile> {
  if (existingFileId) {
    // Update existing file
    const resp = await fetch(
      `${DRIVE_UPLOAD_API}/${existingFileId}?uploadType=media&fields=id,name,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: content,
      }
    );

    if (!resp.ok) {
      throw new Error(`Failed to update file: ${resp.status} ${resp.statusText}`);
    }

    return resp.json() as Promise<DriveFile>;
  }

  // Create new file with multipart upload
  const metadata = {
    name: fileName,
    parents: ['appDataFolder'],
  };

  const boundary = 'drive_sync_boundary';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    content +
    '\r\n' +
    `--${boundary}--`;

  const resp = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!resp.ok) {
    throw new Error(`Failed to create file: ${resp.status} ${resp.statusText}`);
  }

  return resp.json() as Promise<DriveFile>;
}

export async function downloadAppDataFile(accessToken: string, fileId: string): Promise<string> {
  const resp = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`Failed to download file: ${resp.status} ${resp.statusText}`);
  }

  return resp.text();
}

export async function deleteAppDataFile(accessToken: string, fileId: string): Promise<void> {
  const resp = await fetch(`${DRIVE_API}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`Failed to delete file: ${resp.status} ${resp.statusText}`);
  }
}
