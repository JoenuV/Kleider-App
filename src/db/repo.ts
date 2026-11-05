import { BUILT_IN_ACTIVITIES, DEFAULT_SETTINGS } from '../domain/constants';
import type { Activity, Feedback, Garment, GarmentDraft, Outfit, Settings, WearLog } from '../domain/types';
import { toDateKey } from '../lib/date';
import { newId } from '../lib/id';
import { db, type KleiderDB } from './db';

// ---------- Settings ----------

export async function getSettings(d: KleiderDB = db): Promise<Settings> {
  const stored = await d.settings.get('app');
  return { ...DEFAULT_SETTINGS, ...stored, id: 'app' };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>, d: KleiderDB = db): Promise<void> {
  const current = await getSettings(d);
  await d.settings.put({ ...current, ...patch, id: 'app' });
}

// ---------- Activities ----------

/** Makes sure built-in activities exist (keeps user changes to them). */
export async function ensureBuiltIns(d: KleiderDB = db): Promise<void> {
  await d.transaction('rw', d.activities, async () => {
    for (const a of BUILT_IN_ACTIVITIES) {
      const existing = await d.activities.get(a.id);
      if (!existing) await d.activities.put(a);
    }
  });
}

export async function saveActivity(a: Activity, d: KleiderDB = db): Promise<void> {
  await d.activities.put(a);
}

export async function deleteActivity(id: string, d: KleiderDB = db): Promise<void> {
  const a = await d.activities.get(id);
  if (a && !a.builtIn) await d.activities.delete(id);
}

// ---------- Garments ----------

export async function addGarment(draft: GarmentDraft, d: KleiderDB = db): Promise<string> {
  const now = Date.now();
  const id = newId();
  await d.garments.add({ ...draft, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateGarment(id: string, patch: Partial<GarmentDraft>, d: KleiderDB = db): Promise<void> {
  await d.garments.update(id, { ...patch, updatedAt: Date.now() });
}

/** Deletes a garment. Outfits keep their history, the item simply shows as removed. */
export async function deleteGarment(id: string, d: KleiderDB = db): Promise<void> {
  await d.garments.delete(id);
}

// ---------- Outfits & wear log ----------

export async function saveOutfit(o: Omit<Outfit, 'id' | 'createdAt'>, d: KleiderDB = db): Promise<string> {
  const id = newId();
  await d.outfits.add({ ...o, id, createdAt: Date.now() });
  return id;
}

export async function rateOutfit(id: string, rating: Outfit['rating'], d: KleiderDB = db): Promise<void> {
  await d.outfits.update(id, { rating });
}

export async function deleteOutfit(id: string, d: KleiderDB = db): Promise<void> {
  await d.transaction('rw', d.outfits, d.wearLogs, async () => {
    await d.wearLogs.where('outfitId').equals(id).delete();
    await d.outfits.delete(id);
  });
}

export async function markWorn(outfitId: string, date: Date = new Date(), d: KleiderDB = db): Promise<void> {
  const outfit = await d.outfits.get(outfitId);
  if (!outfit) return;
  const key = toDateKey(date);
  const existing = await d.wearLogs.where('date').equals(key).filter((w) => w.outfitId === outfitId).first();
  if (existing) return;
  const log: WearLog = { id: newId(), date: key, outfitId, itemIds: outfit.itemIds, createdAt: Date.now() };
  await d.wearLogs.add(log);
}

export async function unmarkWorn(logId: string, d: KleiderDB = db): Promise<void> {
  await d.wearLogs.delete(logId);
}

export async function addFeedback(itemIds: string[], value: Feedback['value'], d: KleiderDB = db): Promise<void> {
  await d.feedback.add({ id: newId(), itemIds: [...itemIds].sort(), value, createdAt: Date.now() });
}

export async function getAllGarments(d: KleiderDB = db): Promise<Garment[]> {
  return d.garments.toArray();
}

/** Forgets all likes/rejections (outfit ratings stay). UI must confirm first. */
export async function clearFeedback(d: KleiderDB = db): Promise<void> {
  await d.feedback.clear();
}
