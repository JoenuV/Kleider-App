import { CATEGORY_LABEL, CATEGORY_LABEL_PLURAL, OCCASION_LABEL } from '../domain/constants';
import type { ActivityRules, Category, Garment } from '../domain/types';
import { explain } from './explain';
import { setKey } from './learning';
import { createRng, randomSeed, weightedIndex, type Rng } from './rng';
import { itemQuality, itemStyleFit, itemVariety, scoreOutfit, type ScoreContext } from './scoring';
import type { EngineInput, EngineResult, Outfitting, Problem, Suggestion } from './types';
import { weatherNeeds, type WeatherNeeds } from './weatherNeeds';

export const SLOT_ORDER: readonly Category[] = ['headwear', 'jacket', 'midlayer', 'top', 'pants', 'shoes', 'accessory'];
const BASE_REQUIRED: readonly Category[] = ['top', 'pants', 'shoes'];

// ---------------------------------------------------------------------------
// Hard rules
// ---------------------------------------------------------------------------

export function fitsOccasion(g: Garment, rules: ActivityRules): boolean {
  return !rules.occasion || g.occasions.length === 0 || g.occasions.includes(rules.occasion);
}

/** An item is excluded by the activity rules if it is delicate (when forbidden)
 *  or if *all* of its style tags are on the avoid list. */
export function violatesRules(g: Garment, rules: ActivityRules): boolean {
  if (rules.avoidDelicate && g.delicate) return true;
  if (rules.avoidStyles.length && g.styles.length && g.styles.every((s) => rules.avoidStyles.includes(s))) return true;
  return false;
}

export function isEligible(g: Garment, input: Pick<EngineInput, 'rules' | 'excludedIds'>): boolean {
  return (
    g.status === 'verfuegbar' &&
    fitsOccasion(g, input.rules) &&
    !violatesRules(g, input.rules) &&
    !(input.excludedIds ?? []).includes(g.id)
  );
}

export function eligiblePools(input: EngineInput): Map<Category, Garment[]> {
  const pools = new Map<Category, Garment[]>();
  for (const g of input.garments) {
    const lockedId = input.locked?.[g.category];
    // A locked garment is always used for its slot (if it is available).
    if (lockedId) {
      if (g.id === lockedId && g.status === 'verfuegbar') pools.set(g.category, [g]);
      continue;
    }
    if (!isEligible(g, input)) continue;
    const arr = pools.get(g.category) ?? [];
    arr.push(g);
    pools.set(g.category, arr);
  }
  return pools;
}

export function requiredCategories(needs: WeatherNeeds): Category[] {
  const req = [...BASE_REQUIRED];
  if (needs.midlayer === 'required') req.push('midlayer');
  if (needs.jacket === 'required') req.push('jacket');
  return req;
}

function weatherWhy(c: Category, needs: WeatherNeeds): string {
  const t = Math.round(needs.cold);
  if (c === 'jacket') {
    if (needs.rain) return 'Weil Regen erwartet wird, braucht es eine Jacke';
    if (needs.windy && needs.cold >= 13) return 'Weil es windig ist, braucht es eine Jacke';
    return `Bei gefühlt ${t}° braucht es eine Jacke`;
  }
  return `Bei gefühlt ${t}° braucht es einen Pullover oder Midlayer`;
}

/** Explains precisely why a required category has no usable garment. */
export function diagnose(c: Category, input: EngineInput, needs: WeatherNeeds): Problem {
  const all = input.garments.filter((g) => g.category === c);
  const plural = CATEGORY_LABEL_PLURAL[c];
  const lead = c === 'jacket' || c === 'midlayer' ? `${weatherWhy(c, needs)}, aber ` : '';
  const cap = (s: string) => (lead ? s : s[0]!.toUpperCase() + s.slice(1));
  if (all.length === 0) {
    return {
      category: c,
      kind: 'keine',
      message: lead
        ? `${lead}du hast noch keine ${plural} erfasst.`
        : `Du hast noch keine ${plural} erfasst. Füge mindestens ein Teil der Kategorie «${CATEGORY_LABEL[c]}» hinzu.`,
    };
  }
  const available = all.filter((g) => g.status === 'verfuegbar');
  if (!available.length) {
    return {
      category: c,
      kind: 'nicht-verfuegbar',
      message: `${lead}${cap(`alle deine ${plural} sind gerade nicht verfügbar (Wäsche, ausgeliehen oder aussortiert).`)}`,
    };
  }
  const occasion = available.filter((g) => fitsOccasion(g, input.rules));
  if (!occasion.length) {
    const occ = input.rules.occasion ? OCCASION_LABEL[input.rules.occasion] : input.activityName;
    return {
      category: c,
      kind: 'anlass',
      message: `${lead}${cap(`keine verfügbaren ${plural} passen zum Anlass «${occ}». Markiere passende Teile für diesen Anlass.`)}`,
    };
  }
  const rules = occasion.filter((g) => !violatesRules(g, input.rules));
  if (!rules.length) {
    return {
      category: c,
      kind: 'regeln',
      message: `${lead}${cap(`keine ${plural} erfüllen die Regeln von «${input.activityName}» (z. B. keine empfindlichen Teile oder unpassender Stil).`)}`,
    };
  }
  return {
    category: c,
    kind: 'ausgeschlossen',
    message: `${lead}${cap(`alle passenden ${plural} sind ausgeschlossen.`)}`,
  };
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

function inclusionChance(c: Category, needs: WeatherNeeds, experimental: number): number {
  switch (c) {
    case 'midlayer':
      if (needs.midlayer === 'avoid') return 0;
      return needs.active ? (needs.cold < 16 ? 0.6 : 0.35) : 0.3;
    case 'jacket':
      if (needs.jacket === 'avoid') return 0;
      return needs.active ? 0.5 : 0.25;
    case 'headwear':
      if (needs.headwear === 'recommended') return 0.85;
      return needs.active && needs.warm >= 22 ? 0.08 : 0.15 + experimental * 0.15;
    case 'accessory':
      return 0.3 + experimental * 0.25;
    default:
      return 1;
  }
}

function itemPrescore(g: Garment, ctx: ScoreContext): number {
  let warmthFit = 1;
  if (ctx.needs.active && (g.category === 'pants' || g.category === 'shoes')) {
    warmthFit = 1 - Math.abs(g.warmth - ctx.needs.lowerTarget) / 4;
  }
  if (ctx.needs.active && g.category === 'top') {
    warmthFit = 1 - Math.max(0, g.warmth - ctx.needs.baseTargetWarm) / 4;
  }
  return 0.4 * itemQuality(g, ctx.sliders) + 0.25 * itemVariety(g, ctx) + 0.2 * itemStyleFit(g, ctx.sliders) + 0.15 * warmthFit;
}

interface Prepared {
  ctx: ScoreContext;
  needs: WeatherNeeds;
  pools: Map<Category, Garment[]>;
  weights: Map<Category, number[]>;
  required: Category[];
}

function prepare(input: EngineInput): Prepared | { problems: Problem[]; needs: WeatherNeeds } {
  const needs = weatherNeeds(input.weather);
  const ctx: ScoreContext = {
    needs,
    sliders: input.sliders,
    rules: input.rules,
    wear: input.wear,
    prefs: input.prefs,
    today: input.today,
  };
  const pools = eligiblePools(input);
  const required = requiredCategories(needs);
  const problems = required.filter((c) => !pools.get(c)?.length).map((c) => diagnose(c, input, needs));
  if (problems.length) return { problems, needs };

  const exp = input.sliders.experimental / 100;
  // Higher temperature = flatter distribution = more surprising picks.
  const temperature = 0.08 + 0.3 * exp;
  const weights = new Map<Category, number[]>();
  for (const [c, pool] of pools) {
    weights.set(
      c,
      pool.map((g) => Math.exp(itemPrescore(g, ctx) / temperature)),
    );
  }
  return { ctx, needs, pools, weights, required };
}

function sampleOutfit(p: Prepared, input: EngineInput, rng: Rng): Outfitting {
  const exp = input.sliders.experimental / 100;
  const out: Outfitting = {};
  for (const c of SLOT_ORDER) {
    const pool = p.pools.get(c);
    if (!pool?.length) continue;
    const locked = !!input.locked?.[c];
    if (!locked && !p.required.includes(c) && rng() >= inclusionChance(c, p.needs, exp)) continue;
    out[c] = pool[weightedIndex(p.weights.get(c) ?? [], rng)];
  }
  return out;
}

function idsOf(o: Outfitting): string[] {
  return SLOT_ORDER.map((c) => o[c]?.id).filter((x): x is string => !!x);
}

function buildSuggestion(items: Outfitting, p: Prepared, input: EngineInput, bonus = 0): Suggestion {
  const score = scoreOutfit(items, p.ctx);
  const { reasons, warnings } = explain({
    items,
    score,
    needs: p.needs,
    weather: input.weather,
    sliders: input.sliders,
    activityName: input.activityName,
    wear: input.wear,
    today: input.today,
  });
  return { items, itemIds: idsOf(items), score: score.total + bonus, breakdown: score.breakdown, reasons, warnings };
}

function overlap(a: readonly string[], b: readonly string[]): number {
  const shared = a.filter((x) => b.includes(x)).length;
  return shared / Math.max(a.length, b.length, 1);
}

export interface GenerateOptions {
  count?: number;
  /** Combinations that should not come again (e.g. the one just shown). */
  avoid?: readonly string[][];
  samples?: number;
}

/**
 * Builds outfit suggestions. Deterministic for a given seed.
 * Returns clear problems when a required category cannot be filled.
 */
export function generateOutfits(input: EngineInput, opts: GenerateOptions = {}): EngineResult {
  const p = prepare(input);
  if ('problems' in p) return { ok: false, problems: p.problems, needs: p.needs };

  const count = opts.count ?? 1;
  const rng = createRng(input.seed ?? randomSeed());
  const exp = input.sliders.experimental / 100;
  const avoid = new Set((opts.avoid ?? []).map(setKey));
  const seen = new Map<string, { items: Outfitting; score: number }>();
  const samples = opts.samples ?? 320;

  for (let i = 0; i < samples; i++) {
    const items = sampleOutfit(p, input, rng);
    const key = setKey(idsOf(items));
    if (seen.has(key) || avoid.has(key)) continue;
    const s = scoreOutfit(items, p.ctx).total;
    // A little noise so equally good outfits rotate.
    seen.set(key, { items, score: s + (rng() - 0.5) * 0.03 * (1 + 2 * exp) });
  }

  const ranked = [...seen.values()].sort((a, b) => b.score - a.score);
  const picks: { items: Outfitting; score: number; ids: string[] }[] = [];
  const lambda = 0.22;
  while (picks.length < count && ranked.length) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < Math.min(ranked.length, 200); i++) {
      const cand = ranked[i]!;
      const ids = idsOf(cand.items);
      const maxOv = picks.reduce((m, pk) => Math.max(m, overlap(ids, pk.ids)), 0);
      if (maxOv >= 1) continue;
      const val = cand.score - lambda * maxOv;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    const [chosen] = ranked.splice(bestIdx, 1);
    picks.push({ ...chosen!, ids: idsOf(chosen!.items) });
  }

  const notes: string[] = [];
  if (picks.length < count) {
    notes.push(
      picks.length === 0
        ? 'Es gibt keine neue Kombination mehr – füge mehr Kleider hinzu oder ändere die Einstellungen.'
        : `Nur ${picks.length} ${picks.length === 1 ? 'Vorschlag' : 'Vorschläge'} möglich – mit mehr passenden Kleidern wird es abwechslungsreicher.`,
    );
  }
  if (!picks.length) return { ok: true, suggestions: [], needs: p.needs, notes };
  return {
    ok: true,
    suggestions: picks.map((pk) => buildSuggestion(pk.items, p, input)),
    needs: p.needs,
    notes,
  };
}

/** Re-scores a manually changed outfit (e.g. after swapping one item). */
export function evaluateOutfit(items: Outfitting, input: EngineInput): Suggestion {
  const needs = weatherNeeds(input.weather);
  const p: Prepared = {
    ctx: { needs, sliders: input.sliders, rules: input.rules, wear: input.wear, prefs: input.prefs, today: input.today },
    needs,
    pools: new Map(),
    weights: new Map(),
    required: requiredCategories(needs),
  };
  return buildSuggestion(items, p, input);
}

export interface Alternative {
  garment: Garment | null;
  score: number;
}

/**
 * Ranked alternatives for one slot of an outfit (best first).
 * For optional slots `garment: null` ("ohne") is offered too.
 */
export function alternativesFor(current: Outfitting, category: Category, input: EngineInput): Alternative[] {
  const needs = weatherNeeds(input.weather);
  const ctx: ScoreContext = { needs, sliders: input.sliders, rules: input.rules, wear: input.wear, prefs: input.prefs, today: input.today };
  const options: Alternative[] = input.garments
    .filter((g) => g.category === category && isEligible(g, input))
    .map((g) => ({ garment: g, score: scoreOutfit({ ...current, [category]: g }, ctx).total }));
  if (!requiredCategories(needs).includes(category)) {
    const without = { ...current };
    delete without[category];
    options.push({ garment: null, score: scoreOutfit(without, ctx).total });
  }
  return options.sort((a, b) => b.score - a.score);
}
