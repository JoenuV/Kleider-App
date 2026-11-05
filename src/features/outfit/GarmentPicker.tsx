import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GarmentImage } from '../../components/GarmentImage';
import { Sheet } from '../../components/Sheet';
import { CATEGORIES, CATEGORY_LABEL_PLURAL } from '../../domain/constants';
import type { Category, Garment } from '../../domain/types';
import { garmentTitle } from '../../lib/wardrobeFilter';

/** Bottom sheet with a photo grid to pick one or several garments. */
export function GarmentPicker({
  open,
  onClose,
  title,
  garments,
  selected,
  multi,
  onChange,
  hint,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  garments: Garment[];
  selected: string[];
  multi?: boolean;
  onChange: (ids: string[]) => void;
  hint?: string;
}) {
  const [cat, setCat] = useState<Category | null>(null);
  const cats = useMemo(() => CATEGORIES.filter((c) => garments.some((g) => g.category === c)), [garments]);
  const list = cat ? garments.filter((g) => g.category === cat) : garments;

  const toggle = (id: string) => {
    if (multi) onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    else {
      onChange(selected.includes(id) ? [] : [id]);
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {hint && <p className="small muted" style={{ marginBottom: 12 }}>{hint}</p>}
      <div className="chips scroll" style={{ marginBottom: 12 }}>
        <button className="chip" aria-pressed={cat === null} onClick={() => setCat(null)}>
          Alle
        </button>
        {cats.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABEL_PLURAL[c]}
          </button>
        ))}
      </div>
      <div className="picker-grid">
        {list.map((g) => {
          const on = selected.includes(g.id);
          return (
            <button key={g.id} className={`picker-item${on ? ' on' : ''}`} onClick={() => toggle(g.id)} aria-pressed={on}>
              <GarmentImage garment={g} />
              {on && (
                <span className="picker-check">
                  <Check size={16} strokeWidth={3} />
                </span>
              )}
              <span className="picker-name">{garmentTitle(g)}</span>
            </button>
          );
        })}
      </div>
      {multi && (
        <div className="dialog-actions">
          {selected.length > 0 && (
            <button className="btn ghost" onClick={() => onChange([])}>
              Keine
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            Fertig{selected.length ? ` (${selected.length})` : ''}
          </button>
        </div>
      )}
    </Sheet>
  );
}
