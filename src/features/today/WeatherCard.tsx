import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Clock,
  Droplets,
  LocateFixed,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { useFeedback } from '../../components/feedback';
import { Switch } from '../../components/inputs';
import { Sheet } from '../../components/Sheet';
import { updateSettings } from '../../db/repo';
import { DEFAULT_LOCATION } from '../../domain/constants';
import type { Settings, WeatherSummary } from '../../domain/types';
import type { WeatherState } from '../../hooks/useWeather';
import { manualWeather, searchPlaces, weatherIcon, weatherLabel, type Place, type WeatherIconKind } from '../../lib/weather';

const ICONS: Record<WeatherIconKind, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

const r = (n: number) => Math.round(n);

interface Props {
  settings: Settings;
  state: WeatherState;
  manual: WeatherSummary | null;
  setManual: (s: WeatherSummary | null) => void;
  refresh: () => void;
}

export function WeatherCard({ settings, state, manual, setManual, refresh }: Props) {
  const [sheet, setSheet] = useState<'location' | 'window' | 'manual' | null>(null);
  const close = () => setSheet(null);

  return (
    <section className="weather-card" aria-label="Wetter">
      <div className="wc-top">
        <button className="wc-place" onClick={() => setSheet('location')}>
          {settings.location.mode === 'gps' ? <LocateFixed size={16} /> : <MapPin size={16} />}
          {settings.location.name}
        </button>
        <button className="wc-place" onClick={() => setSheet('window')}>
          <Clock size={16} />
          {settings.windowFrom}–{settings.windowTo} Uhr
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="wc-loading">
          <Loader2 className="spin" size={22} /> Wetter wird geladen …
        </div>
      )}

      {state.status === 'error' && (
        <div className="wc-error">
          <p>
            <strong>Wetter nicht verfügbar.</strong> {state.error}
          </p>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="btn primary sm" onClick={() => setSheet('manual')}>
              <Thermometer size={16} /> Temperatur eingeben
            </button>
            <button className="btn ghost sm" onClick={refresh}>
              <RefreshCw size={16} /> Nochmals versuchen
            </button>
          </div>
        </div>
      )}

      {state.status === 'ready' && <WeatherBody s={state.summary} />}

      {state.status === 'ready' && (
        <div className="wc-foot">
          {manual ? (
            <>
              <span>Manuell eingegeben</span>
              <button className="link-btn" onClick={() => setManual(null)}>
                Wetterdienst verwenden
              </button>
            </>
          ) : (
            <>
              <span>
                {state.summary.day === 'morgen' ? 'Vorschau für morgen · ' : ''}
                {state.stale ? 'Offline – letzter Stand ' : 'Stand '}
                {new Date(state.summary.fetchedAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button className="link-btn" onClick={() => setSheet('manual')}>
                <Pencil size={13} /> Selbst eingeben
              </button>
            </>
          )}
        </div>
      )}

      <LocationSheet open={sheet === 'location'} onClose={close} />
      <WindowSheet open={sheet === 'window'} onClose={close} settings={settings} />
      <ManualSheet
        open={sheet === 'manual'}
        onClose={close}
        initial={state.status === 'ready' ? state.summary : null}
        locationName={settings.location.name}
        onSave={(s) => {
          setManual(s);
          close();
        }}
      />
    </section>
  );
}

function WeatherBody({ s }: { s: WeatherSummary }) {
  const Icon = ICONS[weatherIcon(s.weatherCode)];
  return (
    <>
      <div className="wc-main">
        <div className="wc-temp">
          <span className="display wc-deg">{r(s.current)}°</span>
          <span className="wc-feels">
            gefühlt {r(s.feelsLike)}°{s.weatherCode !== undefined && ` · ${weatherLabel(s.weatherCode)}`}
          </span>
        </div>
        <div className="wc-icon" aria-hidden="true">
          <Icon size={54} strokeWidth={1.3} />
        </div>
      </div>
      <dl className="wc-stats">
        <div>
          <dt>
            <Droplets size={15} /> Regen
          </dt>
          <dd>{r(s.rainChance)} %</dd>
        </div>
        <div>
          <dt>
            <Wind size={15} /> Wind
          </dt>
          <dd>{r(s.wind)} km/h</dd>
        </div>
        <div>
          <dt>
            <Thermometer size={15} /> Tag
          </dt>
          <dd>
            {r(s.dayMin)}° / {r(s.dayMax)}°
          </dd>
        </div>
      </dl>
      {s.hourly && s.hourly.length > 2 && <HourlyLine hours={s.hourly} />}
    </>
  );
}

/** Tiny feels-like curve for the time window. */
function HourlyLine({ hours }: { hours: NonNullable<WeatherSummary['hourly']> }) {
  const W = 320;
  const H = 54;
  const temps = hours.map((h) => h.temp);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = Math.max(4, hi - lo);
  const x = (i: number) => 10 + (i * (W - 20)) / (hours.length - 1);
  const y = (t: number) => 10 + (1 - (t - lo) / span) * (H - 22);
  const pts = hours.map((h, i) => `${x(i).toFixed(1)},${y(h.temp).toFixed(1)}`).join(' ');
  const iMin = temps.indexOf(lo);
  const iMax = temps.indexOf(hi);
  const labelIdx = [...new Set([0, iMin, iMax, hours.length - 1])];
  return (
    <figure className="wc-hourly" aria-label={`Gefühlte Temperatur von ${hours[0]!.hour} bis ${hours[hours.length - 1]!.hour} Uhr`}>
      <svg viewBox={`0 0 ${W} ${H + 16}`} preserveAspectRatio="none" role="img">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(hours[i]!.temp)} r="3.5" className="dot" />
            <text x={x(i)} y={y(hours[i]!.temp) - 8} textAnchor={i === 0 ? 'start' : i === hours.length - 1 ? 'end' : 'middle'} className="t">
              {r(hours[i]!.temp)}°
            </text>
            <text x={x(i)} y={H + 12} textAnchor={i === 0 ? 'start' : i === hours.length - 1 ? 'end' : 'middle'} className="h">
              {hours[i]!.hour} Uhr
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useFeedback();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const t = setTimeout(() => {
      searchPlaces(q)
        .then((r) => !cancelled && setResults(r))
        .catch((e: Error) => !cancelled && toast(e.message))
        .finally(() => !cancelled && setBusy(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open, toast]);

  const choose = async (p: Place) => {
    await updateSettings({ location: { mode: 'manual', name: p.name, latitude: p.latitude, longitude: p.longitude } });
    setQ('');
    onClose();
  };

  const useGps = () => {
    if (!('geolocation' in navigator)) {
      toast('Standortbestimmung wird nicht unterstützt.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updateSettings({
          location: { mode: 'gps', name: 'Mein Standort', latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        });
        setGpsBusy(false);
        onClose();
      },
      (err) => {
        setGpsBusy(false);
        toast(
          err.code === err.PERMISSION_DENIED
            ? 'Standortzugriff verweigert. Du kannst den Ort auch eingeben.'
            : 'Standort konnte nicht bestimmt werden.',
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 15 * 60_000 },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ort wählen">
      <div className="stack" style={{ marginTop: 8 }}>
        <button className="btn primary block" onClick={useGps} disabled={gpsBusy}>
          {gpsBusy ? <Loader2 className="spin" size={18} /> : <LocateFixed size={18} />} Aktuellen Standort verwenden
        </button>
        <input
          className="input"
          type="search"
          placeholder="Ort suchen, z. B. Thun"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Ort suchen"
        />
        {busy && <p className="small muted">Suche …</p>}
        {results.length > 0 && (
          <div className="list">
            {results.map((p) => (
              <button key={`${p.latitude},${p.longitude}`} className="list-item" onClick={() => choose(p)}>
                <MapPin size={18} />
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 650 }}>{p.name}</span>
                  <span className="sub">{p.region}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <button className="btn ghost block" onClick={() => choose({ ...DEFAULT_LOCATION, region: '' })}>
          Bern (Standard)
        </button>
      </div>
    </Sheet>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function WindowSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const [from, setFrom] = useState(settings.windowFrom);
  const [to, setTo] = useState(settings.windowTo);
  useEffect(() => {
    if (open) {
      setFrom(settings.windowFrom);
      setTo(settings.windowTo);
    }
  }, [open, settings.windowFrom, settings.windowTo]);

  return (
    <Sheet open={open} onClose={onClose} title="Wann bist du unterwegs?">
      <p className="small muted">Das Outfit richtet sich nach dem kühlsten und wärmsten Moment in diesem Zeitraum.</p>
      <div className="two-col" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">
          <span className="label">Von</span>
          <select className="select" value={from} onChange={(e) => setFrom(Number(e.target.value))}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Bis</span>
          <select className="select" value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {HOURS.filter((h) => h > from).map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="dialog-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn primary"
          onClick={async () => {
            await updateSettings({ windowFrom: from, windowTo: Math.max(to, from + 1) });
            onClose();
          }}
        >
          Übernehmen
        </button>
      </div>
    </Sheet>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="stepper">
        <button type="button" className="btn" onClick={() => onChange(value - 1)} aria-label={`${label} verringern`}>
          −
        </button>
        <span className="stepper-val">{value}°</span>
        <button type="button" className="btn" onClick={() => onChange(value + 1)} aria-label={`${label} erhöhen`}>
          +
        </button>
      </div>
    </div>
  );
}

function ManualSheet({
  open,
  onClose,
  onSave,
  initial,
  locationName,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: WeatherSummary) => void;
  initial: WeatherSummary | null;
  locationName: string;
}) {
  const [min, setMin] = useState(8);
  const [max, setMax] = useState(16);
  const [rain, setRain] = useState(false);
  const [windy, setWindy] = useState(false);
  useEffect(() => {
    if (open && initial) {
      setMin(r(initial.windowMin));
      setMax(r(initial.windowMax));
      setRain(initial.rainChance >= 50);
      setWindy(initial.wind >= 30);
    }
  }, [open, initial]);

  return (
    <Sheet open={open} onClose={onClose} title="Wetter selbst eingeben">
      <p className="small muted">Gilt für heute. So bekommst du auch ohne Internet einen passenden Vorschlag.</p>
      <div className="two-col" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
        <Stepper label="Am kühlsten" value={min} onChange={setMin} />
        <Stepper label="Am wärmsten" value={max} onChange={setMax} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Switch label="Regen erwartet" checked={rain} onChange={setRain} />
        <Switch label="Windig" checked={windy} onChange={setWindy} />
      </div>
      <div className="dialog-actions">
        <button className="btn ghost" onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn primary" onClick={() => onSave(manualWeather(min, max, rain, windy, locationName))}>
          Übernehmen
        </button>
      </div>
    </Sheet>
  );
}
