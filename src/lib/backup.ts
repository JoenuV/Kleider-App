import { db, type KleiderDB } from '../db/db';
import type { Activity, Feedback, Garment, Outfit, Settings, WearLog } from '../domain/types';
import { blobToDataUrl, dataUrlToBlob } from './blob';

export const BACKUP_APP = 'kleider-app';
export const BACKUP_VERSION = 1;

type SerializedGarment = Omit<Garment, 'photo' | 'thumb'> & { photo: string; thumb: string };

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: {
    garments: SerializedGarment[];
    outfits: Outfit[];
    wearLogs: WearLog[];
    feedback: Feedback[];
    activities: Activity[];
    settings: Settings[];
  };
}

export interface BackupStats {
  garments: number;
  outfits: number;
  wearLogs: number;
}

export async function createBackup(d: KleiderDB = db): Promise<BackupFile> {
  const [garments, outfits, wearLogs, feedback, activities, settings] = await Promise.all([
    d.garments.toArray(),
    d.outfits.toArray(),
    d.wearLogs.toArray(),
    d.feedback.toArray(),
    d.activities.toArray(),
    d.settings.toArray(),
  ]);
  const serialized: SerializedGarment[] = [];
  for (const g of garments) {
    serialized.push({ ...g, photo: await blobToDataUrl(g.photo), thumb: await blobToDataUrl(g.thumb) });
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { garments: serialized, outfits, wearLogs, feedback, activities, settings },
  };
}

export function backupFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `kleider-backup-${iso}.json`;
}

/** Validates the structure and returns a typed backup. Throws a German error message. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges Backup (kein JSON).');
  }
  if (!raw || typeof raw !== 'object') throw new Error('Die Datei ist kein gültiges Backup.');
  const obj = raw as Partial<BackupFile>;
  if (obj.app !== BACKUP_APP) throw new Error('Diese Datei stammt nicht aus der Kleider-App.');
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    throw new Error('Dieses Backup wurde mit einer neueren App-Version erstellt.');
  }
  const data = obj.data;
  if (!data || !Array.isArray(data.garments) || !Array.isArray(data.outfits)) {
    throw new Error('Das Backup ist unvollständig.');
  }
  return {
    app: BACKUP_APP,
    version: obj.version,
    exportedAt: String(obj.exportedAt ?? ''),
    data: {
      garments: data.garments,
      outfits: data.outfits,
      wearLogs: Array.isArray(data.wearLogs) ? data.wearLogs : [],
      feedback: Array.isArray(data.feedback) ? data.feedback : [],
      activities: Array.isArray(data.activities) ? data.activities : [],
      settings: Array.isArray(data.settings) ? data.settings : [],
    },
  };
}

export function backupStats(b: BackupFile): BackupStats {
  return { garments: b.data.garments.length, outfits: b.data.outfits.length, wearLogs: b.data.wearLogs.length };
}

/**
 * Restores a backup.
 * - 'replace': deletes all current data first (UI must confirm before calling).
 * - 'merge': adds/overwrites entries by id and keeps everything else.
 */
export async function restoreBackup(b: BackupFile, mode: 'replace' | 'merge', d: KleiderDB = db): Promise<void> {
  const garments: Garment[] = b.data.garments.map((g) => ({
    ...g,
    photo: dataUrlToBlob(g.photo),
    thumb: dataUrlToBlob(g.thumb),
  }));
  await d.transaction('rw', [d.garments, d.outfits, d.wearLogs, d.feedback, d.activities, d.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([
        d.garments.clear(),
        d.outfits.clear(),
        d.wearLogs.clear(),
        d.feedback.clear(),
        d.activities.clear(),
        d.settings.clear(),
      ]);
    }
    await d.garments.bulkPut(garments);
    await d.outfits.bulkPut(b.data.outfits);
    await d.wearLogs.bulkPut(b.data.wearLogs);
    await d.feedback.bulkPut(b.data.feedback);
    await d.activities.bulkPut(b.data.activities);
    if (mode === 'replace' || (await d.settings.count()) === 0) await d.settings.bulkPut(b.data.settings);
  });
}

/** Deletes everything. UI must confirm first. */
export async function wipeAll(d: KleiderDB = db): Promise<void> {
  await d.transaction('rw', [d.garments, d.outfits, d.wearLogs, d.feedback, d.activities, d.settings], async () => {
    await Promise.all([
      d.garments.clear(),
      d.outfits.clear(),
      d.wearLogs.clear(),
      d.feedback.clear(),
      d.activities.clear(),
      d.settings.clear(),
    ]);
  });
}
