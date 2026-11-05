import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, RefreshCw, Settings as Gear, Shirt, Sparkles, ThumbsDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Collage } from '../../components/Collage';
import { EmptyState, SunArt } from '../../components/EmptyState';
import { useFeedback } from '../../components/feedback';
import { PageHeader } from '../../components/PageHeader';
import { db } from '../../db/db';
import { addFeedback, markWorn, saveOutfit, updateSettings } from '../../db/repo';
import type { Activity, Settings } from '../../domain/types';
import { generateOutfits, randomSeed, type Problem, type Suggestion } from '../../engine';
import { useActivities, useGarmentMap } from '../../hooks/useData';
import { useLoadedSettings } from '../../hooks/useSettings';
import { useWeather } from '../../hooks/useWeather';
import { formatLongDate, toDateKey } from '../../lib/date';
import { ActivityPicker } from '../activities/ActivityPicker';
import { Notes, ProblemNotice, Reasons } from '../outfit/OutfitNotes';
import '../outfit/outfit.css';
import { makeInput, useEngineBase } from '../outfit/useEngineBase';
import { SampleDataButton } from '../samples/SampleDataButton';
import { WeatherCard } from './WeatherCard';
import './today.css';

interface TodayResult {
  date: string;
  suggestion: Suggestion | null;
  problems: Problem[];
  notes: string[];
  shown: string[][];
  savedOutfitId?: string;
}

// Survives tab switches within the session.
let cached: TodayResult | null = null;

export function TodayPage() {
  const settings = useLoadedSettings();
  const activities = useActivities();
  return (
    <div className="page">
      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title="Heute"
        actions={
          <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen">
            <Gear size={22} />
          </Link>
        }
      />
      {settings && activities ? <TodayContent settings={settings} activities={activities} /> : null}
    </div>
  );
}

function TodayContent({ settings, activities }: { settings: Settings; activities: Activity[] }) {
  const { toast } = useFeedback();
  const base = useEngineBase();
  const garmentMap = useGarmentMap();
  const weather = useWeather(settings);
  const [activityId, setActivityId] = useState(
    activities.some((a) => a.id === settings.lastActivityId) ? settings.lastActivityId : (activities[0]?.id ?? 'arbeit'),
  );
  const [result, setResult] = useState<TodayResult | null>(cached?.date === toDateKey() ? cached : null);
  const todayLog = useLiveQuery(() => db.wearLogs.where('date').equals(toDateKey()).last(), []);

  const activity = activities.find((a) => a.id === activityId) ?? activities[0];
  const weatherSummary = weather.state.status === 'ready' ? weather.state.summary : null;

  const update = (r: TodayResult | null) => {
    cached = r;
    setResult(r);
  };

  const suggest = (avoidCurrent: boolean) => {
    if (!activity) return;
    const shown = avoidCurrent && result ? result.shown : [];
    const res = generateOutfits(
      makeInput(base, {
        rules: activity.rules,
        activityName: activity.name,
        sliders: activity.rules.sliders,
        weather: weatherSummary,
        seed: randomSeed(),
      }),
      { avoid: shown },
    );
    if (!res.ok) {
      update({ date: toDateKey(), suggestion: null, problems: res.problems, notes: [], shown });
      return;
    }
    const s = res.suggestions[0] ?? null;
    const notes = [...res.notes];
    if (!weatherSummary) notes.unshift('Ohne Wetterdaten – gib die Temperatur ein, damit die Schichten passen.');
    update({
      date: toDateKey(),
      suggestion: s,
      problems: [],
      notes,
      shown: s ? [...shown, s.itemIds] : shown,
    });
  };

  const pickActivity = (id: string) => {
    setActivityId(id);
    updateSettings({ lastActivityId: id });
    if (result) update(null);
  };

  const ensureSaved = async (s: Suggestion): Promise<string> => {
    if (result?.savedOutfitId) return result.savedOutfitId;
    const id = await saveOutfit({
      itemIds: s.itemIds,
      source: 'heute',
      context: { activityId: activity?.id, activityName: activity?.name, sliders: activity?.rules.sliders, weather: weatherSummary },
      rating: 0,
      note: '',
      reasons: s.reasons,
    });
    if (result) update({ ...result, savedOutfitId: id });
    return id;
  };

  const wear = async () => {
    if (!result?.suggestion) return;
    const id = await ensureSaved(result.suggestion);
    await markWorn(id);
    update(null);
    toast('Viel Spass! Das Outfit ist im Verlauf gespeichert.');
  };

  const save = async () => {
    if (!result?.suggestion) return;
    await ensureSaved(result.suggestion);
    toast('Outfit gespeichert.');
  };

  const reject = async () => {
    if (!result?.suggestion) return;
    await addFeedback(result.suggestion.itemIds, -1);
    toast('Notiert – diese Kombination kommt seltener.');
    suggest(true);
  };

  if (base.ready && base.garments.length === 0) {
    return (
      <EmptyState
        art={<SunArt />}
        title="Bereit für dein erstes Outfit?"
        actions={
          <>
            <Link to="/kleider" className="btn primary lg">
              <Shirt size={20} /> Kleider hinzufügen
            </Link>
            <SampleDataButton />
          </>
        }
      >
        Erfasse ein paar Kleider – mindestens Oberteil, Hose und Schuhe. Dann schlägt dir die App jeden Tag ein Outfit
        passend zum Wetter vor.
      </EmptyState>
    );
  }

  const worn = todayLog && garmentMap ? todayLog.itemIds.map((id) => garmentMap.get(id)).filter((g) => !!g) : [];

  return (
    <div className="stack" style={{ gap: 18 }}>
      <WeatherCard settings={settings} {...weather} />

      <ActivityPicker activities={activities} value={activityId} onChange={pickActivity} />

      {!result && worn.length > 0 && (
        <section className="card outfit-card">
          <div className="row">
            <h2 className="card-title">Dein Outfit heute</h2>
            <span className="spacer" />
            <span className="score-pill">Getragen</span>
          </div>
          <Collage items={Object.fromEntries(worn.map((g) => [g!.category, g]))} />
        </section>
      )}

      {!result && (
        <button className="btn primary lg block suggest-btn" onClick={() => suggest(false)} disabled={!base.ready}>
          <Sparkles size={20} /> {worn.length ? 'Neuen Vorschlag zeigen' : 'Outfit vorschlagen'}
        </button>
      )}

      {result && result.problems.length > 0 && <ProblemNotice problems={result.problems} />}
      {result && <Notes notes={result.notes} />}

      {result?.suggestion && (
        <section className="card outfit-card" aria-live="polite">
          <Collage items={result.suggestion.items} />
          <Reasons reasons={result.suggestion.reasons} warnings={result.suggestion.warnings} />
          <div className="outfit-actions">
            <button className="btn primary lg" onClick={wear}>
              Heute tragen
            </button>
            <button className="icon-action" onClick={() => suggest(true)} aria-label="Anderer Vorschlag">
              <RefreshCw size={20} /> Neu
            </button>
            <button className="icon-action" onClick={reject} aria-label="Passt mir nicht">
              <ThumbsDown size={20} /> Nein
            </button>
            <button className="icon-action" onClick={save} aria-label="Speichern">
              <Bookmark size={20} fill={result.savedOutfitId ? 'currentColor' : 'none'} /> Merken
            </button>
          </div>
        </section>
      )}

      {result && !result.suggestion && result.problems.length === 0 && (
        <button className="btn block" onClick={() => update(null)}>
          Zurück
        </button>
      )}
    </div>
  );
}
