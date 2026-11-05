import { ArrowLeftRight, Ban, Bookmark, Dices, Lock, LockOpen, Pin, Plus, Shirt, Sparkles, ThumbsDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Collage } from '../../components/Collage';
import { EmptyState, HangerArt } from '../../components/EmptyState';
import { useFeedback } from '../../components/feedback';
import { GarmentImage } from '../../components/GarmentImage';
import { ChipSelect, RangeSlider, Switch } from '../../components/inputs';
import { Sheet } from '../../components/Sheet';
import { addFeedback, markWorn, saveOutfit } from '../../db/repo';
import { CATEGORY_LABEL, DEFAULT_SLIDERS } from '../../domain/constants';
import type { Activity, ActivityRules, Category, Garment, Settings, Sliders } from '../../domain/types';
import {
  alternativesFor,
  evaluateOutfit,
  generateOutfits,
  randomSeed,
  SLOT_ORDER,
  type Alternative,
  type Problem,
  type Suggestion,
} from '../../engine';
import { useActivities } from '../../hooks/useData';
import { useLoadedSettings } from '../../hooks/useSettings';
import { useWeather } from '../../hooks/useWeather';
import { garmentTitle } from '../../lib/wardrobeFilter';
import { PageHeader } from '../../components/PageHeader';
import { GarmentPicker } from '../outfit/GarmentPicker';
import { Notes, ProblemNotice, Reasons } from '../outfit/OutfitNotes';
import '../outfit/outfit.css';
import { SLIDER_DEFS } from '../outfit/sliders';
import { makeInput, useEngineBase } from '../outfit/useEngineBase';
import { SampleDataButton } from '../samples/SampleDataButton';
import './maker.css';

const ANY_ID = '__beliebig';
const ANY_RULES: ActivityRules = {
  occasion: null,
  preferStyles: [],
  avoidStyles: [],
  avoidDelicate: false,
  preferRobust: false,
  sliders: DEFAULT_SLIDERS,
  note: '',
};

interface Card {
  key: number;
  suggestion: Suggestion;
  locked: Category[];
  savedId?: string;
}

interface MakerState {
  sliders: Sliders;
  activityId: string;
  useWeatherData: boolean;
  anchorId: string | null;
  excluded: string[];
  cards: Card[];
  problems: Problem[];
  notes: string[];
  dirty: boolean;
}

const SLIDER_KEY = 'kleider.maker.sliders.v1';

function initialState(): MakerState {
  let sliders = DEFAULT_SLIDERS;
  try {
    sliders = { ...DEFAULT_SLIDERS, ...(JSON.parse(localStorage.getItem(SLIDER_KEY) ?? '{}') as Partial<Sliders>) };
  } catch {
    /* ignore */
  }
  return {
    sliders,
    activityId: ANY_ID,
    useWeatherData: true,
    anchorId: null,
    excluded: [],
    cards: [],
    problems: [],
    notes: [],
    dirty: false,
  };
}

let cached: MakerState | null = null;
let cardKey = 1;

export function MakerPage() {
  const settings = useLoadedSettings();
  const activities = useActivities();
  return (
    <div className="page">
      <PageHeader eyebrow="Eigene Einstellungen" title="Outfit-Maker" />
      {settings && activities ? <Maker settings={settings} activities={activities} /> : null}
    </div>
  );
}

function Maker({ settings, activities }: { settings: Settings; activities: Activity[] }) {
  const { toast } = useFeedback();
  const base = useEngineBase();
  const weather = useWeather(settings);
  const [state, setStateRaw] = useState<MakerState>(() => cached ?? initialState());
  const [picker, setPicker] = useState<'anchor' | 'exclude' | null>(null);
  const [swap, setSwap] = useState<{ card: number; category: Category; options: Alternative[] } | null>(null);
  const [addSlot, setAddSlot] = useState<number | null>(null);

  const setState = (patch: Partial<MakerState> | ((s: MakerState) => Partial<MakerState>)) =>
    setStateRaw((s) => {
      const next = { ...s, ...(typeof patch === 'function' ? patch(s) : patch) };
      cached = next;
      return next;
    });

  const weatherSummary = weather.state.status === 'ready' ? weather.state.summary : null;
  const activity: { id: string; name: string; rules: ActivityRules } =
    activities.find((a) => a.id === state.activityId) ?? { id: ANY_ID, name: 'Beliebig', rules: ANY_RULES };

  const available = useMemo(() => base.garments.filter((g) => g.status === 'verfuegbar'), [base.garments]);
  const anchor = state.anchorId ? base.garments.find((g) => g.id === state.anchorId) : undefined;

  const inputFor = (locked?: Partial<Record<Category, string>>) =>
    makeInput(base, {
      rules: activity.rules,
      activityName: activity.name,
      sliders: state.sliders,
      weather: state.useWeatherData ? weatherSummary : null,
      locked: { ...(anchor ? { [anchor.category]: anchor.id } : {}), ...locked },
      excludedIds: state.excluded,
      seed: randomSeed(),
    });

  const create = () => {
    const res = generateOutfits(inputFor(), { count: 3 });
    if (!res.ok) {
      setState({ cards: [], problems: res.problems, notes: [], dirty: false });
      return;
    }
    setState({
      cards: res.suggestions.map((s) => ({
        key: cardKey++,
        suggestion: s,
        locked: anchor ? [anchor.category] : [],
      })),
      problems: [],
      notes: res.notes,
      dirty: false,
    });
  };

  const updateCard = (key: number, patch: Partial<Card>) =>
    setState((s) => ({ cards: s.cards.map((c) => (c.key === key ? { ...c, ...patch } : c)) }));

  const reroll = (card: Card) => {
    const locked = Object.fromEntries(card.locked.map((c) => [c, card.suggestion.items[c]?.id]).filter(([, id]) => id));
    const res = generateOutfits(inputFor(locked), {
      avoid: state.cards.map((c) => c.suggestion.itemIds),
    });
    if (!res.ok || !res.suggestions[0]) {
      toast(res.ok ? 'Keine andere Kombination gefunden – löse ein Teil.' : res.problems[0]!.message);
      return;
    }
    updateCard(card.key, { suggestion: res.suggestions[0], savedId: undefined });
  };

  const toggleLock = (card: Card, c: Category) =>
    updateCard(card.key, { locked: card.locked.includes(c) ? card.locked.filter((x) => x !== c) : [...card.locked, c] });

  const openSwap = (card: Card, c: Category) =>
    setSwap({ card: card.key, category: c, options: alternativesFor(card.suggestion.items, c, inputFor()) });

  const applySwap = (g: Garment | null) => {
    if (!swap) return;
    const card = state.cards.find((c) => c.key === swap.card);
    if (!card) return;
    const items = { ...card.suggestion.items };
    if (g) items[swap.category] = g;
    else delete items[swap.category];
    updateCard(card.key, {
      suggestion: evaluateOutfit(items, inputFor()),
      locked: g ? [...new Set([...card.locked, swap.category])] : card.locked.filter((x) => x !== swap.category),
      savedId: undefined,
    });
    setSwap(null);
  };

  const persist = async (card: Card): Promise<string> => {
    if (card.savedId) return card.savedId;
    const id = await saveOutfit({
      itemIds: card.suggestion.itemIds,
      source: 'maker',
      context: {
        activityId: activity.id === ANY_ID ? undefined : activity.id,
        activityName: activity.name,
        sliders: state.sliders,
        weather: state.useWeatherData ? weatherSummary : null,
      },
      rating: 0,
      note: '',
      reasons: card.suggestion.reasons,
    });
    updateCard(card.key, { savedId: id });
    return id;
  };

  const reject = async (card: Card) => {
    await addFeedback(card.suggestion.itemIds, -1);
    toast('Notiert – so kommt das seltener.');
    reroll(card);
  };

  if (base.ready && base.garments.length === 0) {
    return (
      <EmptyState
        art={<HangerArt />}
        title="Noch nichts zum Kombinieren"
        actions={
          <>
            <Link to="/kleider" className="btn primary lg">
              <Shirt size={20} /> Kleider hinzufügen
            </Link>
            <SampleDataButton />
          </>
        }
      >
        Sobald du ein paar Kleider erfasst hast, kannst du hier mit Reglern eigene Outfits zusammenstellen lassen.
      </EmptyState>
    );
  }

  const activityOptions = [
    { value: ANY_ID, label: 'Beliebig' },
    ...activities.map((a) => ({ value: a.id, label: a.name })),
  ];
  const r = (n: number) => Math.round(n);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="card stack maker-controls">
        {SLIDER_DEFS.map((d) => (
          <RangeSlider
            key={d.key}
            label={d.label}
            left={d.left}
            right={d.right}
            value={state.sliders[d.key]}
            onChange={(v) => {
              const sliders = { ...state.sliders, [d.key]: v };
              try {
                localStorage.setItem(SLIDER_KEY, JSON.stringify(sliders));
              } catch {
                /* ignore */
              }
              setState({ sliders, dirty: state.cards.length > 0 });
            }}
          />
        ))}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Anlass
        </h2>
        <ChipSelect
          scroll
          options={activityOptions}
          value={state.activityId}
          onChange={(activityId) => setState({ activityId, dirty: state.cards.length > 0 })}
        />
      </section>

      <section className="card flat maker-options">
        <Switch
          label="Wetter berücksichtigen"
          hint={
            weatherSummary
              ? `${weatherSummary.locationName}: gefühlt ${r(weatherSummary.windowMin)}–${r(weatherSummary.windowMax)}°, Regen ${r(weatherSummary.rainChance)} %`
              : 'Kein Wetter verfügbar – auf «Heute» kannst du die Temperatur eingeben.'
          }
          checked={state.useWeatherData && !!weatherSummary}
          onChange={(useWeatherData) => setState({ useWeatherData, dirty: state.cards.length > 0 })}
        />
        <div className="option-row">
          <span className="option-label">
            <Pin size={18} /> Ausgangsteil
          </span>
          {anchor ? (
            <span className="anchor-chip">
              <GarmentImage garment={anchor} className="anchor-img" />
              <span className="truncate">{garmentTitle(anchor)}</span>
              <button className="icon-btn sm-icon" aria-label="Ausgangsteil entfernen" onClick={() => setState({ anchorId: null, dirty: state.cards.length > 0 })}>
                <X size={16} />
              </button>
            </span>
          ) : (
            <button className="btn ghost sm" onClick={() => setPicker('anchor')}>
              Wählen
            </button>
          )}
        </div>
        <div className="option-row">
          <span className="option-label">
            <Ban size={18} /> Ausschliessen
          </span>
          <button className="btn ghost sm" onClick={() => setPicker('exclude')}>
            {state.excluded.length ? `${state.excluded.length} ausgeschlossen` : 'Wählen'}
          </button>
        </div>
      </section>

      <button className="btn primary lg block suggest-btn" onClick={create} disabled={!base.ready}>
        <Sparkles size={20} /> {state.cards.length ? '3 neue Vorschläge' : '3 Vorschläge erstellen'}
      </button>

      {state.dirty && <p className="small muted" style={{ textAlign: 'center', marginTop: -8 }}>Einstellungen geändert – erstelle neue Vorschläge.</p>}
      {state.problems.length > 0 && <ProblemNotice problems={state.problems} />}
      <Notes notes={state.notes} />

      {state.cards.map((card, i) => {
        const missing = SLOT_ORDER.filter((c) => !card.suggestion.items[c] && ['jacket', 'midlayer', 'headwear', 'accessory'].includes(c));
        return (
          <section key={card.key} className="card outfit-card">
            <div className="row">
              <h2 className="card-title">Vorschlag {i + 1}</h2>
              <span className="spacer" />
              <span className="score-pill">{Math.round(card.suggestion.score * 100)} Punkte</span>
            </div>
            <Collage
              items={card.suggestion.items}
              highlight={(c) => card.locked.includes(c)}
              overlay={(c) => (
                <span className="tile-tools">
                  <span
                    role="button"
                    tabIndex={0}
                    className={`tile-tool${card.locked.includes(c) ? ' on' : ''}`}
                    aria-label={`${CATEGORY_LABEL[c]} ${card.locked.includes(c) ? 'lösen' : 'fixieren'}`}
                    aria-pressed={card.locked.includes(c)}
                    onClick={() => toggleLock(card, c)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleLock(card, c)}
                  >
                    {card.locked.includes(c) ? <Lock size={16} /> : <LockOpen size={16} />}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="tile-tool"
                    aria-label={`${CATEGORY_LABEL[c]} tauschen`}
                    onClick={() => openSwap(card, c)}
                    onKeyDown={(e) => e.key === 'Enter' && openSwap(card, c)}
                  >
                    <ArrowLeftRight size={16} />
                  </span>
                </span>
              )}
            />
            {missing.length > 0 && (
              <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setAddSlot(card.key)}>
                <Plus size={15} /> Teil hinzufügen
              </button>
            )}
            <Reasons reasons={card.suggestion.reasons} warnings={card.suggestion.warnings} />
            <div className="outfit-actions">
              <button className="btn primary lg" onClick={() => reroll(card)}>
                <Dices size={20} /> {card.locked.length ? 'Rest neu würfeln' : 'Neu würfeln'}
              </button>
              <button className="icon-action" onClick={() => reject(card)} aria-label="Gefällt mir nicht">
                <ThumbsDown size={20} /> Nein
              </button>
              <button
                className="icon-action"
                aria-label="Speichern"
                onClick={async () => {
                  await persist(card);
                  toast('Outfit gespeichert.');
                }}
              >
                <Bookmark size={20} fill={card.savedId ? 'currentColor' : 'none'} /> Merken
              </button>
              <button
                className="icon-action"
                aria-label="Heute tragen"
                onClick={async () => {
                  const id = await persist(card);
                  await markWorn(id);
                  toast('Als «heute getragen» gespeichert.');
                }}
              >
                <Shirt size={20} /> Tragen
              </button>
            </div>
          </section>
        );
      })}

      <GarmentPicker
        open={picker === 'anchor'}
        onClose={() => setPicker(null)}
        title="Ausgangsteil wählen"
        hint="Dieses Teil ist in allen Vorschlägen dabei."
        garments={available}
        selected={state.anchorId ? [state.anchorId] : []}
        onChange={(ids) =>
          setState((s) => ({
            anchorId: ids[0] ?? null,
            excluded: s.excluded.filter((x) => x !== ids[0]),
            dirty: s.cards.length > 0,
          }))
        }
      />
      <GarmentPicker
        open={picker === 'exclude'}
        onClose={() => setPicker(null)}
        title="Kleider ausschliessen"
        hint="Diese Teile kommen in keinem Vorschlag vor."
        multi
        garments={available.filter((g) => g.id !== state.anchorId)}
        selected={state.excluded}
        onChange={(excluded) => setState({ excluded, dirty: state.cards.length > 0 })}
      />

      <Sheet open={!!swap} onClose={() => setSwap(null)} title={swap ? `${CATEGORY_LABEL[swap.category]} tauschen` : ''}>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Sortiert nach Passung zum restlichen Outfit.
        </p>
        <div className="picker-grid">
          {swap?.options.map((o, idx) => {
            const current = state.cards.find((c) => c.key === swap.card)?.suggestion.items[swap.category];
            const on = o.garment ? current?.id === o.garment.id : !current;
            return (
              <button key={o.garment?.id ?? 'none'} className={`picker-item${on ? ' on' : ''}`} onClick={() => applySwap(o.garment)}>
                {o.garment ? (
                  <GarmentImage garment={o.garment} />
                ) : (
                  <span className="img-ph none-tile">
                    <X size={26} />
                  </span>
                )}
                <span className="picker-name">{o.garment ? garmentTitle(o.garment) : 'Ohne'}</span>
                {idx === 0 && swap.options.length > 1 && <span className="picker-score">Beste Wahl</span>}
              </button>
            );
          })}
        </div>
        {swap && swap.options.length === 0 && <p className="muted">Keine passenden Alternativen verfügbar.</p>}
      </Sheet>

      <Sheet open={addSlot !== null} onClose={() => setAddSlot(null)} title="Teil hinzufügen">
        <div className="stack">
          {(() => {
            const card = state.cards.find((c) => c.key === addSlot);
            if (!card) return null;
            return (['jacket', 'midlayer', 'headwear', 'accessory'] as Category[])
              .filter((c) => !card.suggestion.items[c])
              .map((c) => (
                <button
                  key={c}
                  className="btn block"
                  onClick={() => {
                    setAddSlot(null);
                    const options = alternativesFor(card.suggestion.items, c, inputFor()).filter((o) => o.garment);
                    if (!options.length) toast(`Keine passenden ${CATEGORY_LABEL[c]}-Teile verfügbar.`);
                    else setSwap({ card: card.key, category: c, options });
                  }}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ));
          })()}
        </div>
      </Sheet>
    </div>
  );
}
