import { Camera, ChevronLeft, Heart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFeedback } from '../../components/feedback';
import { ChipMulti, ChipSelect, LevelInput, StarInput, Switch } from '../../components/inputs';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { addGarment, deleteGarment, updateGarment } from '../../db/repo';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  COLORS,
  COLOR_KEYS,
  OCCASIONS,
  OCCASION_LABEL,
  PATTERNS,
  PATTERN_LABEL,
  STATUSES,
  STATUS_LABEL,
  STYLES,
  STYLE_LABEL,
  WARMTH_LABEL,
} from '../../domain/constants';
import type { Category, GarmentDraft } from '../../domain/types';
import { useWearStats } from '../../hooks/useData';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { formatShortDate } from '../../lib/date';
import type { ProcessedImage } from '../../lib/image';
import { garmentTitle } from '../../lib/wardrobeFilter';
import { PhotoPicker } from './PhotoPicker';
import { takePendingPhoto } from './pendingPhoto';

const DEFAULT_WARMTH: Record<Category, GarmentDraft['warmth']> = {
  top: 2,
  midlayer: 3,
  jacket: 4,
  pants: 3,
  shoes: 3,
  accessory: 1,
  headwear: 2,
};

type FormState = Omit<GarmentDraft, 'photo' | 'thumb' | 'category'> & {
  photo: Blob | null;
  thumb: Blob | null;
  category: Category | null;
};

function emptyForm(img: ProcessedImage | null): FormState {
  return {
    photo: img?.photo ?? null,
    thumb: img?.thumb ?? null,
    name: '',
    category: null,
    colors: img?.colors ?? [],
    pattern: 'uni',
    styles: [],
    warmth: 2,
    rainproof: false,
    windproof: false,
    delicate: false,
    occasions: [],
    status: 'verfuegbar',
    rating: 0,
    comfort: 3,
    look: 3,
    note: '',
    favorite: false,
  };
}

export function GarmentEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'neu';
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const wear = useWearStats();
  const [form, setForm] = useState<FormState | null>(() => (isNew ? emptyForm(takePendingPhoto()) : null));
  const [warmthTouched, setWarmthTouched] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoUrl = useObjectUrl(form?.photo);

  useEffect(() => {
    if (isNew) return;
    db.garments.get(id).then((g) => {
      if (!g) setNotFound(true);
      else {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = g;
        setForm(rest);
      }
    });
  }, [id, isNew]);

  if (notFound) {
    return (
      <div className="page">
        <p className="muted">Dieses Kleidungsstück gibt es nicht mehr.</p>
        <button className="btn" onClick={() => navigate('/kleider')} style={{ marginTop: 12 }}>
          Zur Übersicht
        </button>
      </div>
    );
  }
  if (!form) return <div className="page" />;

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setCategory = (category: Category) =>
    set(warmthTouched ? { category } : { category, warmth: DEFAULT_WARMTH[category] });

  const canSave = !!form.photo && !!form.thumb && !!form.category && !saving;

  const save = async () => {
    if (!form.photo || !form.thumb || !form.category) return;
    setSaving(true);
    const draft: GarmentDraft = { ...form, photo: form.photo, thumb: form.thumb, category: form.category };
    try {
      if (isNew) {
        await addGarment(draft);
        toast(`${garmentTitle(draft)} gespeichert.`);
      } else {
        await updateGarment(id, draft);
        toast('Änderungen gespeichert.');
      }
      navigate('/kleider', { replace: true });
    } catch (e) {
      toast(`Speichern fehlgeschlagen: ${(e as Error).message}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    const ok = await confirm({
      title: 'Kleidungsstück löschen?',
      message: `«${garmentTitle({ ...form, category: form.category ?? 'top' })}» wird endgültig gelöscht. Alternativ kannst du es als «aussortiert» markieren.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!ok) return;
    await deleteGarment(id);
    toast('Gelöscht.');
    navigate('/kleider', { replace: true });
  };

  const stats = !isNew ? wear.get(id) : undefined;

  return (
    <div className="page editor">
      <div className="editor-top">
        <button className="btn ghost sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Zurück
        </button>
        <button
          className={`icon-btn${form.favorite ? ' on' : ''}`}
          aria-pressed={form.favorite}
          aria-label="Favorit"
          onClick={() => set({ favorite: !form.favorite })}
        >
          <Heart size={24} fill={form.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {form.photo ? (
        <div className="hero-photo">
          <img src={photoUrl} alt="" />
          <button className="btn sm replace" onClick={() => setReplacing(true)}>
            <Camera size={16} /> Foto ersetzen
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Füge zuerst ein Foto hinzu.
          </p>
          <PhotoPicker onPicked={(img) => set({ photo: img.photo, thumb: img.thumb, colors: form.colors.length ? form.colors : img.colors })} />
        </div>
      )}

      {stats && (
        <p className="worn-line">
          {stats.count}× getragen{stats.last && ` · zuletzt ${formatShortDate(stats.last)}`}
        </p>
      )}

      <div className="form-sections">
        <div className="field">
          <span className="label">Kategorie *</span>
          <ChipSelect
            label="Kategorie"
            options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
            value={form.category}
            onChange={setCategory}
          />
        </div>

        <div className="field">
          <span className="label">
            Farben {form.colors.length > 0 && !isNew ? '' : <span className="muted tiny">· aus dem Foto erkannt, bitte prüfen</span>}
          </span>
          <ChipMulti
            label="Farben"
            options={COLOR_KEYS.map((value) => ({ value, label: COLORS[value].label, swatch: COLORS[value].hex }))}
            value={form.colors}
            onChange={(colors) => set({ colors })}
          />
        </div>

        <div className="field">
          <span className="label">Muster</span>
          <ChipSelect
            label="Muster"
            options={PATTERNS.map((value) => ({ value, label: PATTERN_LABEL[value] }))}
            value={form.pattern}
            onChange={(pattern) => set({ pattern })}
          />
        </div>

        <div className="field">
          <span className="label">Stil</span>
          <ChipMulti
            label="Stil"
            options={STYLES.map((value) => ({ value, label: STYLE_LABEL[value] }))}
            value={form.styles}
            onChange={(styles) => set({ styles })}
          />
        </div>

        <div className="field">
          <span className="label">
            Wärmegrad · <span className="muted">{WARMTH_LABEL[form.warmth]}</span>
          </span>
          <LevelInput
            label="Wärmegrad"
            cumulative
            value={form.warmth}
            onChange={(warmth) => {
              setWarmthTouched(true);
              set({ warmth });
            }}
          />
        </div>

        <div className="field">
          <span className="label">Wetterfestigkeit & Pflege</span>
          <div className="card flat">
            <Switch label="Regenfest" checked={form.rainproof} onChange={(rainproof) => set({ rainproof })} />
            <Switch label="Winddicht" checked={form.windproof} onChange={(windproof) => set({ windproof })} />
            <Switch
              label="Empfindlich"
              hint="z. B. Seide, helles Wildleder"
              checked={form.delicate}
              onChange={(delicate) => set({ delicate })}
            />
          </div>
        </div>

        <div className="field">
          <span className="label">
            Anlässe <span className="muted tiny">· nichts gewählt = passt überall</span>
          </span>
          <ChipMulti
            label="Anlässe"
            options={OCCASIONS.map((value) => ({ value, label: OCCASION_LABEL[value] }))}
            value={form.occasions}
            onChange={(occasions) => set({ occasions })}
          />
        </div>

        <div className="field">
          <span className="label">Deine Bewertung</span>
          <StarInput label="Gesamtbewertung" value={form.rating} onChange={(rating) => set({ rating })} />
        </div>

        <div className="two-col">
          <div className="field">
            <span className="label">Komfort</span>
            <LevelInput label="Komfort" cumulative value={form.comfort} onChange={(comfort) => set({ comfort })} />
          </div>
          <div className="field">
            <span className="label">Look</span>
            <LevelInput label="Look" cumulative value={form.look} onChange={(look) => set({ look })} />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="g-name">
            Name <span className="muted tiny">· optional</span>
          </label>
          <input
            id="g-name"
            className="input"
            value={form.name}
            placeholder={form.category ? garmentTitle({ ...form, category: form.category, name: '' }) : 'z. B. Lieblingsjeans'}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="g-note">
            Notiz <span className="muted tiny">· optional</span>
          </label>
          <textarea
            id="g-note"
            className="textarea"
            value={form.note}
            placeholder="z. B. fällt klein aus, nur kalt waschen"
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>

        <div className="field">
          <span className="label">Status</span>
          <ChipSelect
            label="Status"
            options={STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))}
            value={form.status}
            onChange={(status) => set({ status })}
          />
        </div>

        {!isNew && (
          <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={remove}>
            <Trash2 size={18} /> Löschen
          </button>
        )}
      </div>

      <div className="save-bar">
        <button className="btn primary lg block" disabled={!canSave} onClick={save}>
          {!form.category ? 'Kategorie wählen' : isNew ? 'Speichern' : 'Änderungen speichern'}
        </button>
      </div>

      <Sheet open={replacing} onClose={() => setReplacing(false)} title="Foto ersetzen">
        <PhotoPicker
          onPicked={(img) => {
            set({ photo: img.photo, thumb: img.thumb });
            setReplacing(false);
          }}
        />
      </Sheet>
    </div>
  );
}
