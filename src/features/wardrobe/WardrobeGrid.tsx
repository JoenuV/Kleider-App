import { Heart, Plus, Search, Settings as Gear, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, HangerArt } from '../../components/EmptyState';
import { GarmentImage } from '../../components/GarmentImage';
import { ChipMulti, ChipSelect, Stars, Switch } from '../../components/inputs';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import {
  CATEGORIES,
  CATEGORY_LABEL_PLURAL,
  COLORS,
  COLOR_KEYS,
  OCCASIONS,
  OCCASION_LABEL,
  STATUSES,
  STATUS_LABEL,
  STYLES,
  STYLE_LABEL,
} from '../../domain/constants';
import type { Category, Garment } from '../../domain/types';
import { useGarments, useWearStats } from '../../hooks/useData';
import {
  activeFilterCount,
  EMPTY_FILTER,
  filterGarments,
  garmentTitle,
  SORT_LABEL,
  type SortKey,
  type WardrobeFilter,
} from '../../lib/wardrobeFilter';
import { PhotoPicker } from './PhotoPicker';
import { setPendingPhoto } from './pendingPhoto';

// Keep filters while navigating between list and editor.
let rememberedFilter: WardrobeFilter = EMPTY_FILTER;

const SORT_OPTIONS = (Object.keys(SORT_LABEL) as SortKey[]).map((value) => ({ value, label: SORT_LABEL[value] }));
const STATUS_OPTIONS = [
  { value: 'aktiv' as const, label: 'Aktiv' },
  ...STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] })),
  { value: 'alle' as const, label: 'Alle' },
];

export function WardrobeGrid({ onLoadSamples }: { onLoadSamples?: () => void }) {
  const garments = useGarments();
  const wear = useWearStats();
  const navigate = useNavigate();
  const [filter, setFilterState] = useState<WardrobeFilter>(rememberedFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSearch, setShowSearch] = useState(filter.query !== '');

  const setFilter = (patch: Partial<WardrobeFilter>) => {
    setFilterState((f) => {
      const next = { ...f, ...patch };
      rememberedFilter = next;
      return next;
    });
  };

  const visible = useMemo(() => filterGarments(garments ?? [], filter, wear), [garments, filter, wear]);
  const counts = useMemo(() => {
    const m = new Map<Category, number>();
    for (const g of garments ?? []) if (g.status !== 'aussortiert') m.set(g.category, (m.get(g.category) ?? 0) + 1);
    return m;
  }, [garments]);
  const nFilters = activeFilterCount(filter);

  const addButton = (
    <button className="fab" onClick={() => setShowAdd(true)} aria-label="Kleidungsstück hinzufügen">
      <Plus size={28} strokeWidth={2.2} />
    </button>
  );

  if (garments && garments.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Kleider" actions={<GearLink />} />
        <EmptyState
          art={<HangerArt />}
          title="Dein Kleiderschrank ist noch leer"
          actions={
            <>
              <button className="btn primary lg" onClick={() => setShowAdd(true)}>
                <Plus size={20} /> Erstes Teil fotografieren
              </button>
              {onLoadSamples && (
                <button className="btn ghost" onClick={onLoadSamples}>
                  Beispieldaten laden
                </button>
              )}
            </>
          }
        >
          Fotografiere deine Lieblingsteile – für ein vollständiges Outfit brauchst du mindestens ein Oberteil, eine Hose
          und Schuhe.
        </EmptyState>
        <AddSheet open={showAdd} onClose={() => setShowAdd(false)} onPicked={() => navigate('/kleider/neu')} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={garments ? `${visible.length} von ${garments.length} Teilen` : ' '}
        title="Kleider"
        actions={
          <>
            <button
              className={`icon-btn${showSearch ? ' on' : ''}`}
              aria-label="Suchen"
              onClick={() => {
                if (showSearch) setFilter({ query: '' });
                setShowSearch(!showSearch);
              }}
            >
              {showSearch ? <X size={22} /> : <Search size={22} />}
            </button>
            <button className="icon-btn badge-host" aria-label="Filter und Sortierung" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal size={22} />
              {nFilters > 0 && <span className="badge">{nFilters}</span>}
            </button>
            <GearLink />
          </>
        }
      />

      {showSearch && (
        <div className="search-box">
          <Search size={18} />
          <input
            className="input"
            type="search"
            autoFocus
            placeholder="Name, Farbe, Stil …"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
            aria-label="Kleider durchsuchen"
          />
        </div>
      )}

      <div className="chips scroll" role="group" aria-label="Kategorie">
        <button className="chip" aria-pressed={filter.category === null} onClick={() => setFilter({ category: null })}>
          Alle
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className="chip"
            aria-pressed={filter.category === c}
            onClick={() => setFilter({ category: filter.category === c ? null : c })}
          >
            {CATEGORY_LABEL_PLURAL[c]}
            <span className="chip-count">{counts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 && garments ? (
        <EmptyState
          title="Nichts gefunden"
          actions={
            <button className="btn" onClick={() => setFilter({ ...EMPTY_FILTER, sort: filter.sort })}>
              Filter zurücksetzen
            </button>
          }
        >
          Keine Kleider passen zu Suche und Filtern.
        </EmptyState>
      ) : (
        <div className="garment-grid">
          {visible.map((g) => (
            <GarmentCard key={g.id} garment={g} wornCount={wear.get(g.id)?.count ?? 0} />
          ))}
        </div>
      )}

      {addButton}

      <AddSheet open={showAdd} onClose={() => setShowAdd(false)} onPicked={() => navigate('/kleider/neu')} />

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sortierung">
        <div className="stack" style={{ gap: 20 }}>
          <div className="field">
            <span className="label">Sortieren</span>
            <ChipSelect options={SORT_OPTIONS} value={filter.sort} onChange={(sort) => setFilter({ sort })} />
          </div>
          <div className="field">
            <span className="label">Status</span>
            <ChipSelect options={STATUS_OPTIONS} value={filter.status} onChange={(status) => setFilter({ status })} />
          </div>
          <Switch
            label="Nur Favoriten"
            checked={filter.favoritesOnly}
            onChange={(favoritesOnly) => setFilter({ favoritesOnly })}
          />
          <div className="field">
            <span className="label">Stil</span>
            <ChipMulti
              options={STYLES.map((value) => ({ value, label: STYLE_LABEL[value] }))}
              value={filter.styles}
              onChange={(styles) => setFilter({ styles })}
            />
          </div>
          <div className="field">
            <span className="label">Anlass</span>
            <ChipMulti
              options={OCCASIONS.map((value) => ({ value, label: OCCASION_LABEL[value] }))}
              value={filter.occasions}
              onChange={(occasions) => setFilter({ occasions })}
            />
          </div>
          <div className="field">
            <span className="label">Farbe</span>
            <ChipMulti
              options={COLOR_KEYS.map((value) => ({ value, label: COLORS[value].label, swatch: COLORS[value].hex }))}
              value={filter.colors}
              onChange={(colors) => setFilter({ colors })}
            />
          </div>
          <div className="dialog-actions">
            <button className="btn ghost" onClick={() => setFilter({ ...EMPTY_FILTER, query: filter.query, category: filter.category })}>
              Zurücksetzen
            </button>
            <button className="btn primary" onClick={() => setShowFilters(false)}>
              {visible.length} anzeigen
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function GearLink() {
  return (
    <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen">
      <Gear size={22} />
    </Link>
  );
}

function GarmentCard({ garment, wornCount }: { garment: Garment; wornCount: number }) {
  return (
    <Link to={`/kleider/${garment.id}`} className={`garment-card status-${garment.status}`}>
      <div className="frame">
        <GarmentImage garment={garment} />
        {garment.favorite && (
          <span className="fav" aria-label="Favorit">
            <Heart size={14} fill="currentColor" strokeWidth={0} />
          </span>
        )}
        {garment.status !== 'verfuegbar' && <span className="status-tag">{STATUS_LABEL[garment.status]}</span>}
      </div>
      <div className="meta">
        <span className="name">{garmentTitle(garment)}</span>
        <span className="sub">
          <Stars value={garment.rating} size={11} />
          {wornCount > 0 && <span>{wornCount}× getragen</span>}
        </span>
      </div>
    </Link>
  );
}

export function AddSheet({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  onPicked: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Neues Kleidungsstück">
      <p className="muted small" style={{ marginBottom: 16 }}>
        Tipp: Lege das Teil flach auf einen ruhigen, hellen Untergrund. Das Foto bleibt auf deinem Gerät.
      </p>
      <PhotoPicker
        onPicked={(img) => {
          setPendingPhoto(img);
          onClose();
          onPicked();
        }}
      />
    </Sheet>
  );
}
