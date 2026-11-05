import type { WearLog } from '../domain/types';

export interface ItemWear {
  count: number;
  /** YYYY-MM-DD */
  last: string | null;
}

export function computeWearStats(logs: readonly WearLog[]): Map<string, ItemWear> {
  const map = new Map<string, ItemWear>();
  for (const log of logs) {
    for (const id of log.itemIds) {
      const cur = map.get(id) ?? { count: 0, last: null };
      cur.count++;
      if (!cur.last || log.date > cur.last) cur.last = log.date;
      map.set(id, cur);
    }
  }
  return map;
}
