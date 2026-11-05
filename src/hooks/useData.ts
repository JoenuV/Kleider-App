import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../db/db';
import type { Activity, Feedback, Garment, Outfit, WearLog } from '../domain/types';
import { computeWearStats, type ItemWear } from '../lib/wearStats';

export function useGarments(): Garment[] | undefined {
  return useLiveQuery(() => db.garments.toArray(), []);
}

export function useGarmentMap(): Map<string, Garment> | undefined {
  const all = useGarments();
  return useMemo(() => (all ? new Map(all.map((g) => [g.id, g])) : undefined), [all]);
}

export function useWearLogs(): WearLog[] | undefined {
  return useLiveQuery(() => db.wearLogs.toArray(), []);
}

export function useWearStats(): Map<string, ItemWear> {
  const logs = useWearLogs();
  return useMemo(() => computeWearStats(logs ?? []), [logs]);
}

export function useOutfits(): Outfit[] | undefined {
  return useLiveQuery(() => db.outfits.orderBy('createdAt').reverse().toArray(), []);
}

export function useFeedbackList(): Feedback[] | undefined {
  return useLiveQuery(() => db.feedback.toArray(), []);
}

export function useActivities(): Activity[] | undefined {
  return useLiveQuery(() => db.activities.orderBy('order').toArray(), []);
}
