import type { Garment, WearLog } from '../domain/types';
import type { Preferences } from '../engine/learning';
import { daysBetween, toDateKey } from './date';
import { computeWearStats } from './wearStats';

export interface WornEntry {
  garment: Garment;
  count: number;
  last: string | null;
}

export function mostWorn(garments: readonly Garment[], logs: readonly WearLog[], limit = 5): WornEntry[] {
  const wear = computeWearStats(logs);
  return garments
    .map((g) => ({ garment: g, count: wear.get(g.id)?.count ?? 0, last: wear.get(g.id)?.last ?? null }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count || (b.last ?? '').localeCompare(a.last ?? ''))
    .slice(0, limit);
}

/** Active garments (not sorted out) that were never worn. Oldest first. */
export function neverWorn(garments: readonly Garment[], logs: readonly WearLog[]): Garment[] {
  const wear = computeWearStats(logs);
  return garments
    .filter((g) => g.status !== 'aussortiert' && !wear.has(g.id))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Worn before, but not within `days` days. */
export function notWornSince(
  garments: readonly Garment[],
  logs: readonly WearLog[],
  days = 30,
  today = toDateKey(),
): WornEntry[] {
  const wear = computeWearStats(logs);
  return garments
    .filter((g) => g.status !== 'aussortiert')
    .map((g) => ({ garment: g, count: wear.get(g.id)?.count ?? 0, last: wear.get(g.id)?.last ?? null }))
    .filter((e) => e.last && daysBetween(e.last, today) >= days)
    .sort((a, b) => (a.last ?? '').localeCompare(b.last ?? ''));
}

export interface LearnedPair {
  a: Garment;
  b: Garment;
  value: number;
}

export function learnedPairs(prefs: Preferences, byId: Map<string, Garment>, direction: 1 | -1, limit = 3): LearnedPair[] {
  const out: LearnedPair[] = [];
  for (const [key, value] of prefs.pair) {
    if (value * direction <= 0.3) continue;
    const [x, y] = key.split('|');
    const a = byId.get(x ?? '');
    const b = byId.get(y ?? '');
    if (a && b) out.push({ a, b, value });
  }
  return out.sort((p, q) => (q.value - p.value) * direction).slice(0, limit);
}

/** Weeks (Mon–Sun) of a month as date keys, null for padding days. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toDateKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
