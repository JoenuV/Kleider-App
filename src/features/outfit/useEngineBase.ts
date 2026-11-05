import { useMemo } from 'react';
import type { ActivityRules, Garment, Sliders, WeatherSummary } from '../../domain/types';
import { buildPreferences, type EngineInput } from '../../engine';
import { useFeedbackList, useGarments, useOutfits, useWearStats } from '../../hooks/useData';
import { toDateKey } from '../../lib/date';

/** Everything the engine needs that comes from the database. */
export function useEngineBase() {
  const garments = useGarments();
  const wear = useWearStats();
  const feedback = useFeedbackList();
  const outfits = useOutfits();
  const prefs = useMemo(() => buildPreferences(feedback ?? [], outfits ?? []), [feedback, outfits]);
  const ready = !!garments && !!feedback && !!outfits;
  return { garments: garments ?? [], wear, prefs, ready };
}

export function makeInput(
  base: ReturnType<typeof useEngineBase>,
  p: {
    rules: ActivityRules;
    activityName: string;
    sliders: Sliders;
    weather: WeatherSummary | null;
    locked?: EngineInput['locked'];
    excludedIds?: string[];
    seed?: number;
    garments?: readonly Garment[];
  },
): EngineInput {
  return {
    garments: p.garments ?? base.garments,
    wear: base.wear,
    prefs: base.prefs,
    today: toDateKey(),
    weather: p.weather,
    rules: p.rules,
    activityName: p.activityName,
    sliders: p.sliders,
    locked: p.locked,
    excludedIds: p.excludedIds,
    seed: p.seed,
  };
}
