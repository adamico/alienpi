import { settings, PERSISTED_KEYS } from "./config/settings.js";

const SETTINGS_STORAGE_KEY = "alienpi.settings.v1";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const key of PERSISTED_KEYS) {
      if (key in parsed) settings[key] = parsed[key];
    }
  } catch {
    // Corrupt or unavailable storage: fall back to defaults silently.
  }
}

export function saveSettings() {
  try {
    const snapshot = {};
    for (const key of PERSISTED_KEYS) snapshot[key] = settings[key];
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage write failed (private mode, quota): ignore.
  }
}
