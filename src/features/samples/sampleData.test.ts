import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { KleiderDB } from '../../db/db';
import { addGarment } from '../../db/repo';
import { generateOutfits } from '../../engine/generate';
import { input } from '../../engine/testUtils';
import { garmentSvg, hasSampleData, loadSampleData, removeSampleData } from './sampleData';

describe('sample data', () => {
  it('loads a complete wardrobe and removes only sample items', async () => {
    const d = new KleiderDB('samples-test');
    await loadSampleData(d);
    const userItem = (await d.garments.toArray())[0]!;
    const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...draft } = userItem;
    const ownId = await addGarment({ ...draft, name: 'Eigenes Teil' }, d);

    expect(await hasSampleData(d)).toBe(true);
    expect(await d.wearLogs.count()).toBe(5);

    const all = await d.garments.toArray();
    const r = generateOutfits(input(all), { count: 3 });
    expect(r.ok).toBe(true);

    await removeSampleData(d);
    expect(await hasSampleData(d)).toBe(false);
    expect((await d.garments.toArray()).map((g) => g.id)).toEqual([ownId]);
    expect(await d.wearLogs.count()).toBe(0);
    await d.delete();
  });

  it('renders valid svg markup', () => {
    const svg = garmentSvg('top', ['navy', 'weiss'], 'gestreift');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('pattern');
  });
});
