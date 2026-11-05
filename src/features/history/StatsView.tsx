import { Brain, Heart, ThumbsDown } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFeedback } from '../../components/feedback';
import { GarmentImage } from '../../components/GarmentImage';
import { clearFeedback } from '../../db/repo';
import type { Garment } from '../../domain/types';
import { buildPreferences } from '../../engine';
import { useFeedbackList, useGarments, useOutfits, useWearLogs } from '../../hooks/useData';
import { formatShortDate } from '../../lib/date';
import { learnedPairs, mostWorn, neverWorn, notWornSince } from '../../lib/stats';
import { garmentTitle } from '../../lib/wardrobeFilter';

export function StatsView() {
  const garments = useGarments();
  const logs = useWearLogs();
  const outfits = useOutfits();
  const feedback = useFeedbackList();
  const { confirm, toast } = useFeedback();

  const data = useMemo(() => {
    if (!garments || !logs || !outfits || !feedback) return null;
    const byId = new Map(garments.map((g) => [g.id, g]));
    const prefs = buildPreferences(feedback, outfits);
    const rated = outfits.filter((o) => o.rating > 0);
    return {
      top: mostWorn(garments, logs, 6),
      never: neverWorn(garments, logs),
      stale: notWornSince(garments, logs, 30).slice(0, 6),
      liked: learnedPairs(prefs, byId, 1),
      disliked: learnedPairs(prefs, byId, -1),
      rejected: feedback.filter((f) => f.value < 0).length,
      rated: rated.length,
      avgRating: rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0,
      active: garments.filter((g) => g.status !== 'aussortiert').length,
      wornDays: new Set(logs.map((l) => l.date)).size,
    };
  }, [garments, logs, outfits, feedback]);

  if (!data) return null;
  const maxCount = data.top[0]?.count ?? 1;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-num">{data.active}</span>
          <span className="stat-label">Kleider aktiv</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{data.wornDays}</span>
          <span className="stat-label">Tage erfasst</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{data.avgRating ? data.avgRating.toFixed(1) : '–'}</span>
          <span className="stat-label">Ø Outfit-Sterne</span>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Meistgetragen</h2>
        {data.top.length === 0 ? (
          <p className="small muted">Markiere Outfits als «heute getragen», dann siehst du hier deine Lieblinge.</p>
        ) : (
          <div className="list">
            {data.top.map((e) => (
              <Link key={e.garment.id} to={`/kleider/${e.garment.id}`} className="list-item">
                <GarmentImage garment={e.garment} className="list-thumb" />
                <span className="grow">
                  <span className="row-name">{garmentTitle(e.garment)}</span>
                  <span className="bar" style={{ width: `${(e.count / maxCount) * 100}%` }} />
                </span>
                <span className="count">{e.count}×</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Nie getragen · {data.never.length}</h2>
        {data.never.length === 0 ? (
          <p className="small muted">Alles schon mal getragen – stark!</p>
        ) : (
          <>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Zeit, sie auszuprobieren – oder auszusortieren? Im Maker kannst du ein Teil als Ausgangspunkt fixieren.
            </p>
            <GarmentStrip garments={data.never} />
          </>
        )}
      </section>

      {data.stale.length > 0 && (
        <section className="section">
          <h2 className="section-title">Seit über 30 Tagen nicht getragen</h2>
          <div className="list">
            {data.stale.map((e) => (
              <Link key={e.garment.id} to={`/kleider/${e.garment.id}`} className="list-item">
                <GarmentImage garment={e.garment} className="list-thumb" />
                <span className="grow row-name">{garmentTitle(e.garment)}</span>
                <span className="sub">{e.last && formatShortDate(e.last)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Das hat die App gelernt</h2>
        <div className="card stack learn-card">
          <p className="small">
            <Brain size={16} /> {data.rated} bewertete Outfits und {data.rejected} abgelehnte Vorschläge fliessen in
            neue Vorschläge ein.
          </p>
          {data.liked.length > 0 && (
            <div>
              <p className="learn-title">
                <Heart size={14} /> Kombinationen, die du magst
              </p>
              {data.liked.map((p) => (
                <PairRow key={p.a.id + p.b.id} a={p.a} b={p.b} />
              ))}
            </div>
          )}
          {data.disliked.length > 0 && (
            <div>
              <p className="learn-title">
                <ThumbsDown size={14} /> Kombinationen, die seltener kommen
              </p>
              {data.disliked.map((p) => (
                <PairRow key={p.a.id + p.b.id} a={p.a} b={p.b} />
              ))}
            </div>
          )}
          {data.rejected > 0 && (
            <button
              className="btn ghost sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Ablehnungen vergessen?',
                  message: 'Alle «Nein»-Rückmeldungen werden gelöscht. Deine Outfit-Bewertungen bleiben erhalten.',
                  confirmLabel: 'Vergessen',
                  danger: true,
                });
                if (ok) {
                  await clearFeedback();
                  toast('Ablehnungen zurückgesetzt.');
                }
              }}
            >
              Ablehnungen zurücksetzen
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function PairRow({ a, b }: { a: Garment; b: Garment }) {
  return (
    <div className="pair-row">
      <GarmentImage garment={a} className="pair-img" />
      <span className="plus">+</span>
      <GarmentImage garment={b} className="pair-img" />
      <span className="small truncate">
        {garmentTitle(a)} & {garmentTitle(b)}
      </span>
    </div>
  );
}

function GarmentStrip({ garments }: { garments: Garment[] }) {
  return (
    <div className="strip">
      {garments.map((g) => (
        <Link key={g.id} to={`/kleider/${g.id}`} className="strip-item" aria-label={garmentTitle(g)}>
          <GarmentImage garment={g} />
        </Link>
      ))}
    </div>
  );
}
