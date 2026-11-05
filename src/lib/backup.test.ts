import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { KleiderDB } from '../db/db';
import { addGarment, ensureBuiltIns, markWorn, saveOutfit, updateSettings } from '../db/repo';
import type { GarmentDraft } from '../domain/types';
import { createBackup, parseBackup, restoreBackup } from './backup';

let counter = 0;
const dbs: KleiderDB[] = [];
function freshDb() {
  const d = new KleiderDB(`test-${counter++}`);
  dbs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

const draft = (name: string): GarmentDraft => ({
  photo: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }),
  thumb: new Blob([new Uint8Array([9, 8])], { type: 'image/jpeg' }),
  name,
  category: 'top',
  colors: ['weiss'],
  pattern: 'uni',
  styles: ['casual'],
  warmth: 2,
  rainproof: false,
  windproof: false,
  delicate: false,
  occasions: [],
  status: 'verfuegbar',
  rating: 4,
  comfort: 4,
  look: 3,
  note: '',
  favorite: false,
});

describe('backup', () => {
  it('round-trips all data including photos', async () => {
    const a = freshDb();
    await ensureBuiltIns(a);
    await updateSettings({ windowFrom: 6 }, a);
    const id = await addGarment(draft('Shirt'), a);
    const outfitId = await saveOutfit({ itemIds: [id], source: 'manuell', context: {}, rating: 0, note: '', reasons: [] }, a);
    await markWorn(outfitId, new Date(2026, 10, 5), a);

    const json = JSON.stringify(await createBackup(a));
    const parsed = parseBackup(json);

    const b = freshDb();
    await restoreBackup(parsed, 'replace', b);
    const g = await b.garments.get(id);
    expect(g?.name).toBe('Shirt');
    expect(g?.photo.type).toBe('image/jpeg');
    expect(Array.from(new Uint8Array(await g!.photo.arrayBuffer()))).toEqual([1, 2, 3, 250]);
    expect(await b.wearLogs.count()).toBe(1);
    expect((await b.settings.get('app'))?.windowFrom).toBe(6);
    expect(await b.activities.count()).toBe(5);
  });

  it('merge keeps existing items', async () => {
    const a = freshDb();
    await addGarment(draft('A'), a);
    const backup = parseBackup(JSON.stringify(await createBackup(a)));
    const b = freshDb();
    await addGarment(draft('B'), b);
    await restoreBackup(backup, 'merge', b);
    expect(await b.garments.count()).toBe(2);
  });

  it('rejects foreign files with a clear message', () => {
    expect(() => parseBackup('nope')).toThrow(/kein gültiges Backup/);
    expect(() => parseBackup('{"app":"x"}')).toThrow(/nicht aus der Kleider-App/);
  });
});
