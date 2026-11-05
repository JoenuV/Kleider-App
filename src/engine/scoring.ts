import { STYLE_PROFILE } from '../domain/constants';
import type { ActivityRules, Category, Garment, Sliders } from '../domain/types';
import { daysBetween } from '../lib/date';
import type { ItemWear } from '../lib/wearStats';
import { colorHarmony, type ColorResult } from './colors';
import { learnedScore, type Preferences } from './learning';
import type { ScoreBreakdown } from './types';
import type { WeatherNeeds } from './weatherNeeds';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const UPPER: readonly Category[] = ['top', 'midlayer', 'jacket'];

export interface ScoreContext {
  needs: WeatherNeeds;
  sliders: Sliders;
  rules: ActivityRules;
  wear: Map<string, ItemWear>;
  prefs: Preferences;
  today: string;
}

/** Normalised slider values 0..1. */
export function sliderTargets(s: Sliders) {
  return {
    experimental: s.experimental / 100,
    lookW: s.look / 100,
    dressy: s.dressy / 100,
    practical: 1 - s.look / 100,
    bold: s.colorBold / 100,
  };
}

/** Personal quality of a single garment, weighted by the Praktisch↔Look slider. */
export function itemQuality(g: Garment, s: Sliders): number {
  const { lookW } = sliderTargets(s);
  const rating = g.rating || 3;
  const feel = ((1 - lookW) * g.comfort + lookW * g.look) / 5;
  return clamp01(0.45 * (rating / 5) + 0.55 * feel + (g.favorite ? 0.08 : 0));
}

function styleProfile(g: Garment) {
  if (!g.styles.length) return null;
  const sum = { dressy: 0, bold: 0, practical: 0 };
  for (const s of g.styles) {
    const p = STYLE_PROFILE[s];
    sum.dressy += p.dressy;
    sum.bold += p.bold;
    sum.practical += p.practical;
  }
  const n = g.styles.length;
  return { dressy: sum.dressy / n, bold: sum.bold / n, practical: sum.practical / n };
}

/** How well one garment matches the sliders (0..1). Untagged items are neutral. */
export function itemStyleFit(g: Garment, s: Sliders): number {
  const p = styleProfile(g);
  if (!p) return 0.65;
  const t = sliderTargets(s);
  const err = Math.abs(p.dressy - t.dressy) * 0.5 + Math.abs(p.practical - t.practical) * 0.25 + Math.abs(p.bold - t.experimental) * 0.25;
  return clamp01(1 - err * 1.4);
}

export function styleScore(items: readonly Garment[], s: Sliders): { score: number; coherence: number; shared: string[] } {
  const t = sliderTargets(s);
  const fit = items.reduce((sum, g) => sum + itemStyleFit(g, s), 0) / Math.max(1, items.length);
  const tagged = items.filter((g) => g.styles.length > 0);
  let coherence = 1;
  if (tagged.length >= 2) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < tagged.length; i++) {
      for (let j = i + 1; j < tagged.length; j++) {
        const a = tagged[i]!;
        const b = tagged[j]!;
        if (a.styles.some((x) => b.styles.includes(x))) sum += 1;
        else sum += 1 - Math.abs((styleProfile(a)?.dressy ?? 0.4) - (styleProfile(b)?.dressy ?? 0.4)) * 1.3;
        n++;
      }
    }
    coherence = clamp01(sum / n);
  }
  // Experimental relaxes the need for a coherent style.
  const cohW = 0.45 * (1 - 0.65 * t.experimental);
  const counts = new Map<string, number>();
  for (const g of tagged) for (const st of g.styles) counts.set(st, (counts.get(st) ?? 0) + 1);
  const shared = [...counts.entries()].filter(([, c]) => c >= Math.max(2, Math.ceil(items.length * 0.6))).map(([k]) => k);
  return { score: clamp01((1 - cohW) * fit + cohW * coherence), coherence, shared };
}

export function warmthScore(items: Partial<Record<Category, Garment>>, needs: WeatherNeeds): number {
  if (!needs.active) return 1;
  const upper = UPPER.reduce((s, c) => s + (items[c]?.warmth ?? 0), 0);
  const base = (items.top?.warmth ?? 0) + (items.midlayer?.warmth ?? 0);
  const coldErr = upper - needs.upperTarget;
  // Being too cold is worse than being a bit too warm in the morning.
  const coldPenalty = coldErr < 0 ? -coldErr * 0.26 : coldErr * 0.16;
  // The base layers must not be too warm at the warmest time (jacket comes off).
  const overheat = Math.max(0, base - needs.baseTargetWarm - 1) * 0.16;
  const pants = items.pants ? Math.abs(items.pants.warmth - needs.lowerTarget) : 0;
  const shoes = items.shoes ? Math.abs(items.shoes.warmth - needs.lowerTarget) : 0;
  let head = 0;
  if (items.headwear && items.headwear.warmth >= 3 && needs.cold > 12) head = 0.15;
  if (needs.headwear === 'recommended' && items.headwear && items.headwear.warmth >= 3) head = -0.08;
  return clamp01(1 - coldPenalty - overheat - pants * 0.1 - shoes * 0.05 - head);
}

export function weatherScore(items: Partial<Record<Category, Garment>>, needs: WeatherNeeds): number {
  if (!needs.active) return 1;
  const checks: number[] = [];
  if (needs.rain || needs.rainMaybe) {
    const w = needs.rain ? 1 : 0.5;
    if (items.jacket) checks.push(items.jacket.rainproof ? 1 : 1 - w);
    if (items.shoes) checks.push(items.shoes.rainproof ? 1 : 1 - w * 0.6);
    const delicate = Object.values(items).filter((g) => g?.delicate).length;
    checks.push(delicate ? 1 - Math.min(1, delicate * 0.5 * w) : 1);
  }
  if (needs.windy && items.jacket) checks.push(items.jacket.windproof ? 1 : 0.4);
  if (!checks.length) return 1;
  return checks.reduce((a, b) => a + b, 0) / checks.length;
}

/** Recently worn items lose points; with "experimental" rarely worn items gain some. */
export function itemVariety(g: Garment, ctx: Pick<ScoreContext, 'wear' | 'today' | 'sliders'>): number {
  const w = ctx.wear.get(g.id);
  const exp = ctx.sliders.experimental / 100;
  let penalty = 0;
  if (w?.last) {
    const d = daysBetween(w.last, ctx.today);
    if (d <= 0) penalty = 1;
    else penalty = 0.75 * Math.exp(-(d - 1) / 3);
  }
  const rarity = 1 / (1 + (w?.count ?? 0));
  return clamp01(1 - penalty * 0.9 + exp * 0.35 * rarity);
}

export function activityScore(items: readonly Garment[], rules: ActivityRules): number {
  if (!items.length) return 0.6;
  // Average per garment so every single piece counts.
  const per = items.map((g) => {
    let v = 0.7;
    if (rules.preferStyles.length) v = g.styles.some((s) => rules.preferStyles.includes(s)) ? 1 : 0.3;
    if (rules.avoidStyles.length && g.styles.some((s) => rules.avoidStyles.includes(s))) v -= 0.35;
    if (rules.preferRobust) v += !g.delicate && (g.comfort >= 4 || g.rainproof || g.windproof) ? 0.15 : -0.2;
    return clamp01(v);
  });
  return per.reduce((a, b) => a + b, 0) / per.length;
}

export const WEIGHTS = {
  warmth: 3,
  weather: 1.2,
  color: 2,
  style: 2,
  rating: 1.6,
  variety: 1.2,
  learned: 1.5,
  activity: 2.5,
} satisfies Record<keyof ScoreBreakdown, number>;

export interface FullScore {
  total: number;
  breakdown: ScoreBreakdown;
  color: ColorResult;
  styleShared: string[];
}

export function scoreOutfit(items: Partial<Record<Category, Garment>>, ctx: ScoreContext): FullScore {
  const list = Object.values(items).filter((g): g is Garment => !!g);
  const t = sliderTargets(ctx.sliders);
  const color = colorHarmony(list, t.bold, t.experimental);
  const style = styleScore(list, ctx.sliders);
  const breakdown: ScoreBreakdown = {
    warmth: warmthScore(items, ctx.needs),
    weather: weatherScore(items, ctx.needs),
    color: color.score,
    style: style.score,
    rating: list.reduce((s, g) => s + itemQuality(g, ctx.sliders), 0) / Math.max(1, list.length),
    variety: list.reduce((s, g) => s + itemVariety(g, ctx), 0) / Math.max(1, list.length),
    learned: learnedScore(
      list.map((g) => g.id),
      ctx.prefs,
    ),
    activity: activityScore(list, ctx.rules),
  };
  let sum = 0;
  let wsum = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof ScoreBreakdown)[]) {
    const w = (k === 'warmth' || k === 'weather') && !ctx.needs.active ? 0 : WEIGHTS[k];
    sum += breakdown[k] * w;
    wsum += w;
  }
  return { total: sum / wsum, breakdown, color, styleShared: style.shared };
}
