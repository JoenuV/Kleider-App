import { ChevronLeft, ChevronRight, Shirt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Collage } from '../../components/Collage';
import { CalendarArt, EmptyState } from '../../components/EmptyState';
import { GarmentImage } from '../../components/GarmentImage';
import { Stars } from '../../components/inputs';
import { PageHeader } from '../../components/PageHeader';
import type { Garment, Outfit, WearLog } from '../../domain/types';
import { useGarmentMap, useOutfits, useWearLogs } from '../../hooks/useData';
import { formatShortDate, toDateKey } from '../../lib/date';
import { monthGrid } from '../../lib/stats';
import { OutfitSheet, outfitItems } from './OutfitSheet';
import { StatsView } from './StatsView';
import './history.css';

type Tab = 'kalender' | 'liste' | 'statistik';
let rememberedTab: Tab = 'kalender';

const MONTH = new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function HistoryPage() {
  const [tab, setTabState] = useState<Tab>(rememberedTab);
  const setTab = (t: Tab) => {
    rememberedTab = t;
    setTabState(t);
  };
  const outfits = useOutfits();
  const logs = useWearLogs();
  const byId = useGarmentMap();
  const [open, setOpen] = useState<{ outfitId: string; log?: WearLog } | null>(null);

  const outfitMap = useMemo(() => new Map((outfits ?? []).map((o) => [o.id, o])), [outfits]);
  const ready = outfits && logs && byId;
  const empty = ready && outfits.length === 0;

  return (
    <div className="page">
      <PageHeader eyebrow={logs ? `${logs.length} Mal getragen` : ' '} title="Verlauf" />
      <div className="segmented" role="tablist" aria-label="Ansicht">
        {(['kalender', 'liste', 'statistik'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'kalender' ? 'Kalender' : t === 'liste' ? 'Outfits' : 'Statistik'}
          </button>
        ))}
      </div>

      {empty && tab !== 'statistik' && (
        <EmptyState
          art={<CalendarArt />}
          title="Noch keine Outfits"
          actions={
            <Link to="/" className="btn primary">
              <Shirt size={18} /> Outfit des Tages
            </Link>
          }
        >
          Wenn du ein Outfit als «heute getragen» markierst oder merkst, erscheint es hier. Bewerte deine Outfits – die
          App lernt daraus.
        </EmptyState>
      )}

      {ready && !empty && tab === 'kalender' && (
        <CalendarView logs={logs} byId={byId} onOpen={(log) => setOpen({ outfitId: log.outfitId, log })} />
      )}
      {ready && !empty && tab === 'liste' && (
        <OutfitList outfits={outfits} logs={logs} byId={byId} onOpen={(id) => setOpen({ outfitId: id })} />
      )}
      {ready && tab === 'statistik' && <StatsView />}

      {open && byId && logs && (
        <OutfitSheet
          outfit={outfitMap.get(open.outfitId) ?? null}
          logs={logs}
          byId={byId}
          focusLog={open.log}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function CalendarView({
  logs,
  byId,
  onOpen,
}: {
  logs: WearLog[];
  byId: Map<string, Garment>;
  onOpen: (log: WearLog) => void;
}) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const byDate = useMemo(() => {
    const m = new Map<string, WearLog[]>();
    for (const l of logs) m.set(l.date, [...(m.get(l.date) ?? []), l]);
    return m;
  }, [logs]);
  const weeks = monthGrid(ym.y, ym.m);
  const today = toDateKey();
  const shift = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6);

  const thumbFor = (log: WearLog): Garment | undefined => {
    const items = log.itemIds.map((id) => byId.get(id)).filter((g): g is Garment => !!g);
    return items.find((g) => g.category === 'top') ?? items.find((g) => g.category === 'jacket') ?? items[0];
  };

  return (
    <>
      <div className="cal card">
        <div className="cal-head">
          <button className="icon-btn" aria-label="Vorheriger Monat" onClick={() => shift(-1)}>
            <ChevronLeft size={22} />
          </button>
          <span className="cal-title">{MONTH.format(new Date(ym.y, ym.m, 1))}</span>
          <button className="icon-btn" aria-label="Nächster Monat" onClick={() => shift(1)}>
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="cal-grid" role="grid">
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal-wd">
              {d}
            </span>
          ))}
          {weeks.flat().map((key, i) => {
            if (!key) return <span key={i} />;
            const dayLogs = byDate.get(key);
            const g = dayLogs?.[0] ? thumbFor(dayLogs[0]) : undefined;
            return (
              <button
                key={key}
                className={`cal-day${key === today ? ' today' : ''}${dayLogs ? ' has' : ''}`}
                disabled={!dayLogs}
                onClick={() => dayLogs?.[0] && onOpen(dayLogs[0])}
                aria-label={`${formatShortDate(key)}${dayLogs ? `, ${dayLogs.length} Outfit` : ''}`}
              >
                {g ? <GarmentImage garment={g} className="cal-img" /> : null}
                <span className="cal-num">{Number(key.slice(8))}</span>
                {dayLogs && dayLogs.length > 1 && <span className="cal-more">{dayLogs.length}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {recent.length > 0 && (
        <section className="section">
          <h2 className="section-title">Zuletzt getragen</h2>
          <div className="recent-row">
            {recent.map((l) => (
              <button key={l.id} className="recent-item" onClick={() => onOpen(l)}>
                <Collage items={outfitItems(l, byId).items} size="sm" />
                <span className="tiny muted">{formatShortDate(l.date)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function OutfitList({
  outfits,
  logs,
  byId,
  onOpen,
}: {
  outfits: Outfit[];
  logs: WearLog[];
  byId: Map<string, Garment>;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'alle' | 'getragen' | 'gemerkt' | 'bewertet'>('alle');
  const counts = useMemo(() => {
    const m = new Map<string, { n: number; last: string }>();
    for (const l of logs) {
      const c = m.get(l.outfitId) ?? { n: 0, last: '' };
      c.n++;
      if (l.date > c.last) c.last = l.date;
      m.set(l.outfitId, c);
    }
    return m;
  }, [logs]);
  const list = outfits.filter((o) => {
    if (filter === 'getragen') return counts.has(o.id);
    if (filter === 'gemerkt') return !counts.has(o.id);
    if (filter === 'bewertet') return o.rating > 0;
    return true;
  });

  return (
    <>
      <div className="chips scroll" style={{ marginBottom: 14 }}>
        {(
          [
            ['alle', 'Alle'],
            ['getragen', 'Getragen'],
            ['gemerkt', 'Gemerkt'],
            ['bewertet', 'Bewertet'],
          ] as const
        ).map(([v, label]) => (
          <button key={v} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="muted small">Keine Outfits in dieser Ansicht.</p>}
      <div className="outfit-list">
        {list.map((o) => {
          const c = counts.get(o.id);
          return (
            <button key={o.id} className="outfit-row" onClick={() => onOpen(o.id)}>
              <div className="outfit-row-img">
                <Collage items={outfitItems(o, byId).items} size="sm" />
              </div>
              <div className="grow">
                <span className="name">{o.context.activityName ?? 'Outfit'}</span>
                <span className="sub">
                  {c ? `${c.n}× getragen · zuletzt ${formatShortDate(c.last)}` : `Gemerkt am ${formatShortDate(toDateKey(new Date(o.createdAt)))}`}
                </span>
                {o.rating > 0 ? <Stars value={o.rating} size={13} /> : <span className="tiny muted">Noch nicht bewertet</span>}
              </div>
              <ChevronRight size={18} className="muted" />
            </button>
          );
        })}
      </div>
    </>
  );
}
