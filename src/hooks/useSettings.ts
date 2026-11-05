import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings } from '../db/repo';
import { DEFAULT_SETTINGS } from '../domain/constants';
import type { Settings } from '../domain/types';

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}

/** Like useSettings, but undefined until loaded from the database. */
export function useLoadedSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(), []);
}
