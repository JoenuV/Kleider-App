import type { Feedback, Outfit } from '../domain/types';

/** Learned preferences from ratings and rejections. */
export interface Preferences {
  /** Affinity of two garments worn together. Positive = liked. */
  pair: Map<string, number>;
  /** Affinity of a single garment within outfits. */
  item: Map<string, number>;
  /** Exact combinations the user rejected. */
  rejected: Set<string>;
}

export const EMPTY_PREFS: Preferences = { pair: new Map(), item: new Map(), rejected: new Set() };

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const setKey = (ids: readonly string[]) => [...ids].sort().join('|');

const HALF_LIFE_DAYS = 120;

function decay(createdAt: number, now: number): number {
  const days = Math.max(0, (now - createdAt) / 86_400_000);
  return 0.5 ** (days / HALF_LIFE_DAYS);
}

function addSet(p: Preferences, ids: readonly string[], value: number) {
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i]!;
    p.item.set(a, (p.item.get(a) ?? 0) + value * 0.35);
    for (let j = i + 1; j < ids.length; j++) {
      const k = pairKey(a, ids[j]!);
      p.pair.set(k, (p.pair.get(k) ?? 0) + value);
    }
  }
}

export function buildPreferences(
  feedback: readonly Feedback[],
  outfits: readonly Pick<Outfit, 'itemIds' | 'rating' | 'createdAt'>[],
  now = Date.now(),
): Preferences {
  const p: Preferences = { pair: new Map(), item: new Map(), rejected: new Set() };
  for (const f of feedback) {
    addSet(p, f.itemIds, f.value * decay(f.createdAt, now));
    if (f.value < 0) p.rejected.add(setKey(f.itemIds));
  }
  for (const o of outfits) {
    if (!o.rating) continue;
    // 1★ → -1, 3★ → 0, 5★ → +1
    addSet(p, o.itemIds, ((o.rating - 3) / 2) * 1.5 * decay(o.createdAt, now));
  }
  return p;
}

/** 0..1, 0.5 = neutral. */
export function learnedScore(ids: readonly string[], prefs: Preferences): number {
  if (prefs.rejected.has(setKey(ids))) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sum += Math.tanh((prefs.pair.get(pairKey(ids[i]!, ids[j]!)) ?? 0) / 1.5);
      n++;
    }
  }
  const pairPart = n ? sum / n : 0;
  const itemPart = ids.length ? ids.reduce((s, id) => s + Math.tanh(prefs.item.get(id) ?? 0), 0) / ids.length : 0;
  return Math.max(0, Math.min(1, 0.5 + 0.35 * pairPart + 0.15 * itemPart));
}
