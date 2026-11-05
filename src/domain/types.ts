// Core domain types. Pure data – no UI and no database code here.

export type Category =
  | 'top'
  | 'midlayer'
  | 'jacket'
  | 'pants'
  | 'shoes'
  | 'accessory'
  | 'headwear';

export type ColorKey =
  | 'schwarz'
  | 'weiss'
  | 'grau'
  | 'anthrazit'
  | 'beige'
  | 'braun'
  | 'navy'
  | 'blau'
  | 'hellblau'
  | 'denim'
  | 'gruen'
  | 'oliv'
  | 'gelb'
  | 'orange'
  | 'rot'
  | 'bordeaux'
  | 'rosa'
  | 'lila';

export type Pattern = 'uni' | 'gestreift' | 'kariert' | 'gepunktet' | 'gebluemt' | 'print';

export type StyleTag =
  | 'casual'
  | 'streetwear'
  | 'elegant'
  | 'sportlich'
  | 'business'
  | 'minimalistisch'
  | 'outdoor'
  | 'vintage';

export type Occasion = 'arbeit' | 'schule' | 'kollegen' | 'sport' | 'ausgang';

export type GarmentStatus = 'verfuegbar' | 'waesche' | 'ausgeliehen' | 'aussortiert';

/** 1–5 */
export type Level = 1 | 2 | 3 | 4 | 5;

export interface Garment {
  id: string;
  /** Compressed full image (JPEG/WebP/SVG for sample data). */
  photo: Blob;
  /** Small square-ish preview for grids and collages. */
  thumb: Blob;
  name: string;
  category: Category;
  colors: ColorKey[];
  pattern: Pattern;
  styles: StyleTag[];
  warmth: Level;
  rainproof: boolean;
  windproof: boolean;
  /** Delicate items (e.g. silk, white suede) – activities can exclude them. */
  delicate: boolean;
  /** Empty list = suitable for every occasion. */
  occasions: Occasion[];
  status: GarmentStatus;
  /** 0 = not rated yet. */
  rating: 0 | Level;
  comfort: Level;
  look: Level;
  note: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  /** Marks generated sample items so they can be removed in one go. */
  isSample?: boolean;
}

/** The user-facing editable part of a garment. */
export type GarmentDraft = Omit<Garment, 'id' | 'createdAt' | 'updatedAt'>;

/** Slider values, each 0..100. */
export interface Sliders {
  /** 0 = schlicht, 100 = experimentell */
  experimental: number;
  /** 0 = praktisch, 100 = Look */
  look: number;
  /** 0 = bequem, 100 = schick */
  dressy: number;
  /** 0 = farblich ruhig, 100 = farblich mutig */
  colorBold: number;
}

export interface WeatherSummary {
  /** Where the data comes from. */
  source: 'api' | 'manual';
  locationName: string;
  current: number;
  feelsLike: number;
  /** Max precipitation probability in the time window, 0..100. */
  rainChance: number;
  /** Max wind speed in the time window, km/h. */
  wind: number;
  dayMin: number;
  dayMax: number;
  /** Feels-like temperature range during the time window the user is out. */
  windowMin: number;
  windowMax: number;
  /** Hour of the coldest / warmest point in the window (0..23). */
  windowMinHour: number;
  windowMaxHour: number;
  weatherCode?: number;
  /** Which day the time window refers to (after the window ends we plan for tomorrow). */
  day?: 'heute' | 'morgen';
  /** Feels-like temperature per hour inside the window. */
  hourly?: { hour: number; temp: number; rain: number; code?: number }[];
  fetchedAt: number;
}

export interface ActivityRules {
  /** Occasion used to filter garments (hard rule). */
  occasion: Occasion | null;
  preferStyles: StyleTag[];
  avoidStyles: StyleTag[];
  avoidDelicate: boolean;
  /** Prefer rain/wind proof items even in moderate weather. */
  preferRobust: boolean;
  /** Slider defaults used when this activity is picked on the Heute screen. */
  sliders: Sliders;
  note: string;
}

export interface Activity {
  id: string;
  name: string;
  /** Built-in activities cannot be deleted. */
  builtIn: boolean;
  rules: ActivityRules;
  order: number;
}

export interface OutfitContext {
  activityId?: string;
  activityName?: string;
  sliders?: Sliders;
  weather?: WeatherSummary | null;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  createdAt: number;
  source: 'heute' | 'maker' | 'manuell';
  context: OutfitContext;
  /** 0 = not rated */
  rating: 0 | Level;
  note: string;
  reasons: string[];
}

export interface WearLog {
  id: string;
  /** Local date YYYY-MM-DD */
  date: string;
  outfitId: string;
  itemIds: string[];
  createdAt: number;
}

/** Feedback on a combination – used to learn preferences. */
export interface Feedback {
  id: string;
  itemIds: string[];
  /** -1 = abgelehnt, +1 = gefällt */
  value: -1 | 1;
  createdAt: number;
}

export interface LocationSetting {
  mode: 'manual' | 'gps';
  name: string;
  latitude: number;
  longitude: number;
}

export interface Settings {
  id: 'app';
  location: LocationSetting;
  /** Hours the user is out and about (0..24). */
  windowFrom: number;
  windowTo: number;
  theme: 'system' | 'light' | 'dark';
  lastActivityId: string;
}
