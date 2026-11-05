import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFeedback } from '../../components/feedback';
import { ChipMulti, ChipSelect, RangeSlider, Switch } from '../../components/inputs';
import { Sheet } from '../../components/Sheet';
import { deleteActivity, saveActivity } from '../../db/repo';
import { DEFAULT_SLIDERS, OCCASIONS, OCCASION_LABEL, STYLES, STYLE_LABEL } from '../../domain/constants';
import type { Activity, Occasion } from '../../domain/types';
import { newId } from '../../lib/id';
import { SLIDER_DEFS } from '../outfit/sliders';

const OCC_OPTIONS = [
  { value: 'alle' as const, label: 'Alle Kleider' },
  ...OCCASIONS.map((value) => ({ value, label: OCCASION_LABEL[value] })),
];

export function newActivity(order: number): Activity {
  return {
    id: newId(),
    name: '',
    builtIn: false,
    order,
    rules: {
      occasion: null,
      preferStyles: [],
      avoidStyles: [],
      avoidDelicate: false,
      preferRobust: false,
      sliders: { ...DEFAULT_SLIDERS },
      note: '',
    },
  };
}

export function ActivityEditor({
  activity,
  onClose,
  onSaved,
}: {
  activity: Activity | null;
  onClose: () => void;
  onSaved?: (a: Activity) => void;
}) {
  const { confirm, toast } = useFeedback();
  const [draft, setDraft] = useState<Activity | null>(activity);
  useEffect(() => setDraft(activity), [activity]);

  if (!draft) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const rules = draft.rules;
  const setRules = (patch: Partial<Activity['rules']>) => setDraft({ ...draft, rules: { ...rules, ...patch } });

  const save = async () => {
    const a = { ...draft, name: draft.name.trim() };
    await saveActivity(a);
    toast(`«${a.name}» gespeichert.`);
    onSaved?.(a);
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `«${draft.name}» löschen?`,
      message: 'Die Tätigkeit und ihre Regeln werden gelöscht. Gespeicherte Outfits bleiben erhalten.',
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!ok) return;
    await deleteActivity(draft.id);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={draft.builtIn ? `Regeln für «${draft.name}»` : draft.name ? 'Tätigkeit bearbeiten' : 'Eigene Tätigkeit'}>
      <div className="stack" style={{ gap: 20, marginTop: 8 }}>
        {!draft.builtIn && (
          <div className="field">
            <label className="label" htmlFor="act-name">
              Name
            </label>
            <input
              id="act-name"
              className="input"
              value={draft.name}
              placeholder="z. B. Werkstatt, Wandern, Date"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
        )}
        <div className="field">
          <span className="label">Welche Kleider kommen in Frage?</span>
          <ChipSelect
            options={OCC_OPTIONS}
            value={rules.occasion ?? 'alle'}
            onChange={(v) => setRules({ occasion: v === 'alle' ? null : (v as Occasion) })}
          />
          <span className="tiny muted">Nur Kleider, die für diesen Anlass markiert sind (oder für alle Anlässe).</span>
        </div>
        <div className="field">
          <span className="label">Bevorzugter Stil</span>
          <ChipMulti
            options={STYLES.map((value) => ({ value, label: STYLE_LABEL[value] }))}
            value={rules.preferStyles}
            onChange={(preferStyles) => setRules({ preferStyles, avoidStyles: rules.avoidStyles.filter((s) => !preferStyles.includes(s)) })}
          />
        </div>
        <div className="field">
          <span className="label">Stil vermeiden</span>
          <ChipMulti
            options={STYLES.map((value) => ({ value, label: STYLE_LABEL[value] }))}
            value={rules.avoidStyles}
            onChange={(avoidStyles) => setRules({ avoidStyles, preferStyles: rules.preferStyles.filter((s) => !avoidStyles.includes(s)) })}
          />
        </div>
        <div className="card flat">
          <Switch
            label="Keine empfindlichen Kleider"
            checked={rules.avoidDelicate}
            onChange={(avoidDelicate) => setRules({ avoidDelicate })}
          />
          <Switch
            label="Praktisch & robust bevorzugen"
            hint="bequem, wetterfest, nicht empfindlich"
            checked={rules.preferRobust}
            onChange={(preferRobust) => setRules({ preferRobust })}
          />
        </div>
        <div className="field">
          <span className="label">Grundeinstellung</span>
          <div className="stack" style={{ gap: 6 }}>
            {SLIDER_DEFS.map((d) => (
              <RangeSlider
                key={d.key}
                label={d.label}
                left={d.left}
                right={d.right}
                value={rules.sliders[d.key]}
                onChange={(v) => setRules({ sliders: { ...rules.sliders, [d.key]: v } })}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="act-note">
            Notiz
          </label>
          <textarea
            id="act-note"
            className="textarea"
            value={rules.note}
            placeholder="z. B. praktisch, robust, keine empfindlichen Kleider"
            onChange={(e) => setRules({ note: e.target.value })}
          />
        </div>
        <div className="dialog-actions">
          {!draft.builtIn && draft.name && (
            <button className="btn danger" style={{ flex: '0 0 auto' }} onClick={remove} aria-label="Löschen">
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={!draft.name.trim()} onClick={save}>
            Speichern
          </button>
        </div>
      </div>
    </Sheet>
  );
}
