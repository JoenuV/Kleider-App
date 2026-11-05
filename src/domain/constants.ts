import type {
  Activity,
  Category,
  ColorKey,
  GarmentStatus,
  Occasion,
  Pattern,
  Settings,
  Sliders,
  StyleTag,
} from './types';

export const CATEGORIES: readonly Category[] = [
  'top',
  'midlayer',
  'jacket',
  'pants',
  'shoes',
  'accessory',
  'headwear',
];

export const CATEGORY_LABEL: Record<Category, string> = {
  top: 'Oberteil',
  midlayer: 'Pullover/Midlayer',
  jacket: 'Jacke',
  pants: 'Hose',
  shoes: 'Schuhe',
  accessory: 'Accessoire',
  headwear: 'Kopfbedeckung',
};

export const CATEGORY_LABEL_PLURAL: Record<Category, string> = {
  top: 'Oberteile',
  midlayer: 'Pullover/Midlayer',
  jacket: 'Jacken',
  pants: 'Hosen',
  shoes: 'Schuhe',
  accessory: 'Accessoires',
  headwear: 'Kopfbedeckungen',
};

export interface ColorInfo {
  label: string;
  hex: string;
  /** Hue in degrees, null for neutrals. */
  hue: number | null;
  neutral: boolean;
  /** 0..1 – how loud the colour is. */
  intensity: number;
}

export const COLORS: Record<ColorKey, ColorInfo> = {
  schwarz: { label: 'Schwarz', hex: '#1b1b1b', hue: null, neutral: true, intensity: 0 },
  anthrazit: { label: 'Anthrazit', hex: '#45474b', hue: null, neutral: true, intensity: 0 },
  grau: { label: 'Grau', hex: '#9a9a98', hue: null, neutral: true, intensity: 0 },
  weiss: { label: 'Weiss', hex: '#f7f6f2', hue: null, neutral: true, intensity: 0 },
  beige: { label: 'Beige', hex: '#d9c7a7', hue: null, neutral: true, intensity: 0.1 },
  braun: { label: 'Braun', hex: '#7a5235', hue: 28, neutral: true, intensity: 0.2 },
  navy: { label: 'Navy', hex: '#1f2c4c', hue: null, neutral: true, intensity: 0.1 },
  denim: { label: 'Denim', hex: '#4a6a93', hue: null, neutral: true, intensity: 0.1 },
  blau: { label: 'Blau', hex: '#2f63c9', hue: 220, neutral: false, intensity: 0.8 },
  hellblau: { label: 'Hellblau', hex: '#9cc3e6', hue: 205, neutral: false, intensity: 0.4 },
  gruen: { label: 'Grün', hex: '#2f8a4e', hue: 140, neutral: false, intensity: 0.8 },
  oliv: { label: 'Oliv', hex: '#6b6b3a', hue: 60, neutral: false, intensity: 0.35 },
  gelb: { label: 'Gelb', hex: '#efc531', hue: 48, neutral: false, intensity: 0.9 },
  orange: { label: 'Orange', hex: '#e57a2e', hue: 25, neutral: false, intensity: 0.9 },
  rot: { label: 'Rot', hex: '#c8312f', hue: 2, neutral: false, intensity: 1 },
  bordeaux: { label: 'Bordeaux', hex: '#6d1f2f', hue: 345, neutral: false, intensity: 0.5 },
  rosa: { label: 'Rosa', hex: '#eaa7b8', hue: 345, neutral: false, intensity: 0.5 },
  lila: { label: 'Lila', hex: '#7b4fa8', hue: 275, neutral: false, intensity: 0.75 },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const PATTERNS: readonly Pattern[] = ['uni', 'gestreift', 'kariert', 'gepunktet', 'gebluemt', 'print'];

export const PATTERN_LABEL: Record<Pattern, string> = {
  uni: 'Uni',
  gestreift: 'Gestreift',
  kariert: 'Kariert',
  gepunktet: 'Gepunktet',
  gebluemt: 'Geblümt',
  print: 'Print/Grafik',
};

export const STYLES: readonly StyleTag[] = [
  'casual',
  'streetwear',
  'elegant',
  'sportlich',
  'business',
  'minimalistisch',
  'outdoor',
  'vintage',
];

export const STYLE_LABEL: Record<StyleTag, string> = {
  casual: 'Casual',
  streetwear: 'Streetwear',
  elegant: 'Elegant',
  sportlich: 'Sportlich',
  business: 'Business',
  minimalistisch: 'Minimalistisch',
  outdoor: 'Outdoor',
  vintage: 'Vintage',
};

/**
 * How each style sits on the slider axes (0..1).
 * dressy: bequem (0) ↔ schick (1)
 * bold:   schlicht (0) ↔ experimentell (1)
 * practical: Look (0) ↔ praktisch (1)
 */
export const STYLE_PROFILE: Record<StyleTag, { dressy: number; bold: number; practical: number }> = {
  casual: { dressy: 0.3, bold: 0.3, practical: 0.6 },
  streetwear: { dressy: 0.25, bold: 0.75, practical: 0.4 },
  elegant: { dressy: 0.95, bold: 0.35, practical: 0.15 },
  sportlich: { dressy: 0.05, bold: 0.35, practical: 0.95 },
  business: { dressy: 0.8, bold: 0.1, practical: 0.4 },
  minimalistisch: { dressy: 0.55, bold: 0.05, practical: 0.6 },
  outdoor: { dressy: 0.1, bold: 0.2, practical: 1 },
  vintage: { dressy: 0.5, bold: 0.8, practical: 0.3 },
};

export const OCCASIONS: readonly Occasion[] = ['arbeit', 'schule', 'kollegen', 'sport', 'ausgang'];

export const OCCASION_LABEL: Record<Occasion, string> = {
  arbeit: 'Arbeit',
  schule: 'Schule',
  kollegen: 'Freizeit mit Kollegen',
  sport: 'Sport',
  ausgang: 'Ausgang',
};

export const STATUSES: readonly GarmentStatus[] = ['verfuegbar', 'waesche', 'ausgeliehen', 'aussortiert'];

export const STATUS_LABEL: Record<GarmentStatus, string> = {
  verfuegbar: 'Verfügbar',
  waesche: 'In der Wäsche',
  ausgeliehen: 'Ausgeliehen',
  aussortiert: 'Aussortiert',
};

export const WARMTH_LABEL: Record<number, string> = {
  1: 'Sehr leicht',
  2: 'Leicht',
  3: 'Mittel',
  4: 'Warm',
  5: 'Sehr warm',
};

export const DEFAULT_SLIDERS: Sliders = { experimental: 30, look: 50, dressy: 40, colorBold: 35 };

const s = (experimental: number, look: number, dressy: number, colorBold: number): Sliders => ({
  experimental,
  look,
  dressy,
  colorBold,
});

export const BUILT_IN_ACTIVITIES: Activity[] = [
  {
    id: 'arbeit',
    name: 'Arbeit',
    builtIn: true,
    order: 0,
    rules: {
      occasion: 'arbeit',
      preferStyles: [],
      avoidStyles: [],
      avoidDelicate: false,
      preferRobust: false,
      sliders: s(15, 50, 60, 25),
      note: '',
    },
  },
  {
    id: 'schule',
    name: 'Schule',
    builtIn: true,
    order: 1,
    rules: {
      occasion: 'schule',
      preferStyles: [],
      avoidStyles: [],
      avoidDelicate: false,
      preferRobust: false,
      sliders: s(30, 45, 30, 35),
      note: '',
    },
  },
  {
    id: 'kollegen',
    name: 'Mit Kollegen',
    builtIn: true,
    order: 2,
    rules: {
      occasion: 'kollegen',
      preferStyles: [],
      avoidStyles: [],
      avoidDelicate: false,
      preferRobust: false,
      sliders: s(45, 60, 35, 50),
      note: '',
    },
  },
  {
    id: 'sport',
    name: 'Sport',
    builtIn: true,
    order: 3,
    rules: {
      occasion: 'sport',
      preferStyles: ['sportlich'],
      avoidStyles: ['elegant', 'business'],
      avoidDelicate: true,
      preferRobust: false,
      sliders: s(20, 10, 0, 40),
      note: '',
    },
  },
  {
    id: 'ausgang',
    name: 'Ausgang',
    builtIn: true,
    order: 4,
    rules: {
      occasion: 'ausgang',
      preferStyles: [],
      avoidStyles: ['sportlich', 'outdoor'],
      avoidDelicate: false,
      preferRobust: false,
      sliders: s(55, 85, 75, 55),
      note: '',
    },
  },
];

/** Bern, Bundesplatz */
export const DEFAULT_LOCATION = { mode: 'manual' as const, name: 'Bern', latitude: 46.948, longitude: 7.4474 };

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  location: DEFAULT_LOCATION,
  windowFrom: 7,
  windowTo: 19,
  theme: 'system',
  lastActivityId: 'arbeit',
};

/** Categories every outfit needs. */
export const REQUIRED_CATEGORIES: readonly Category[] = ['top', 'pants', 'shoes'];
