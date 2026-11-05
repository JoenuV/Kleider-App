import { describe, expect, it } from 'vitest';
import { colorHarmony, hueRelation } from './colors';
import { alternativesFor, evaluateOutfit, generateOutfits } from './generate';
import { buildPreferences, learnedScore } from './learning';
import { createRng } from './rng';
import { itemQuality, warmthScore } from './scoring';
import { basicWardrobe, garment, input, rulesFor, weather } from './testUtils';
import type { Suggestion } from './types';
import { weatherNeeds } from './weatherNeeds';

function ok(result: ReturnType<typeof generateOutfits>): Suggestion[] {
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join(' / '));
  return result.suggestions;
}

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('weather needs', () => {
  it('requires jacket and midlayer when cold', () => {
    const n = weatherNeeds(weather({ min: 3 }));
    expect(n.jacket).toBe('required');
    expect(n.midlayer).toBe('required');
    expect(n.headwear).toBe('recommended');
  });

  it('avoids layers on a hot day', () => {
    const n = weatherNeeds(weather({ min: 23, max: 29 }));
    expect(n.jacket).toBe('avoid');
    expect(n.midlayer).toBe('avoid');
  });

  it('requires a jacket for rain even when mild', () => {
    expect(weatherNeeds(weather({ min: 18, max: 22, rainChance: 70 })).jacket).toBe('required');
  });

  it('detects a temperature swing', () => {
    const n = weatherNeeds(weather({ min: 6, max: 17 }));
    expect(n.swing).toBe(true);
    expect(n.upperTarget).toBeGreaterThan(n.baseTargetWarm);
  });

  it('is inactive without weather', () => {
    expect(weatherNeeds(null).active).toBe(false);
  });
});

describe('colour harmony', () => {
  const item = (colors: Parameters<typeof garment>[0]['colors'], pattern: 'uni' | 'kariert' = 'uni') => ({
    colors: colors!,
    pattern,
  });

  it('classifies hue relations', () => {
    expect(hueRelation(220, 205).kind).toBe('tonal');
    expect(hueRelation(25, 220).kind).toBe('komplementaer');
  });

  it('rates neutrals as harmonious and calm', () => {
    const r = colorHarmony([item(['schwarz']), item(['weiss']), item(['grau'])], 0.2, 0.2);
    expect(r.scheme).toBe('neutral');
    expect(r.score).toBeGreaterThan(0.8);
  });

  it('prefers complementary over clashing colours', () => {
    const comp = colorHarmony([item(['orange']), item(['blau']), item(['weiss'])], 0.6, 0.3);
    const clash = colorHarmony([item(['rot']), item(['gruen']), item(['lila']), item(['gelb'])], 0.6, 0.3);
    expect(comp.scheme).toBe('komplementaer');
    expect(comp.score).toBeGreaterThan(clash.score);
  });

  it('penalises too many patterns unless experimental', () => {
    const outfit = [item(['grau'], 'kariert'), item(['navy'], 'kariert'), item(['schwarz'])];
    const calm = colorHarmony(outfit, 0.3, 0);
    const wild = colorHarmony(outfit, 0.3, 1);
    expect(calm.patterned).toBe(2);
    expect(wild.score).toBeGreaterThan(calm.score);
  });

  it('bold slider favours colourful outfits', () => {
    const colourful = [item(['rot']), item(['blau']), item(['weiss'])];
    expect(colorHarmony(colourful, 1, 0.3).score).toBeGreaterThan(colorHarmony(colourful, 0, 0.3).score);
  });
});

describe('hard rules', () => {
  it('only uses available garments', () => {
    const w = basicWardrobe().map((g) => (g.id === 'jeans' ? { ...g, status: 'waesche' as const } : g));
    for (let seed = 1; seed < 15; seed++) {
      const [s] = ok(generateOutfits(input(w, { seed })));
      expect(s!.itemIds).not.toContain('jeans');
    }
  });

  it('always returns complete outfits', () => {
    for (let seed = 1; seed < 20; seed++) {
      const [s] = ok(generateOutfits(input(basicWardrobe(), { seed })));
      expect(s!.items.top).toBeDefined();
      expect(s!.items.pants).toBeDefined();
      expect(s!.items.shoes).toBeDefined();
    }
  });

  it('adds jacket and midlayer when the weather needs them', () => {
    for (let seed = 1; seed < 10; seed++) {
      const [s] = ok(generateOutfits(input(basicWardrobe(), { seed, weather: weather({ min: 2, max: 6 }) })));
      expect(s!.items.jacket).toBeDefined();
      expect(s!.items.midlayer).toBeDefined();
    }
  });

  it('leaves the jacket at home on a hot day', () => {
    const [s] = ok(generateOutfits(input(basicWardrobe(), { weather: weather({ min: 24, max: 30 }) })));
    expect(s!.items.jacket).toBeUndefined();
    expect(s!.items.midlayer).toBeUndefined();
  });

  it('respects the occasion', () => {
    const w = [
      ...basicWardrobe(),
      garment({ id: 'gym-tee', category: 'top', occasions: ['sport'], styles: ['sportlich'] }),
    ];
    const work = { ...rulesFor('arbeit') };
    for (let seed = 1; seed < 15; seed++) {
      const [s] = ok(generateOutfits(input(w, { seed, rules: work, activityName: 'Arbeit' })));
      expect(s!.itemIds).not.toContain('gym-tee');
    }
  });

  it('respects custom activity rules (no delicate items)', () => {
    const w = basicWardrobe().map((g) => (g.id === 'tee-white' ? { ...g, delicate: true } : g));
    const rules = { ...rulesFor('arbeit'), avoidDelicate: true };
    for (let seed = 1; seed < 15; seed++) {
      const [s] = ok(generateOutfits(input(w, { seed, rules })));
      expect(s!.itemIds).not.toContain('tee-white');
    }
  });

  it('honours locked and excluded items', () => {
    for (let seed = 1; seed < 10; seed++) {
      const [s] = ok(
        generateOutfits(input(basicWardrobe(), { seed, locked: { pants: 'chino' }, excludedIds: ['sneaker'] })),
      );
      expect(s!.items.pants?.id).toBe('chino');
      expect(s!.items.shoes?.id).toBe('boots');
    }
  });
});

describe('problems', () => {
  it('reports a missing category clearly', () => {
    const w = basicWardrobe().filter((g) => g.category !== 'shoes');
    const r = generateOutfits(input(w));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.problems).toHaveLength(1);
      expect(r.problems[0]!.kind).toBe('keine');
      expect(r.problems[0]!.message).toContain('Schuhe');
    }
  });

  it('explains when everything is in the laundry', () => {
    const w = basicWardrobe().map((g) => (g.category === 'pants' ? { ...g, status: 'waesche' as const } : g));
    const r = generateOutfits(input(w));
    expect(!r.ok && r.problems[0]!.kind).toBe('nicht-verfuegbar');
  });

  it('explains when nothing fits the occasion', () => {
    const w = basicWardrobe().map((g) => (g.category === 'top' ? { ...g, occasions: ['sport' as const] } : g));
    const r = generateOutfits(input(w, { rules: rulesFor('arbeit'), activityName: 'Arbeit' }));
    expect(!r.ok && r.problems[0]!.message).toMatch(/Anlass «Arbeit»/);
  });

  it('names the weather reason when a jacket is missing', () => {
    const w = basicWardrobe().filter((g) => g.category !== 'jacket');
    const r = generateOutfits(input(w, { weather: weather({ min: 2 }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.find((p) => p.category === 'jacket')?.message).toMatch(/2° braucht es eine Jacke/);
  });

  it('returns fewer suggestions with a note when the wardrobe is tiny', () => {
    const w = [
      garment({ category: 'top' }),
      garment({ category: 'pants' }),
      garment({ category: 'shoes' }),
    ];
    const r = generateOutfits(input(w, { sliders: { experimental: 0, look: 50, dressy: 40, colorBold: 30 } }), { count: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.suggestions.length).toBeLessThan(3);
      expect(r.notes[0]).toMatch(/möglich/);
    }
  });
});

describe('scoring', () => {
  it('weights comfort vs look by the slider', () => {
    const comfy = garment({ category: 'top', comfort: 5, look: 1 });
    const practical = { experimental: 0, look: 0, dressy: 50, colorBold: 50 };
    const looks = { ...practical, look: 100 };
    expect(itemQuality(comfy, practical)).toBeGreaterThan(itemQuality(comfy, looks));
  });

  it('warmth score prefers proper layers in the cold', () => {
    const w = basicWardrobe();
    const byId = (id: string) => w.find((g) => g.id === id)!;
    const needs = weatherNeeds(weather({ min: 3 }));
    const warm = warmthScore({ top: byId('tee-white'), midlayer: byId('fleece'), jacket: byId('parka') }, needs);
    const thin = warmthScore({ top: byId('tee-white'), midlayer: byId('knit-grey'), jacket: byId('blazer') }, needs);
    expect(warm).toBeGreaterThan(thin);
  });

  it('suggests a removable layer on a cool morning / warm afternoon', () => {
    const s = ok(generateOutfits(input(basicWardrobe(), { weather: weather({ min: 7, max: 18 }) })))[0]!;
    expect(s.items.jacket).toBeDefined();
    expect(s.reasons[0]).toMatch(/ausziehen/);
  });

  it('prefers matching style for "schick"', () => {
    const w = [
      ...basicWardrobe(),
      garment({ id: 'suit-pants', category: 'pants', colors: ['anthrazit'], styles: ['elegant', 'business'], warmth: 2 }),
      garment({ id: 'derby', category: 'shoes', colors: ['schwarz'], styles: ['elegant', 'business'], warmth: 2 }),
    ];
    const chic = { experimental: 0, look: 90, dressy: 100, colorBold: 20 };
    let elegantPicks = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const [s] = ok(generateOutfits(input(w, { seed, sliders: chic, rules: rulesFor('ausgang'), activityName: 'Ausgang' })));
      if (s!.items.pants?.id === 'suit-pants') elegantPicks++;
    }
    expect(elegantPicks).toBeGreaterThanOrEqual(7);
  });

  it('avoids items worn yesterday', () => {
    const wear = new Map([['jeans', { count: 5, last: '2026-11-04' }]]);
    let jeans = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const [s] = ok(generateOutfits(input(basicWardrobe(), { seed, wear })));
      if (s!.itemIds.includes('jeans')) jeans++;
    }
    expect(jeans).toBeLessThanOrEqual(3);
  });

  it('varies between seeds but is stable for one seed', () => {
    const a = ok(generateOutfits(input(basicWardrobe(), { seed: 1 })))[0]!.itemIds;
    const b = ok(generateOutfits(input(basicWardrobe(), { seed: 1 })))[0]!.itemIds;
    expect(a).toEqual(b);
    const variants = new Set<string>();
    for (let seed = 1; seed <= 15; seed++) variants.add(ok(generateOutfits(input(basicWardrobe(), { seed })))[0]!.itemIds.join());
    expect(variants.size).toBeGreaterThan(1);
  });

  it('gives three distinct suggestions', () => {
    const s = ok(generateOutfits(input(basicWardrobe()), { count: 3 }));
    expect(s).toHaveLength(3);
    expect(new Set(s.map((x) => [...x.itemIds].sort().join())).size).toBe(3);
  });

  it('avoids the combination that was just shown', () => {
    const first = ok(generateOutfits(input(basicWardrobe(), { seed: 3 })))[0]!;
    const next = ok(generateOutfits(input(basicWardrobe(), { seed: 3 }), { avoid: [first.itemIds] }))[0]!;
    expect([...next.itemIds].sort()).not.toEqual([...first.itemIds].sort());
  });
});

describe('learning', () => {
  it('rejected combinations score low, liked ones high', () => {
    const prefs = buildPreferences(
      [
        { id: 'f1', itemIds: ['a', 'b', 'c'], value: -1, createdAt: Date.now() },
        { id: 'f2', itemIds: ['x', 'y'], value: 1, createdAt: Date.now() },
      ],
      [],
    );
    expect(learnedScore(['a', 'b', 'c'], prefs)).toBe(0);
    expect(learnedScore(['a', 'b', 'z'], prefs)).toBeLessThan(0.5);
    expect(learnedScore(['x', 'y', 'z'], prefs)).toBeGreaterThan(0.5);
  });

  it('rated outfits influence future suggestions', () => {
    const w = basicWardrobe();
    // The user hated jeans + sneaker, loved chino + boots.
    const prefs = buildPreferences(
      [],
      [
        { itemIds: ['jeans', 'sneaker', 'tee-white'], rating: 1, createdAt: Date.now() },
        { itemIds: ['jeans', 'sneaker', 'shirt-blue'], rating: 1, createdAt: Date.now() },
        { itemIds: ['chino', 'boots', 'tee-white'], rating: 5, createdAt: Date.now() },
      ],
    );
    let jeansSneaker = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const [s] = ok(generateOutfits(input(w, { seed, prefs })));
      if (s!.itemIds.includes('jeans') && s!.itemIds.includes('sneaker')) jeansSneaker++;
    }
    expect(jeansSneaker).toBeLessThanOrEqual(2);
  });

  it('older feedback counts less', () => {
    const now = Date.now();
    const fresh = buildPreferences([{ id: '1', itemIds: ['a', 'b'], value: 1, createdAt: now }], [], now);
    const old = buildPreferences([{ id: '1', itemIds: ['a', 'b'], value: 1, createdAt: now - 365 * 86_400_000 }], [], now);
    expect(learnedScore(['a', 'b'], fresh)).toBeGreaterThan(learnedScore(['a', 'b'], old));
  });
});

describe('swap & evaluate', () => {
  it('ranks alternatives for a slot and offers "none" for optional slots', () => {
    const inp = input(basicWardrobe(), { weather: weather({ min: 16, max: 20 }) });
    const s = ok(generateOutfits(inp))[0]!;
    const alts = alternativesFor(s.items, 'midlayer', inp);
    expect(alts.length).toBe(3);
    expect(alts.some((a) => a.garment === null)).toBe(true);
    const shoes = alternativesFor(s.items, 'shoes', inp);
    expect(shoes.every((a) => a.garment !== null)).toBe(true);
    expect(shoes[0]!.score).toBeGreaterThanOrEqual(shoes[1]!.score);
  });

  it('re-evaluates a manually changed outfit with reasons', () => {
    const w = basicWardrobe();
    const byId = (id: string) => w.find((g) => g.id === id)!;
    const s = evaluateOutfit({ top: byId('tee-white'), pants: byId('jeans'), shoes: byId('sneaker') }, input(w));
    expect(s.score).toBeGreaterThan(0);
    expect(s.reasons.length).toBeGreaterThan(0);
  });
});

describe('warnings', () => {
  it('does not claim "too cold" on a hot day', () => {
    const w = basicWardrobe();
    const byId = (id: string) => w.find((g) => g.id === id)!;
    const s = evaluateOutfit(
      { top: byId('shirt-blue'), pants: byId('jeans'), shoes: byId('boots') },
      input(w, { weather: weather({ min: 22, max: 28 }) }),
    );
    expect(s.warnings.join(' ')).not.toMatch(/knapp/);
  });

  it('warns when an outfit is too thin for the cold', () => {
    const w = basicWardrobe();
    const byId = (id: string) => w.find((g) => g.id === id)!;
    const s = evaluateOutfit(
      { top: byId('tee-white'), jacket: byId('blazer'), pants: byId('chino'), shoes: byId('sneaker') },
      input(w, { weather: weather({ min: 1 }) }),
    );
    expect(s.warnings.join(' ')).toMatch(/knapp/);
  });
});
