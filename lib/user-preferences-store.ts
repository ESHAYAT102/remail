import type { UserPreferences } from "./preferences";

type Listener = () => void;

export function createUserPreferencesStore() {
  const values = new Map<string, UserPreferences>();
  const listeners = new Map<string, Set<Listener>>();

  return {
    getSnapshot(userId: string, initialPreferences: UserPreferences) {
      const current = values.get(userId);
      if (current) return current;
      values.set(userId, initialPreferences);
      return initialPreferences;
    },
    set(userId: string, preferences: UserPreferences) {
      if (values.get(userId) === preferences) return;
      values.set(userId, preferences);
      for (const listener of listeners.get(userId) ?? []) listener();
    },
    subscribe(userId: string, listener: Listener) {
      const userListeners = listeners.get(userId) ?? new Set<Listener>();
      userListeners.add(listener);
      listeners.set(userId, userListeners);
      return () => {
        userListeners.delete(listener);
        if (userListeners.size === 0) listeners.delete(userId);
      };
    },
  };
}

export const userPreferencesStore = createUserPreferencesStore();
