import { CATEGORY_LABEL, COLORS, OCCASION_LABEL, PATTERN_LABEL, STYLE_LABEL } from '../domain/constants';
import type { Category, ColorKey, Garment, GarmentStatus, Occasion, StyleTag } from '../domain/types';
import type { ItemWear } from './wearStats';

export type SortKey = 'neu' | 'bewertung' | 'zuletzt' | 'haeufig' | 'selten' | 'name';

export const SORT_LABEL: Record<SortKey, string> = {
  neu: 'Neueste zuerst',
  bewertung: 'Beste Bewertung',
  zuletzt: 'Zuletzt getragen',
  haeufig: 'Am meisten getragen',
  selten: 'Am längsten nicht getragen',
  name: 'Name A–Z',
};

export interface WardrobeFilter {
  query: string;
  category: Category | null;
  /** 'aktiv' = everything except aussortiert */
  status: GarmentStatus | 'aktiv' | 'alle';
  favoritesOnly: boolean;
  styles: StyleTag[];
  occasions: Occasion[];
  colors: ColorKey[];
  sort: SortKey;
}

export const EMPTY_FILTER: WardrobeFilter = {
  query: '',
  category: null,
  status: 'aktiv',
  favoritesOnly: false,
  styles: [],
  occasions: [],
  colors: [],
  sort: 'neu',
};

/** Number of filters set in the filter sheet (search & category excluded). */
export function activeFilterCount(f: WardrobeFilter): number {
  return (
    (f.status !== 'aktiv' ? 1 : 0) +
    (f.favoritesOnly ? 1 : 0) +
    f.styles.length +
    f.occasions.length +
    f.colors.length
  );
}

function haystack(g: Garment): string {
  return [
    g.name,
    g.note,
    CATEGORY_LABEL[g.category],
    PATTERN_LABEL[g.pattern],
    ...g.colors.map((c) => COLORS[c].label),
    ...g.styles.map((s) => STYLE_LABEL[s]),
    ...g.occasions.map((o) => OCCASION_LABEL[o]),
  ]
    .join(' ')
    .toLowerCase();
}

export function filterGarments(
  garments: readonly Garment[],
  f: WardrobeFilter,
  wear: Map<string, ItemWear>,
): Garment[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const out = garments.filter((g) => {
    if (f.category && g.category !== f.category) return false;
    if (f.status === 'aktiv' && g.status === 'aussortiert') return false;
    if (f.status !== 'aktiv' && f.status !== 'alle' && g.status !== f.status) return false;
    if (f.favoritesOnly && !g.favorite) return false;
    if (f.styles.length && !f.styles.some((s) => g.styles.includes(s))) return false;
    if (f.occasions.length && g.occasions.length && !f.occasions.some((o) => g.occasions.includes(o))) return false;
    if (f.colors.length && !f.colors.some((c) => g.colors.includes(c))) return false;
    if (terms.length) {
      const h = haystack(g);
      if (!terms.every((t) => h.includes(t))) return false;
    }
    return true;
  });
  const last = (g: Garment) => wear.get(g.id)?.last ?? '';
  const count = (g: Garment) => wear.get(g.id)?.count ?? 0;
  const cmp: Record<SortKey, (a: Garment, b: Garment) => number> = {
    neu: (a, b) => b.createdAt - a.createdAt,
    bewertung: (a, b) => b.rating - a.rating || Number(b.favorite) - Number(a.favorite) || b.look - a.look,
    zuletzt: (a, b) => last(b).localeCompare(last(a)),
    haeufig: (a, b) => count(b) - count(a),
    selten: (a, b) => last(a).localeCompare(last(b)),
    name: (a, b) => (a.name || CATEGORY_LABEL[a.category]).localeCompare(b.name || CATEGORY_LABEL[b.category], 'de-CH'),
  };
  return out.sort((a, b) => cmp[f.sort](a, b) || b.createdAt - a.createdAt);
}

export function garmentTitle(g: Pick<Garment, 'name' | 'category' | 'colors'>): string {
  if (g.name.trim()) return g.name.trim();
  const color = g.colors[0] ? `${COLORS[g.colors[0]].label} ` : '';
  return `${color}${CATEGORY_LABEL[g.category]}`.trim();
}
