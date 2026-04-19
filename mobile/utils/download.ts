import * as FileSystem from 'expo-file-system/legacy';
import * as Storage from './storage';
import * as Sharing from 'expo-sharing';

import { API_URL } from './api';

type DownloadAndShareOptions = {
  endpoint: string;
  fileName: string;
  dialogTitle?: string;
};

const sanitizeFileName = (fileName: string) => {
  const trimmed = (fileName || '').trim();
  const safeName = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeName || `download_${Date.now()}`;
};

const toAbsoluteApiUrl = (endpoint: string) => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${normalizedEndpoint}`;
};

export const downloadAndShareApiFile = async ({ endpoint, fileName, dialogTitle }: DownloadAndShareOptions) => {
  const token = await Storage.getItemAsync('userToken');
  if (!token) {
    throw new Error('Not authorized, no token');
  }

  if (!FileSystem.documentDirectory) {
    throw new Error('Unable to access local storage on this device.');
  }

  const downloadsDir = `${FileSystem.documentDirectory}downloads`;
  await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });

  const safeFileName = sanitizeFileName(fileName);
  const localFileUri = `${downloadsDir}/${Date.now()}_${safeFileName}`;

  const result = await FileSystem.downloadAsync(toAbsoluteApiUrl(endpoint), localFileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result || (result.status && result.status >= 400)) {
    throw new Error(`Download failed with status ${result?.status ?? 'unknown'}`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      dialogTitle: dialogTitle || 'Open downloaded file',
    });
  }

  return {
    uri: result.uri,
    shared: canShare,
  };
};

