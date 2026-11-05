import { useCallback, useEffect, useState } from 'react';
import type { Settings, WeatherSummary } from '../domain/types';
import { toDateKey } from '../lib/date';
import { fetchForecast, readCache, summarize, writeCache } from '../lib/weather';

export type WeatherState =
  | { status: 'loading' }
  | { status: 'ready'; summary: WeatherSummary; stale: boolean; error?: string }
  | { status: 'error'; error: string };

const MANUAL_KEY = 'kleider.manualWeather.v1';
const MAX_CACHE_AGE = 36 * 3600_000;

function readManual(): WeatherSummary | null {
  try {
    const v = JSON.parse(localStorage.getItem(MANUAL_KEY) ?? 'null') as { date: string; summary: WeatherSummary } | null;
    return v && v.date === toDateKey() ? v.summary : null;
  } catch {
    return null;
  }
}

export function useWeather(settings: Settings) {
  const { location, windowFrom, windowTo } = settings;
  const [state, setState] = useState<WeatherState>({ status: 'loading' });
  const [manual, setManualState] = useState<WeatherSummary | null>(readManual);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (manual) {
      setState({ status: 'ready', summary: manual, stale: false });
      return;
    }
    let cancelled = false;
    const cached = readCache(location);
    const fromCache = () => {
      if (!cached || Date.now() - cached.fetchedAt > MAX_CACHE_AGE) return null;
      try {
        return summarize(cached.raw, windowFrom, windowTo, location.name, undefined, cached.fetchedAt);
      } catch {
        return null;
      }
    };
    const cachedSummary = fromCache();
    if (cachedSummary) setState({ status: 'ready', summary: cachedSummary, stale: true });
    else setState({ status: 'loading' });

    fetchForecast(location.latitude, location.longitude)
      .then((raw) => {
        if (cancelled) return;
        writeCache(location, raw);
        setState({ status: 'ready', summary: summarize(raw, windowFrom, windowTo, location.name), stale: false });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (cachedSummary) setState({ status: 'ready', summary: cachedSummary, stale: true, error: e.message });
        else setState({ status: 'error', error: e.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location is compared by value
  }, [location.latitude, location.longitude, location.name, windowFrom, windowTo, manual, nonce]);

  const setManual = useCallback((s: WeatherSummary | null) => {
    try {
      if (s) localStorage.setItem(MANUAL_KEY, JSON.stringify({ date: toDateKey(), summary: s }));
      else localStorage.removeItem(MANUAL_KEY);
    } catch {
      /* ignore */
    }
    setManualState(s);
  }, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { state, manual, setManual, refresh };
}
