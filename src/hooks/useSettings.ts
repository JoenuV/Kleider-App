import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings } from '../db/repo';
import { DEFAULT_SETTINGS } from '../domain/constants';
import type { Settings } from '../domain/types';

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}
