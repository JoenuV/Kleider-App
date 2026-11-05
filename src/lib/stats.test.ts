import { describe, expect, it } from 'vitest';
import { buildPreferences } from '../engine/learning';
import { garment } from '../engine/testUtils';
import type { WearLog } from '../domain/types';
import { learnedPairs, monthGrid, mostWorn, neverWorn, notWornSince } from './stats';

const a = garment({ id: 'a', category: 'top', createdAt: 1 });
const b = garment({ id: 'b', category: 'pants', createdAt: 2 });
const c = garment({ id: 'c', category: 'shoes', createdAt: 3 });
const d = garment({ id: 'd', category: 'jacket', createdAt: 4, status: 'aussortiert' });
const log = (date: string, itemIds: string[]): WearLog => ({ id: date + itemIds.join(), date, outfitId: 'o', itemIds, createdAt: 0 });
const logs = [log('2026-09-01', ['a', 'b']), log('2026-11-01', ['a']), log('2026-11-03', ['a'])];

describe('stats', () => {
  it('finds the most worn garments', () => {
    const top = mostWorn([a, b, c, d], logs);
    expect(top.map((e) => [e.garment.id, e.count])).toEqual([
      ['a', 3],
      ['b', 1],
    ]);
  });

  it('finds never worn garments (ignoring sorted-out ones)', () => {
    expect(neverWorn([a, b, c, d], logs).map((g) => g.id)).toEqual(['c']);
  });

  it('finds garments not worn for a while', () => {
    expect(notWornSince([a, b, c], logs, 30, '2026-11-05').map((e) => e.garment.id)).toEqual(['b']);
  });

  it('lists learned favourite pairs', () => {
    const prefs = buildPreferences([{ id: 'f', itemIds: ['a', 'b'], value: 1, createdAt: Date.now() }], []);
    const map = new Map([a, b].map((g) => [g.id, g]));
    expect(learnedPairs(prefs, map, 1)).toHaveLength(1);
    expect(learnedPairs(prefs, map, -1)).toHaveLength(0);
  });

  it('builds a Monday-first month grid', () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});
