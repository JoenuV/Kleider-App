import { CalendarPlus, Trash2 } from 'lucide-react';
import { Collage } from '../../components/Collage';
import { useFeedback } from '../../components/feedback';
import { StarInput } from '../../components/inputs';
import { Sheet } from '../../components/Sheet';
import { deleteOutfit, markWorn, rateOutfit, unmarkWorn } from '../../db/repo';
import type { Category, Garment, Outfit, WearLog } from '../../domain/types';
import { formatShortDate, toDateKey } from '../../lib/date';
import { Reasons } from '../outfit/OutfitNotes';

export function outfitItems(o: Pick<Outfit, 'itemIds'>, byId: Map<string, Garment>) {
  const items: Partial<Record<Category, Garment>> = {};
  let missing = 0;
  for (const id of o.itemIds) {
    const g = byId.get(id);
    if (g) items[g.category] = g;
    else missing++;
  }
  return { items, missing };
}

const SOURCE_LABEL: Record<Outfit['source'], string> = {
  heute: 'Outfit des Tages',
  maker: 'Outfit-Maker',
  manuell: 'Selbst zusammengestellt',
};

export function OutfitSheet({
  outfit,
  logs,
  byId,
  onClose,
  focusLog,
}: {
  outfit: Outfit | null;
  logs: WearLog[];
  byId: Map<string, Garment>;
  onClose: () => void;
  focusLog?: WearLog;
}) {
  const { confirm, toast } = useFeedback();
  if (!outfit) return null;
  const { items, missing } = outfitItems(outfit, byId);
  const worn = logs.filter((l) => l.outfitId === outfit.id).sort((a, b) => b.date.localeCompare(a.date));
  const wornToday = worn.some((l) => l.date === toDateKey());
  const w = outfit.context.weather;

  return (
    <Sheet open onClose={onClose} title={outfit.context.activityName ?? SOURCE_LABEL[outfit.source]}>
      <div className="stack" style={{ gap: 16 }}>
        <p className="small muted">
          {SOURCE_LABEL[outfit.source]} · erstellt {formatShortDate(toDateKey(new Date(outfit.createdAt)))}
          {w && ` · ${Math.round(w.windowMin)}–${Math.round(w.windowMax)}° in ${w.locationName}`}
        </p>
        <Collage items={items} />
        {missing > 0 && (
          <p className="small muted">
            {missing === 1 ? '1 Teil wurde inzwischen gelöscht.' : `${missing} Teile wurden inzwischen gelöscht.`}
          </p>
        )}
        <div className="field">
          <span className="label">Wie fandest du das Outfit?</span>
          <StarInput
            label="Outfit bewerten"
            value={outfit.rating}
            onChange={async (rating) => {
              await rateOutfit(outfit.id, rating);
              toast(rating ? 'Danke – fliesst in künftige Vorschläge ein.' : 'Bewertung entfernt.');
            }}
          />
        </div>
        {outfit.reasons.length > 0 && <Reasons reasons={outfit.reasons} warnings={[]} />}
        <div className="field">
          <span className="label">Getragen</span>
          {worn.length === 0 ? (
            <p className="small muted">Noch nie – nur gemerkt.</p>
          ) : (
            <div className="chips">
              {worn.map((l) => (
                <button
                  key={l.id}
                  className="chip"
                  aria-pressed={focusLog?.id === l.id}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Eintrag entfernen?',
                      message: `Der Eintrag vom ${formatShortDate(l.date)} wird aus dem Verlauf entfernt. Das Outfit bleibt gespeichert.`,
                      confirmLabel: 'Entfernen',
                      danger: true,
                    });
                    if (ok) await unmarkWorn(l.id);
                  }}
                >
                  {formatShortDate(l.date)} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="dialog-actions">
          <button
            className="btn danger"
            style={{ flex: '0 0 auto' }}
            aria-label="Outfit löschen"
            onClick={async () => {
              const ok = await confirm({
                title: 'Outfit löschen?',
                message: 'Das Outfit und alle zugehörigen Einträge im Verlauf werden gelöscht. Die Kleider bleiben erhalten.',
                confirmLabel: 'Löschen',
                danger: true,
              });
              if (!ok) return;
              await deleteOutfit(outfit.id);
              onClose();
              toast('Outfit gelöscht.');
            }}
          >
            <Trash2 size={18} />
          </button>
          <button
            className="btn primary"
            disabled={wornToday || missing === outfit.itemIds.length}
            onClick={async () => {
              await markWorn(outfit.id);
              toast('Als heute getragen eingetragen.');
            }}
          >
            <CalendarPlus size={18} /> {wornToday ? 'Heute getragen' : 'Heute nochmals tragen'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
