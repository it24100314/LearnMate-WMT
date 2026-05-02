/**
 * Cross-platform storage utility.
 * - On native (Android/iOS): uses expo-secure-store
 * - On web: uses localStorage (with SSR guard via globalThis)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Safe way to reference localStorage without requiring DOM lib types
const webStorage: Storage | null = (() => {
  try {
    // globalThis works in both Node.js (SSR) and browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).localStorage ?? null;
  } catch {
    return null;
  }
})();

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return webStorage ? webStorage.getItem(key) : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        webStorage?.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // silently ignore
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        webStorage?.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // silently ignore
    }
  },
};
