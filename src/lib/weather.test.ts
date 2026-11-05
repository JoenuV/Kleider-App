import { describe, expect, it } from 'vitest';
import { forecastUrl, manualWeather, summarize, weatherLabel, type ForecastRaw } from './weather';

function raw(): ForecastRaw {
  const time: string[] = [];
  const temp: number[] = [];
  const feels: number[] = [];
  const rain: number[] = [];
  for (const d of ['2026-11-05', '2026-11-06']) {
    for (let h = 0; h < 24; h++) {
      time.push(`${d}T${String(h).padStart(2, '0')}:00`);
      // cold morning, warm afternoon
      const t = 4 + 12 * Math.max(0, Math.sin(((h - 6) / 16) * Math.PI));
      temp.push(t);
      feels.push(t - 2);
      rain.push(d === '2026-11-06' ? 80 : h === 17 ? 40 : 10);
    }
  }
  return {
    current: { time: '2026-11-05T08:00', temperature_2m: 6, apparent_temperature: 4, wind_speed_10m: 12, weather_code: 2 },
    hourly: {
      time,
      temperature_2m: temp,
      apparent_temperature: feels,
      precipitation_probability: rain,
      wind_speed_10m: time.map(() => 10),
      weather_code: time.map(() => 3),
    },
    daily: { time: ['2026-11-05', '2026-11-06'], temperature_2m_max: [16, 15], temperature_2m_min: [3, 2] },
  };
}

describe('weather summary', () => {
  it('uses the remaining part of today’s window', () => {
    const s = summarize(raw(), 7, 19, 'Bern', '2026-11-05T08:00');
    expect(s.day).toBe('heute');
    expect(s.hourly?.[0]?.hour).toBe(8);
    expect(s.windowMin).toBeLessThan(s.windowMax);
    expect(s.windowMinHour).toBe(8);
    expect(s.windowMaxHour).toBe(14);
    expect(s.rainChance).toBe(40);
    expect(s.current).toBe(6);
    expect(s.dayMin).toBe(3);
  });

  it('switches to tomorrow after the window ended', () => {
    const s = summarize(raw(), 7, 19, 'Bern', '2026-11-05T21:00');
    expect(s.day).toBe('morgen');
    expect(s.hourly?.[0]?.hour).toBe(7);
    expect(s.rainChance).toBe(80);
    expect(s.dayMax).toBe(15);
  });

  it('builds a valid API url', () => {
    const url = forecastUrl(46.948, 7.4474);
    expect(url).toContain('latitude=46.9480');
    expect(url).toContain('apparent_temperature');
    expect(url).toContain('timezone=auto');
  });

  it('creates manual weather', () => {
    const m = manualWeather(15, 5, true, false, 'Bern');
    expect(m.windowMin).toBe(5);
    expect(m.windowMax).toBe(15);
    expect(m.rainChance).toBeGreaterThanOrEqual(50);
    expect(m.source).toBe('manual');
  });

  it('labels weather codes in German', () => {
    expect(weatherLabel(0)).toBe('Klar');
    expect(weatherLabel(63)).toBe('Regen');
  });
});
