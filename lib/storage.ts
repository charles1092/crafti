// Browser localStorage wrapper (replaces Claude artifact's window.storage)
// All data persists in the user's browser between sessions.

const STORAGE_PREFIX = 'crafti-';

export const storage = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      console.warn('localStorage not available');
      return null;
    }
  },

  set(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {
      console.warn('localStorage not available or full');
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      console.warn('localStorage not available');
    }
  }
};
