import { db, type KleiderDB } from '../../db/db';
import { COLORS } from '../../domain/constants';
import type { Category, ColorKey, Garment, GarmentDraft, Outfit, Pattern, WearLog } from '../../domain/types';
import { toDateKey } from '../../lib/date';
import { newId } from '../../lib/id';

// ---------------------------------------------------------------------------
// Flat illustrations so the sample wardrobe looks like a real one.
// ---------------------------------------------------------------------------

const SHAPES: Record<Category, string> = {
  top: 'M70 40 L100 28 Q120 44 140 28 L170 40 L196 78 L170 92 L162 80 L162 196 L78 196 L78 80 L70 92 L44 78 Z',
  midlayer:
    'M72 38 L102 26 Q120 40 138 26 L168 38 L190 120 L186 186 L166 188 L162 92 L162 198 L78 198 L78 92 L74 188 L54 186 L50 120 Z',
  jacket:
    'M70 34 L104 22 L120 40 L136 22 L170 34 L194 118 L190 196 L166 198 L164 100 L164 206 L76 206 L76 100 L74 198 L50 196 L46 118 Z',
  pants: 'M78 26 L162 26 L172 210 L134 210 L122 86 L118 86 L106 210 L68 210 Z',
  shoes: 'M40 150 Q42 112 66 108 L96 104 Q116 128 150 130 L188 138 Q206 144 204 166 L204 174 L40 174 Z',
  headwear: 'M60 150 Q60 70 120 64 Q180 70 180 150 Z M54 150 L186 150 L186 172 L54 172 Z',
  accessory: 'M72 40 L168 40 L168 70 L150 70 L150 210 L118 210 L118 70 L108 70 L108 180 L76 180 L76 70 L72 70 Z',
};

const DETAILS: Partial<Record<Category, string>> = {
  jacket: '<path d="M120 40 L120 206" stroke="rgba(0,0,0,.28)" stroke-width="3"/>',
  midlayer: '<path d="M78 186 L162 186" stroke="rgba(0,0,0,.18)" stroke-width="6"/>',
  pants: '<path d="M78 40 L162 40" stroke="rgba(0,0,0,.2)" stroke-width="5"/>',
  shoes: '<path d="M40 166 L204 166" stroke="rgba(255,255,255,.75)" stroke-width="8"/>',
  headwear: '<circle cx="120" cy="58" r="10" fill="rgba(255,255,255,.65)"/>',
};

function patternDef(pattern: Pattern, base: string, accent: string): string {
  switch (pattern) {
    case 'gestreift':
      return `<pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${base}"/><rect width="16" height="6" fill="${accent}"/></pattern>`;
    case 'kariert':
      return `<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${base}"/><rect width="28" height="8" fill="${accent}" opacity=".55"/><rect width="8" height="28" fill="${accent}" opacity=".55"/></pattern>`;
    case 'gepunktet':
      return `<pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${base}"/><circle cx="9" cy="9" r="3" fill="${accent}"/></pattern>`;
    default:
      return '';
  }
}

export function garmentSvg(category: Category, colors: ColorKey[], pattern: Pattern): string {
  const base = COLORS[colors[0] ?? 'grau'].hex;
  const accent = COLORS[colors[1] ?? 'weiss'].hex;
  const def = patternDef(pattern, base, accent);
  const fill = def ? 'url(#p)' : base;
  const bg = '#ece7de';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs>${def}<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs><rect width="240" height="240" fill="${bg}"/><ellipse cx="120" cy="222" rx="80" ry="7" fill="rgba(0,0,0,.08)"/><path d="${SHAPES[category]}" fill="${fill}" stroke="rgba(0,0,0,.18)" stroke-width="2" stroke-linejoin="round"/><path d="${SHAPES[category]}" fill="url(#s)"/>${DETAILS[category] ?? ''}</svg>`;
}

// ---------------------------------------------------------------------------
// Sample wardrobe
// ---------------------------------------------------------------------------

type Seed = Pick<GarmentDraft, 'name' | 'category' | 'colors'> & Partial<GarmentDraft>;

const SAMPLES: Seed[] = [
  { name: 'Weisses T-Shirt', category: 'top', colors: ['weiss'], styles: ['casual', 'minimalistisch'], warmth: 1, rating: 4, comfort: 5, look: 3 },
  { name: 'Hellblaues Hemd', category: 'top', colors: ['hellblau'], styles: ['business', 'casual'], warmth: 2, occasions: ['arbeit', 'schule', 'ausgang', 'kollegen'], rating: 4, comfort: 3, look: 4 },
  { name: 'Ringelshirt', category: 'top', colors: ['navy', 'weiss'], pattern: 'gestreift', styles: ['casual', 'vintage'], warmth: 2, rating: 5, comfort: 4, look: 5, favorite: true },
  { name: 'Sportshirt', category: 'top', colors: ['orange'], styles: ['sportlich'], warmth: 1, occasions: ['sport'], rating: 3, comfort: 5, look: 2 },
  { name: 'Oliv T-Shirt', category: 'top', colors: ['oliv'], styles: ['casual', 'streetwear'], warmth: 1, rating: 3, comfort: 4, look: 3 },
  { name: 'Schwarzes Langarmshirt', category: 'top', colors: ['schwarz'], styles: ['minimalistisch', 'elegant'], warmth: 2, occasions: ['arbeit', 'ausgang', 'kollegen', 'schule'], rating: 4, comfort: 4, look: 4 },
  { name: 'Grauer Strickpullover', category: 'midlayer', colors: ['grau'], styles: ['casual', 'minimalistisch'], warmth: 3, rating: 4, comfort: 4, look: 4 },
  { name: 'Navy Hoodie', category: 'midlayer', colors: ['navy'], styles: ['streetwear', 'casual'], warmth: 3, occasions: ['schule', 'kollegen', 'sport'], rating: 4, comfort: 5, look: 3 },
  { name: 'Beiger Cardigan', category: 'midlayer', colors: ['beige'], styles: ['elegant', 'vintage'], warmth: 3, delicate: true, occasions: ['arbeit', 'ausgang', 'kollegen'], rating: 4, comfort: 3, look: 5 },
  { name: 'Fleecejacke', category: 'midlayer', colors: ['gruen'], styles: ['outdoor', 'sportlich'], warmth: 4, windproof: true, rating: 3, comfort: 5, look: 2 },
  { name: 'Gelbe Regenjacke', category: 'jacket', colors: ['gelb'], styles: ['outdoor', 'casual'], warmth: 2, rainproof: true, windproof: true, rating: 4, comfort: 4, look: 4 },
  { name: 'Wollmantel', category: 'jacket', colors: ['anthrazit'], styles: ['elegant', 'business'], warmth: 5, windproof: true, delicate: true, occasions: ['arbeit', 'ausgang', 'kollegen'], rating: 5, comfort: 3, look: 5, favorite: true },
  { name: 'Jeansjacke', category: 'jacket', colors: ['denim'], styles: ['casual', 'vintage', 'streetwear'], warmth: 2, rating: 4, comfort: 4, look: 4 },
  { name: 'Daunenjacke', category: 'jacket', colors: ['schwarz'], styles: ['outdoor', 'casual'], warmth: 5, windproof: true, rainproof: true, rating: 4, comfort: 5, look: 3 },
  { name: 'Blaue Jeans', category: 'pants', colors: ['denim'], styles: ['casual', 'streetwear'], warmth: 3, rating: 5, comfort: 4, look: 4, favorite: true },
  { name: 'Beige Chino', category: 'pants', colors: ['beige'], styles: ['casual', 'business'], warmth: 2, rating: 4, comfort: 4, look: 4 },
  { name: 'Schwarze Stoffhose', category: 'pants', colors: ['schwarz'], styles: ['elegant', 'business', 'minimalistisch'], warmth: 2, occasions: ['arbeit', 'ausgang'], rating: 4, comfort: 3, look: 5 },
  { name: 'Trainerhose', category: 'pants', colors: ['grau'], styles: ['sportlich'], warmth: 2, occasions: ['sport'], rating: 3, comfort: 5, look: 2 },
  { name: 'Weisse Sneaker', category: 'shoes', colors: ['weiss'], styles: ['casual', 'minimalistisch', 'streetwear'], warmth: 2, rating: 5, comfort: 4, look: 5 },
  { name: 'Braune Boots', category: 'shoes', colors: ['braun'], styles: ['casual', 'outdoor', 'vintage'], warmth: 4, rainproof: true, rating: 4, comfort: 4, look: 4 },
  { name: 'Laufschuhe', category: 'shoes', colors: ['blau'], styles: ['sportlich'], warmth: 2, occasions: ['sport'], rating: 4, comfort: 5, look: 2 },
  { name: 'Lederschuhe', category: 'shoes', colors: ['schwarz'], styles: ['elegant', 'business'], warmth: 2, delicate: true, occasions: ['arbeit', 'ausgang'], rating: 4, comfort: 3, look: 5 },
  { name: 'Rote Mütze', category: 'headwear', colors: ['rot'], styles: ['casual', 'streetwear'], warmth: 4, rating: 4, comfort: 4, look: 4 },
  { name: 'Karierter Schal', category: 'accessory', colors: ['bordeaux', 'navy'], pattern: 'kariert', styles: ['vintage', 'elegant'], warmth: 3, rating: 4, comfort: 4, look: 4 },
];

function toGarment(s: Seed, now: number, i: number): Garment {
  const svg = garmentSvg(s.category, s.colors, s.pattern ?? 'uni');
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return {
    id: newId(),
    photo: blob,
    thumb: blob,
    pattern: 'uni',
    styles: [],
    warmth: 2,
    rainproof: false,
    windproof: false,
    delicate: false,
    occasions: [],
    status: 'verfuegbar',
    rating: 0,
    comfort: 3,
    look: 3,
    note: '',
    favorite: false,
    ...s,
    createdAt: now - (SAMPLES.length - i) * 60_000,
    updatedAt: now,
    isSample: true,
  };
}

export async function hasSampleData(d: KleiderDB = db): Promise<boolean> {
  return (await d.garments.filter((g) => !!g.isSample).count()) > 0;
}

/** Adds the sample wardrobe plus a short wear history. */
export async function loadSampleData(d: KleiderDB = db): Promise<number> {
  const now = Date.now();
  const garments = SAMPLES.map((s, i) => toGarment(s, now, i));
  const byName = new Map(garments.map((g) => [g.name, g.id]));
  const ids = (...names: string[]) => names.map((n) => byName.get(n)!).filter(Boolean);

  const history: { daysAgo: number; items: string[]; rating: Outfit['rating']; activity: string }[] = [
    { daysAgo: 1, items: ids('Hellblaues Hemd', 'Grauer Strickpullover', 'Wollmantel', 'Schwarze Stoffhose', 'Lederschuhe'), rating: 5, activity: 'Arbeit' },
    { daysAgo: 2, items: ids('Ringelshirt', 'Jeansjacke', 'Blaue Jeans', 'Weisse Sneaker'), rating: 4, activity: 'Mit Kollegen' },
    { daysAgo: 4, items: ids('Sportshirt', 'Fleecejacke', 'Trainerhose', 'Laufschuhe'), rating: 3, activity: 'Sport' },
    { daysAgo: 6, items: ids('Weisses T-Shirt', 'Navy Hoodie', 'Gelbe Regenjacke', 'Blaue Jeans', 'Braune Boots'), rating: 4, activity: 'Schule' },
    { daysAgo: 9, items: ids('Schwarzes Langarmshirt', 'Beiger Cardigan', 'Beige Chino', 'Weisse Sneaker'), rating: 0, activity: 'Ausgang' },
  ];
  const outfits: Outfit[] = [];
  const logs: WearLog[] = [];
  for (const h of history) {
    const date = new Date(now - h.daysAgo * 86_400_000);
    const outfit: Outfit = {
      id: newId(),
      itemIds: h.items,
      createdAt: date.getTime(),
      source: 'heute',
      context: { activityName: h.activity },
      rating: h.rating,
      note: '',
      reasons: [],
    };
    outfits.push(outfit);
    logs.push({ id: newId(), date: toDateKey(date), outfitId: outfit.id, itemIds: h.items, createdAt: date.getTime() });
  }

  await d.transaction('rw', d.garments, d.outfits, d.wearLogs, async () => {
    await d.garments.bulkAdd(garments);
    await d.outfits.bulkAdd(outfits);
    await d.wearLogs.bulkAdd(logs);
  });
  return garments.length;
}

/** Removes sample garments and outfits that consist only of sample garments. */
export async function removeSampleData(d: KleiderDB = db): Promise<void> {
  await d.transaction('rw', d.garments, d.outfits, d.wearLogs, async () => {
    const sampleIds = new Set((await d.garments.filter((g) => !!g.isSample).toArray()).map((g) => g.id));
    const outfits = await d.outfits.filter((o) => o.itemIds.length > 0 && o.itemIds.every((id) => sampleIds.has(id))).toArray();
    const outfitIds = outfits.map((o) => o.id);
    await d.wearLogs.where('outfitId').anyOf(outfitIds).delete();
    await d.outfits.bulkDelete(outfitIds);
    await d.garments.bulkDelete([...sampleIds]);
  });
}
