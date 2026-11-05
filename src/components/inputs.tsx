import { Star } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  swatch?: string;
}

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  scroll,
  label,
}: {
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  scroll?: boolean;
  label?: string;
}) {
  return (
    <div className={`chips${scroll ? ' scroll' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.swatch && <span className="swatch" style={{ background: o.swatch }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipMulti<T extends string>({
  options,
  value,
  onChange,
  scroll,
  label,
}: {
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (v: T[]) => void;
  scroll?: boolean;
  label?: string;
}) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={`chips${scroll ? ' scroll' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={value.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.swatch && <span className="swatch" style={{ background: o.swatch }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint && <span className="muted small" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}

export function RangeSlider({
  value,
  onChange,
  left,
  right,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  label: string;
}) {
  return (
    <div className="range">
      <div className="ends" aria-hidden="true">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={`${value} von 100 (${left} bis ${right})`}
        style={{ '--fill': `${value}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: 0 | 1 | 2 | 3 | 4 | 5) => void;
  label: string;
}) {
  return (
    <div className="stars" role="radiogroup" aria-label={label}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'Stern' : 'Sterne'}`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(value === n ? 0 : n)}
        >
          <Star size={28} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  if (!value) return null;
  return (
    <span className="stars readonly" aria-label={`${value} von 5 Sternen`}>
      {Array.from({ length: value }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

export function LevelInput({
  value,
  onChange,
  label,
  cumulative,
}: {
  value: number;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  label: string;
  cumulative?: boolean;
}) {
  return (
    <div className="levels" role="radiogroup" aria-label={label}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value === n ? 'on' : cumulative && n < value ? 'in' : ''}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
