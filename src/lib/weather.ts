import type { LocationSetting, WeatherSummary } from '../domain/types';

/** Raw subset of the Open-Meteo forecast response we use. */
export interface ForecastRaw {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export interface Place {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { reason?: string } | null;
      if (res.status === 429) throw new Error('Wetterdienst ist gerade überlastet (Anfragelimit erreicht).');
      throw new Error(`Wetterdienst antwortet nicht (${res.status}${body?.reason ? `: ${body.reason}` : ''}).`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Wetterdienst antwortet nicht (Zeitüberschreitung).');
    if (e instanceof TypeError) throw new Error('Keine Verbindung zum Wetterdienst.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function forecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,apparent_temperature,wind_speed_10m,weather_code',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '2',
    wind_speed_unit: 'kmh',
  });
  return `${FORECAST_URL}?${params}`;
}

export async function fetchForecast(lat: number, lon: number): Promise<ForecastRaw> {
  return fetchJson<ForecastRaw>(forecastUrl(lat, lon));
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ name: q, count: '6', language: 'de', format: 'json' });
  const data = await fetchJson<{
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  }>(`${GEO_URL}?${params}`);
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/** "2026-11-05T14:00" → { date: "2026-11-05", hour: 14 } (location's local time). */
function splitTime(t: string): { date: string; hour: number } {
  return { date: t.slice(0, 10), hour: Number(t.slice(11, 13)) };
}

/**
 * Reduces the forecast to what matters for the outfit: the time window the user is out.
 * After the window has ended for today, tomorrow's window is used.
 * `now` is the location's local time as "YYYY-MM-DDTHH:MM" (defaults to current.time).
 */
export function summarize(
  raw: ForecastRaw,
  windowFrom: number,
  windowTo: number,
  locationName: string,
  now?: string,
  fetchedAt = Date.now(),
): WeatherSummary {
  const nowStr = now ?? raw.current?.time ?? raw.hourly.time[0] ?? '';
  const { date: today, hour: nowHour } = splitTime(nowStr);
  const from = Math.max(0, Math.min(23, windowFrom));
  const to = Math.max(from, Math.min(23, windowTo));
  const tomorrow = raw.daily.time.find((d) => d > today);
  const useTomorrow = nowHour > to && !!tomorrow;
  const day = useTomorrow ? tomorrow! : today;
  const startHour = useTomorrow ? from : Math.max(from, Math.min(nowHour, to));

  const hours: { hour: number; temp: number; feels: number; rain: number; wind: number; code: number }[] = [];
  raw.hourly.time.forEach((t, i) => {
    const { date, hour } = splitTime(t);
    if (date === day && hour >= startHour && hour <= to) {
      hours.push({
        hour,
        temp: raw.hourly.temperature_2m[i] ?? 0,
        feels: raw.hourly.apparent_temperature[i] ?? 0,
        rain: raw.hourly.precipitation_probability[i] ?? 0,
        wind: raw.hourly.wind_speed_10m[i] ?? 0,
        code: raw.hourly.weather_code[i] ?? 0,
      });
    }
  });
  if (!hours.length) throw new Error('Keine Wetterdaten für den gewählten Zeitraum.');

  let minH = hours[0]!;
  let maxH = hours[0]!;
  for (const h of hours) {
    if (h.feels < minH.feels) minH = h;
    if (h.feels > maxH.feels) maxH = h;
  }
  const dayIdx = Math.max(0, raw.daily.time.indexOf(day));
  const cur = raw.current;
  const first = hours[0]!;
  return {
    source: 'api',
    locationName,
    current: useTomorrow ? first.temp : (cur?.temperature_2m ?? first.temp),
    feelsLike: useTomorrow ? first.feels : (cur?.apparent_temperature ?? first.feels),
    rainChance: Math.max(...hours.map((h) => h.rain)),
    wind: Math.max(...hours.map((h) => h.wind)),
    dayMin: raw.daily.temperature_2m_min[dayIdx] ?? minH.temp,
    dayMax: raw.daily.temperature_2m_max[dayIdx] ?? maxH.temp,
    windowMin: minH.feels,
    windowMax: maxH.feels,
    windowMinHour: minH.hour,
    windowMaxHour: maxH.hour,
    weatherCode: useTomorrow ? mostSevereCode(hours.map((h) => h.code)) : (cur?.weather_code ?? first.code),
    day: useTomorrow ? 'morgen' : 'heute',
    hourly: hours.map((h) => ({ hour: h.hour, temp: h.feels, rain: h.rain, code: h.code })),
    fetchedAt,
  };
}

function mostSevereCode(codes: number[]): number {
  return codes.reduce((a, b) => (b > a ? b : a), 0);
}

/** Weather from manual input (fallback when the API is unavailable). */
export function manualWeather(
  min: number,
  max: number,
  rain: boolean,
  windy: boolean,
  locationName: string,
): WeatherSummary {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return {
    source: 'manual',
    locationName,
    current: lo,
    feelsLike: lo,
    rainChance: rain ? 80 : 0,
    wind: windy ? 40 : 8,
    dayMin: lo,
    dayMax: hi,
    windowMin: lo,
    windowMax: hi,
    windowMinHour: 8,
    windowMaxHour: 15,
    day: 'heute',
    fetchedAt: Date.now(),
  };
}

export function weatherLabel(code: number | undefined): string {
  if (code === undefined) return '';
  if (code === 0) return 'Klar';
  if (code <= 2) return 'Leicht bewölkt';
  if (code === 3) return 'Bedeckt';
  if (code === 45 || code === 48) return 'Nebel';
  if (code >= 51 && code <= 57) return 'Nieselregen';
  if (code >= 61 && code <= 67) return 'Regen';
  if (code >= 71 && code <= 77) return 'Schnee';
  if (code >= 80 && code <= 82) return 'Regenschauer';
  if (code >= 85 && code <= 86) return 'Schneeschauer';
  if (code >= 95) return 'Gewitter';
  return '';
}

export type WeatherIconKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export function weatherIcon(code: number | undefined): WeatherIconKind {
  if (code === undefined || code === 0) return 'sun';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}

// ---- Offline cache (last successful forecast per location) ----

const CACHE_KEY = 'kleider.weather.v1';

interface CacheEntry {
  key: string;
  raw: ForecastRaw;
  fetchedAt: number;
}

export function locationKey(l: LocationSetting): string {
  return `${l.latitude.toFixed(2)},${l.longitude.toFixed(2)}`;
}

export function readCache(l: LocationSetting): CacheEntry | null {
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as CacheEntry | null;
    return entry && entry.key === locationKey(l) ? entry : null;
  } catch {
    return null;
  }
}

export function writeCache(l: LocationSetting, raw: ForecastRaw): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key: locationKey(l), raw, fetchedAt: Date.now() }));
  } catch {
    /* storage full or unavailable – ignore */
  }
}
