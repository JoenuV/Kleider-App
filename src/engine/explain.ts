import { STYLE_LABEL } from '../domain/constants';
import type { Category, Garment, Sliders, StyleTag, WeatherSummary } from '../domain/types';
import { daysBetween } from '../lib/date';
import type { ItemWear } from '../lib/wearStats';
import { garmentTitle } from '../lib/wardrobeFilter';
import { UPPER, type FullScore } from './scoring';
import type { WeatherNeeds } from './weatherNeeds';

const r = (n: number) => Math.round(n);

function hourLabel(h: number | undefined): string | null {
  if (h === undefined) return null;
  if (h < 11) return 'morgens';
  if (h < 14) return 'mittags';
  if (h < 18) return 'nachmittags';
  return 'abends';
}

export interface ExplainInput {
  items: Partial<Record<Category, Garment>>;
  score: FullScore;
  needs: WeatherNeeds;
  weather: WeatherSummary | null;
  sliders: Sliders;
  activityName: string;
  wear: Map<string, ItemWear>;
  today: string;
}

export function explain(x: ExplainInput): { reasons: string[]; warnings: string[] } {
  const { items, score, needs, weather } = x;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const list = Object.values(items).filter((g): g is Garment => !!g);

  // --- Weather ---
  if (needs.active) {
    const cold = r(needs.cold);
    const warm = r(needs.warm);
    const range = cold === warm ? `${cold}°` : `${cold}–${warm}°`;
    if (needs.swing && (items.jacket || items.midlayer)) {
      const coldWhen = hourLabel(weather?.windowMinHour) ?? 'am Anfang';
      const warmWhen = hourLabel(weather?.windowMaxHour) ?? 'später';
      const under = items.jacket ? (items.midlayer ? 'der Pullover' : 'das Oberteil') : 'das Oberteil';
      const outer = items.jacket ? 'Jacke' : 'Pullover';
      reasons.push(
        `${coldWhen[0]!.toUpperCase()}${coldWhen.slice(1)} gefühlt ${cold}°, ${warmWhen} bis ${warm}°: ` +
          `Die ${outer} kannst du ausziehen, dann reicht ${under}.`,
      );
    } else if (items.jacket && items.midlayer) {
      reasons.push(`Gefühlt ${range}: Pullover und Jacke halten dich warm.`);
    } else if (items.jacket) {
      reasons.push(`Gefühlt ${range}: Mit der Jacke bist du gut angezogen.`);
    } else if (items.midlayer) {
      reasons.push(`Bei gefühlt ${range} reicht ein Pullover über dem Oberteil.`);
    } else {
      reasons.push(`Angenehm (${range}) – leichte Teile ohne Jacke.`);
    }
    if (needs.rain) {
      if (items.jacket?.rainproof) reasons.push(`Regen ist wahrscheinlich (${r(weather?.rainChance ?? 0)} %) – die Jacke ist regenfest.`);
      else warnings.push('Regen ist wahrscheinlich, aber die Jacke ist nicht regenfest – nimm einen Schirm mit.');
    } else if (needs.rainMaybe && !items.jacket?.rainproof) {
      warnings.push(`Vielleicht Regen (${r(weather?.rainChance ?? 0)} %) – ein Schirm schadet nicht.`);
    }
    if (needs.windy && items.jacket?.windproof) reasons.push(`Windig (${r(weather?.wind ?? 0)} km/h) – die Jacke hält den Wind ab.`);
    if (needs.headwear === 'recommended' && items.headwear) reasons.push('Dazu eine Kopfbedeckung, weil es richtig kalt ist.');
    if (score.breakdown.warmth < 0.6) {
      const upper = UPPER.reduce((s, c) => s + (items[c]?.warmth ?? 0), 0);
      const base = (items.top?.warmth ?? 0) + (items.midlayer?.warmth ?? 0);
      const lowerTooWarm = [items.pants, items.shoes].some((g) => g && g.warmth - needs.lowerTarget >= 2);
      const lowerTooCold = [items.pants, items.shoes].some((g) => g && needs.lowerTarget - g.warmth >= 2);
      if (upper < needs.upperTarget - 1.5) {
        warnings.push(`Für gefühlt ${cold}° ist das eher knapp – zieh lieber eine wärmere Schicht an.`);
      } else if (upper > needs.upperTarget + 2.5 || base > needs.baseTargetWarm + 2) {
        warnings.push(`Für bis zu ${warm}° bist du oben herum eher warm angezogen.`);
      } else if (lowerTooWarm) {
        warnings.push(`Hose oder Schuhe sind für ${warm}° eher warm.`);
      } else if (lowerTooCold) {
        warnings.push(`Hose oder Schuhe sind für gefühlt ${cold}° eher dünn.`);
      }
    }
  }

  // --- Colours ---
  const c = score.color;
  const [a, b] = c.accentLabels;
  switch (c.scheme) {
    case 'neutral':
      reasons.push('Ruhige Neutraltöne, die sicher zusammenpassen.');
      break;
    case 'tonal':
      reasons.push(`Ton-in-Ton mit ${a ?? 'einer Farbe'}, kombiniert mit neutralen Basics.`);
      break;
    case 'analog':
      reasons.push(`${a} und ${b} liegen nah beieinander und wirken harmonisch.`);
      break;
    case 'komplementaer':
      reasons.push(`Komplementärkontrast: ${a} und ${b} bringen Spannung.`);
      break;
    case 'triade':
      reasons.push('Farbiger Dreiklang – mutig, aber ausgewogen.');
      break;
    default:
      if (x.sliders.experimental >= 60 || x.sliders.colorBold >= 65) reasons.push('Bewusst bunter Mix – passt zu deinen mutigen Einstellungen.');
  }
  if (c.patterned === 1) reasons.push('Ein Muster als Blickfang, der Rest bleibt ruhig.');

  // --- Style & activity ---
  const shared = score.styleShared[0] as StyleTag | undefined;
  if (shared) reasons.push(`Stimmiger ${STYLE_LABEL[shared]}-Look, passend für «${x.activityName}».`);
  else reasons.push(`Alle Teile passen zu «${x.activityName}».`);

  // --- Personal rating ---
  const fav = list.find((g) => g.favorite);
  const rated = list.filter((g) => g.rating > 0);
  const avg = rated.length ? rated.reduce((s, g) => s + g.rating, 0) / rated.length : 0;
  if (fav) reasons.push(`Mit deinem Favoriten «${garmentTitle(fav)}».`);
  else if (avg >= 4) reasons.push(`Teile, die du hoch bewertest (Ø ${avg.toFixed(1)} ★).`);

  // --- Variety ---
  let rare: { g: Garment; days: number | null } | null = null;
  for (const g of list) {
    const w = x.wear.get(g.id);
    const days = w?.last ? daysBetween(w.last, x.today) : null;
    if (days === null && x.sliders.experimental >= 50) rare = { g, days: null };
    else if (days !== null && days >= 14 && (!rare || (rare.days !== null && days > rare.days))) rare = { g, days };
  }
  if (rare) {
    reasons.push(
      rare.days === null
        ? `«${garmentTitle(rare.g)}» kommt endlich einmal zum Einsatz.`
        : `«${garmentTitle(rare.g)}» hast du seit ${rare.days} Tagen nicht getragen.`,
    );
  }

  if (score.breakdown.learned >= 0.7) reasons.push('Diese Kombination hat dir schon gefallen.');

  return { reasons: reasons.slice(0, 5), warnings };
}
