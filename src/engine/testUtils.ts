import { BUILT_IN_ACTIVITIES, DEFAULT_SLIDERS } from '../domain/constants';
import type { ActivityRules, Garment, WeatherSummary } from '../domain/types';
import { EMPTY_PREFS } from './learning';
import type { EngineInput } from './types';

let n = 0;
export function garment(p: Partial<Garment> & Pick<Garment, 'category'>): Garment {
  n++;
  return {
    id: p.id ?? `g${n}`,
    photo: new Blob(),
    thumb: new Blob(),
    name: '',
    colors: ['schwarz'],
    pattern: 'uni',
    styles: ['casual'],
    warmth: 2,
    rainproof: false,
    windproof: false,
    delicate: false,
    occasions: [],
    status: 'verfuegbar',
    rating: 3,
    comfort: 3,
    look: 3,
    note: '',
    favorite: false,
    createdAt: 0,
    updatedAt: 0,
    ...p,
  };
}

export function weather(p: Partial<WeatherSummary> & { min: number; max?: number }): WeatherSummary {
  const max = p.max ?? p.min;
  return {
    source: 'manual',
    locationName: 'Bern',
    current: p.min,
    feelsLike: p.min,
    rainChance: 0,
    wind: 5,
    dayMin: p.min,
    dayMax: max,
    windowMin: p.min,
    windowMax: max,
    windowMinHour: 7,
    windowMaxHour: 15,
    fetchedAt: 0,
    ...p,
  };
}

export const rulesFor = (id: string): ActivityRules => BUILT_IN_ACTIVITIES.find((a) => a.id === id)!.rules;

export function input(garments: Garment[], p: Partial<EngineInput> = {}): EngineInput {
  return {
    garments,
    weather: null,
    rules: rulesFor('kollegen'),
    activityName: 'Mit Kollegen',
    sliders: DEFAULT_SLIDERS,
    wear: new Map(),
    prefs: EMPTY_PREFS,
    today: '2026-11-05',
    seed: 42,
    ...p,
  };
}

/** A small but complete wardrobe. */
export function basicWardrobe(): Garment[] {
  return [
    garment({ id: 'tee-white', category: 'top', colors: ['weiss'], warmth: 1 }),
    garment({ id: 'shirt-blue', category: 'top', colors: ['hellblau'], warmth: 2, styles: ['business', 'casual'] }),
    garment({ id: 'knit-grey', category: 'midlayer', colors: ['grau'], warmth: 3 }),
    garment({ id: 'fleece', category: 'midlayer', colors: ['gruen'], warmth: 4, styles: ['outdoor'] }),
    garment({ id: 'parka', category: 'jacket', colors: ['oliv'], warmth: 5, rainproof: true, windproof: true }),
    garment({ id: 'blazer', category: 'jacket', colors: ['navy'], warmth: 2, styles: ['elegant', 'business'] }),
    garment({ id: 'jeans', category: 'pants', colors: ['denim'], warmth: 3 }),
    garment({ id: 'chino', category: 'pants', colors: ['beige'], warmth: 2 }),
    garment({ id: 'sneaker', category: 'shoes', colors: ['weiss'], warmth: 2 }),
    garment({ id: 'boots', category: 'shoes', colors: ['braun'], warmth: 4, rainproof: true }),
  ];
}
