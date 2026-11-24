import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Session } from '../../domain/models';

const SESSION_KEY = 'kickzone.session';

/**
 * SecureStore is only implemented by Expo on native platforms. Its web module
 * intentionally has no storage methods, so use AsyncStorage (localStorage on
 * web) to keep the demo session available in the browser.
 */
async function getStoredValue(key: string): Promise<string | null> {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function removeStoredValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export const sessionStorage = {
  async read(): Promise<Session | null> {
    try {
      const value = await getStoredValue(SESSION_KEY);
      return value ? (JSON.parse(value) as Session) : null;
    } catch {
      return null;
    }
  },
  async write(session: Session): Promise<void> {
    await setStoredValue(SESSION_KEY, JSON.stringify(session));
  },
  async clear(): Promise<void> {
    await removeStoredValue(SESSION_KEY);
  },
};
