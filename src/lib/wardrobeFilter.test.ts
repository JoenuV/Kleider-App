import { describe, expect, it } from 'vitest';
import type { Garment } from '../domain/types';
import { EMPTY_FILTER, filterGarments, garmentTitle } from './wardrobeFilter';
import { computeWearStats } from './wearStats';

const g = (id: string, p: Partial<Garment>): Garment => ({
  id,
  photo: new Blob(),
  thumb: new Blob(),
  name: '',
  category: 'top',
  colors: [],
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
  createdAt: Number(id),
  updatedAt: 0,
  ...p,
});

const items = [
  g('1', { name: 'Leinenhemd', colors: ['weiss'], rating: 3 }),
  g('2', { category: 'pants', colors: ['denim'], rating: 5 }),
  g('3', { name: 'Alter Pulli', category: 'midlayer', status: 'aussortiert' }),
  g('4', { name: 'Regenjacke', category: 'jacket', styles: ['outdoor'], favorite: true, rating: 4 }),
];

describe('wardrobe filter', () => {
  const wear = computeWearStats([
    { id: 'a', date: '2026-11-01', outfitId: 'o', itemIds: ['1', '2'], createdAt: 0 },
    { id: 'b', date: '2026-11-03', outfitId: 'o', itemIds: ['2'], createdAt: 0 },
  ]);

  it('hides sorted-out items by default', () => {
    expect(filterGarments(items, EMPTY_FILTER, wear).map((x) => x.id)).toEqual(['4', '2', '1']);
  });

  it('searches names, colours and categories', () => {
    expect(filterGarments(items, { ...EMPTY_FILTER, query: 'weiss' }, wear).map((x) => x.id)).toEqual(['1']);
    expect(filterGarments(items, { ...EMPTY_FILTER, query: 'hose' }, wear).map((x) => x.id)).toEqual(['2']);
  });

  it('sorts by rating and by last worn', () => {
    expect(filterGarments(items, { ...EMPTY_FILTER, sort: 'bewertung' }, wear)[0]?.id).toBe('2');
    expect(filterGarments(items, { ...EMPTY_FILTER, sort: 'zuletzt' }, wear).map((x) => x.id)).toEqual(['2', '1', '4']);
  });

  it('filters favourites and styles', () => {
    expect(filterGarments(items, { ...EMPTY_FILTER, favoritesOnly: true }, wear).map((x) => x.id)).toEqual(['4']);
    expect(filterGarments(items, { ...EMPTY_FILTER, styles: ['outdoor'] }, wear).map((x) => x.id)).toEqual(['4']);
  });

  it('builds a readable title', () => {
    expect(garmentTitle(items[1]!)).toBe('Denim Hose');
    expect(wear.get('2')).toEqual({ count: 2, last: '2026-11-03' });
  });
});
