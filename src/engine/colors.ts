import { COLORS } from '../domain/constants';
import type { Garment } from '../domain/types';

export type ColorScheme = 'neutral' | 'tonal' | 'analog' | 'komplementaer' | 'triade' | 'kontrast' | 'bunt';

export interface ColorResult {
  /** 0..1 */
  score: number;
  scheme: ColorScheme;
  /** 0..1 – how colourful the outfit is. */
  boldness: number;
  patterned: number;
  accentLabels: string[];
}

function hueDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 0..1 how well two accent hues go together. */
export function hueRelation(a: number, b: number): { value: number; kind: ColorScheme } {
  const d = hueDiff(a, b);
  if (d <= 30) return { value: 1, kind: 'tonal' };
  if (d <= 60) return { value: 0.85, kind: 'analog' };
  if (d >= 150) return { value: 0.8, kind: 'komplementaer' };
  if (d >= 105 && d <= 135) return { value: 0.6, kind: 'triade' };
  return { value: 0.35, kind: 'kontrast' };
}

/**
 * Colour harmony of a set of garments.
 * @param bold 0..1 (farblich ruhig ↔ mutig)
 * @param experimental 0..1 – relaxes the harmony rules
 */
export function colorHarmony(items: readonly Pick<Garment, 'colors' | 'pattern'>[], bold: number, experimental: number): ColorResult {
  const accents: { hue: number; weight: number; intensity: number; label: string }[] = [];
  for (const it of items) {
    it.colors.forEach((c, i) => {
      const info = COLORS[c];
      if (!info.neutral && info.hue !== null) {
        accents.push({ hue: info.hue, weight: i === 0 ? 1 : 0.5, intensity: info.intensity, label: info.label });
      }
    });
  }

  // Group accents into hue families (within 30°).
  const families: { hue: number; weight: number }[] = [];
  for (const a of accents) {
    const fam = families.find((f) => hueDiff(f.hue, a.hue) <= 30);
    if (fam) fam.weight += a.weight;
    else families.push({ hue: a.hue, weight: a.weight });
  }

  let harmony = 1;
  let scheme: ColorScheme = 'neutral';
  if (families.length === 1) scheme = 'tonal';
  if (families.length >= 2) {
    let sum = 0;
    let n = 0;
    const kinds = new Map<ColorScheme, number>();
    for (let i = 0; i < families.length; i++) {
      for (let j = i + 1; j < families.length; j++) {
        const r = hueRelation(families[i]!.hue, families[j]!.hue);
        sum += r.value;
        n++;
        kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
      }
    }
    harmony = sum / n;
    scheme = families.length >= 4 ? 'bunt' : ([...kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'kontrast');
    // Too many colour families get messy – unless the user wants it bold/experimental.
    const allowed = 2 + Math.round(bold * 1.5 + experimental);
    if (families.length > allowed) harmony -= 0.18 * (families.length - allowed);
  }

  const boldness = Math.min(1, accents.reduce((s, a) => s + a.intensity * a.weight, 0) / 1.6);
  const boldFit = 1 - Math.abs(boldness - bold);

  const patterned = items.filter((i) => i.pattern !== 'uni').length;
  let patternPenalty = 0;
  if (patterned === 2) patternPenalty = 0.35 * (1 - experimental * 0.7);
  if (patterned >= 3) patternPenalty = 0.7 * (1 - experimental * 0.5);

  const harmonyW = 0.62 - 0.25 * experimental;
  const raw = harmonyW * harmony + (1 - harmonyW) * boldFit - patternPenalty;
  return {
    score: Math.max(0, Math.min(1, raw)),
    scheme,
    boldness,
    patterned,
    accentLabels: [...new Set(accents.map((a) => a.label))],
  };
}
