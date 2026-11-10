import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'better_auth_session_token';

export const sessionStore = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SESSION_KEY);
    } catch {
      return null;
    }
  },
  async save(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, token);
    } catch {
      // SecureStore not available (e.g. web)
    }
  },
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      // ignore
    }
  },
};
