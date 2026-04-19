import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const webGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const webSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures on restricted browsers.
  }
};

const webDeleteItem = (key: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage delete failures on restricted browsers.
  }
};

export const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return webGetItem(key);
  }

  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null) return value;
  } catch {
    // Fall back to localStorage below.
  }

  return null;
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    webSetItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {
    // Fall back to localStorage below.
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    webDeleteItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Fall back to localStorage below.
  }
};

export const clearSessionAsync = async (): Promise<void> => {
  await Promise.all([
    deleteItemAsync('userToken'),
    deleteItemAsync('userRole'),
    deleteItemAsync('userId'),
  ]);
};
