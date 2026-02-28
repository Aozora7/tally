import { open, save, type OpenDialogOptions, type SaveDialogOptions } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
}

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: {
    name: string;
    extensions: string[];
  }[];
}

export interface FileResult {
  path: string;
  content: string;
}

function buildOpenOptions(options: FileDialogOptions): OpenDialogOptions {
  const result: OpenDialogOptions = {
    multiple: false,
    directory: false,
  };
  if (options.title) result.title = options.title;
  if (options.defaultPath) result.defaultPath = options.defaultPath;
  if (options.filters) result.filters = options.filters;
  return result;
}

function buildSaveOptions(options: FileDialogOptions): SaveDialogOptions {
  const result: SaveDialogOptions = {};
  if (options.title) result.title = options.title;
  if (options.defaultPath) result.defaultPath = options.defaultPath;
  if (options.filters) result.filters = options.filters;
  return result;
}

export async function openFileDialog(options: FileDialogOptions = {}): Promise<FileResult | null> {
  if (isTauri()) {
    const selected = await open(buildOpenOptions(options));

    if (selected) {
      const content = await readTextFile(selected);
      return { path: selected, content };
    }
    return null;
  } else {
    return openFileDialogBrowser(options);
  }
}

function openFileDialogBrowser(options: FileDialogOptions): Promise<FileResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.filters?.flatMap((f) => f.extensions.map((ext) => `.${ext}`)).join(',') || '';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await file.text();
        resolve({ path: file.name, content });
      } else {
        resolve(null);
      }
    };

    input.click();
  });
}

export async function saveFileDialog(content: string, options: FileDialogOptions = {}): Promise<string | null> {
  if (isTauri()) {
    const selected = await save(buildSaveOptions(options));

    if (selected) {
      await writeTextFile(selected, content);
      return selected;
    }
    return null;
  } else {
    return saveFileDialogBrowser(content, options);
  }
}

function saveFileDialogBrowser(content: string, options: FileDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const defaultName = options.defaultPath || 'export.json';
    link.download = defaultName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    resolve(defaultName);
  });
}

export async function readJsonFile<T>(options: FileDialogOptions = {}): Promise<{ data: T; path: string } | null> {
  const result = await openFileDialog(options);
  if (result) {
    try {
      const data = JSON.parse(result.content) as T;
      return { data, path: result.path };
    } catch {
      throw new Error('Invalid JSON file');
    }
  }
  return null;
}

export async function writeJsonFile<T>(data: T, options: FileDialogOptions = {}): Promise<string | null> {
  const content = JSON.stringify(data, null, 2);
  return saveFileDialog(content, options);
}

export async function getDataDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string>('get_data_directory');
}

export async function openDataDirectory(): Promise<void> {
  if (!isTauri()) return;
  await invoke('open_data_directory');
}
