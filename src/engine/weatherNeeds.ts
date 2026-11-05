import type { WeatherSummary } from '../domain/types';

export type LayerNeed = 'required' | 'optional' | 'avoid';

export interface WeatherNeeds {
  /** false when weather is ignored – no warmth scoring at all. */
  active: boolean;
  midlayer: LayerNeed;
  jacket: LayerNeed;
  /** Warm headwear makes sense. */
  headwear: 'recommended' | 'optional';
  /** Target warmth sum of top + midlayer + jacket at the coldest time. */
  upperTarget: number;
  /** Target warmth of the base (top + midlayer) at the warmest time. */
  baseTargetWarm: number;
  /** Target warmth for trousers and shoes (1..5). */
  lowerTarget: number;
  rain: boolean;
  /** Rain is possible but not likely. */
  rainMaybe: boolean;
  windy: boolean;
  /** Big temperature swing during the day → removable layers. */
  swing: boolean;
  cold: number;
  warm: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Warmth sum of all upper-body layers that feels right at a given (felt) temperature. */
export function upperTargetFor(temp: number): number {
  return clamp(1.5 + (24 - temp) * 0.45, 1, 14);
}

export function lowerTargetFor(temp: number): number {
  return clamp(1 + (24 - temp) / 7, 1, 5);
}

export const NO_WEATHER: WeatherNeeds = {
  active: false,
  midlayer: 'optional',
  jacket: 'optional',
  headwear: 'optional',
  upperTarget: 0,
  baseTargetWarm: 0,
  lowerTarget: 0,
  rain: false,
  rainMaybe: false,
  windy: false,
  swing: false,
  cold: 18,
  warm: 18,
};

export function weatherNeeds(w: WeatherSummary | null | undefined): WeatherNeeds {
  if (!w) return NO_WEATHER;
  const cold = w.windowMin;
  const warm = Math.max(w.windowMax, cold);
  const rain = w.rainChance >= 50;
  const rainMaybe = !rain && w.rainChance >= 30;
  const windy = w.wind >= 30;

  let jacket: LayerNeed = 'optional';
  if (cold < 13 || rain || (windy && cold < 18)) jacket = 'required';
  else if (cold >= 21 && !rainMaybe && !windy) jacket = 'avoid';

  let midlayer: LayerNeed = 'optional';
  if (cold < 8) midlayer = 'required';
  else if (cold >= 20) midlayer = 'avoid';

  return {
    active: true,
    midlayer,
    jacket,
    headwear: cold < 4 ? 'recommended' : 'optional',
    upperTarget: upperTargetFor(cold),
    baseTargetWarm: upperTargetFor(warm),
    lowerTarget: lowerTargetFor((2 * cold + warm) / 3),
    rain,
    rainMaybe,
    windy,
    swing: warm - cold >= 7,
    cold,
    warm,
  };
}
