import type { ActivityRules, Category, Garment, Sliders, WeatherSummary } from '../domain/types';
import type { ItemWear } from '../lib/wearStats';
import type { Preferences } from './learning';
import type { WeatherNeeds } from './weatherNeeds';

export interface EngineInput {
  garments: readonly Garment[];
  /** null = ignore weather */
  weather: WeatherSummary | null;
  rules: ActivityRules;
  activityName: string;
  sliders: Sliders;
  wear: Map<string, ItemWear>;
  prefs: Preferences;
  /** Today as YYYY-MM-DD (for variety). */
  today: string;
  /** Garments fixed by the user, one per category. */
  locked?: Partial<Record<Category, string>>;
  excludedIds?: readonly string[];
  seed?: number;
}

export type Outfitting = Partial<Record<Category, Garment>>;

export interface ScoreBreakdown {
  warmth: number;
  weather: number;
  color: number;
  style: number;
  rating: number;
  variety: number;
  learned: number;
  activity: number;
}

export interface Suggestion {
  items: Outfitting;
  itemIds: string[];
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  warnings: string[];
}

export interface Problem {
  category: Category;
  kind: 'keine' | 'nicht-verfuegbar' | 'anlass' | 'regeln' | 'ausgeschlossen';
  message: string;
}

export type EngineResult =
  | { ok: true; suggestions: Suggestion[]; needs: WeatherNeeds; notes: string[] }
  | { ok: false; problems: Problem[]; needs: WeatherNeeds };
