import Dexie, { type EntityTable } from 'dexie';
import type { Activity, Feedback, Garment, Outfit, Settings, WearLog } from '../domain/types';

export class KleiderDB extends Dexie {
  garments!: EntityTable<Garment, 'id'>;
  outfits!: EntityTable<Outfit, 'id'>;
  wearLogs!: EntityTable<WearLog, 'id'>;
  feedback!: EntityTable<Feedback, 'id'>;
  activities!: EntityTable<Activity, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'kleider-app') {
    super(name);
    this.version(1).stores({
      garments: 'id, category, status, favorite, rating, createdAt, updatedAt',
      outfits: 'id, createdAt, rating',
      wearLogs: 'id, date, outfitId, *itemIds',
      feedback: 'id, createdAt',
      activities: 'id, order',
      settings: 'id',
    });
  }
}

export const db = new KleiderDB();

export const ALL_TABLES = ['garments', 'outfits', 'wearLogs', 'feedback', 'activities', 'settings'] as const;
export type TableName = (typeof ALL_TABLES)[number];
