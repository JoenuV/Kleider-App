import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Collage } from '../../components/Collage';
import { useFeedback } from '../../components/feedback';
import { StarInput } from '../../components/inputs';
import { db } from '../../db/db';
import { rateOutfit } from '../../db/repo';
import type { Garment } from '../../domain/types';
import { toDateKey } from '../../lib/date';
import { outfitItems } from '../history/OutfitSheet';

const DISMISS_KEY = 'kleider.yesterdayDismissed';

/** Asks for a quick rating of yesterday's outfit – feeds the learning. */
export function YesterdayRating({ byId }: { byId: Map<string, Garment> }) {
  const { toast } = useFeedback();
  const yesterday = toDateKey(new Date(Date.now() - 86_400_000));
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === yesterday;
    } catch {
      return false;
    }
  });
  const outfit = useLiveQuery(async () => {
    const log = await db.wearLogs.where('date').equals(yesterday).last();
    return log ? db.outfits.get(log.outfitId) : undefined;
  }, [yesterday]);

  if (dismissed || !outfit || outfit.rating > 0) return null;
  const { items } = outfitItems(outfit, byId);
  if (!Object.keys(items).length) return null;

  return (
    <section className="card yesterday">
      <div className="yesterday-img">
        <Collage items={items} size="sm" />
      </div>
      <div className="grow">
        <p className="card-title" style={{ fontSize: 15 }}>
          Wie war dein Outfit gestern?
        </p>
        <StarInput
          label="Outfit von gestern bewerten"
          value={0}
          onChange={async (v) => {
            if (!v) return;
            await rateOutfit(outfit.id, v);
            toast('Danke! Das fliesst in künftige Vorschläge ein.');
          }}
        />
      </div>
      <button
        className="icon-btn sm-icon"
        aria-label="Nicht bewerten"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, yesterday);
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        <X size={16} />
      </button>
    </section>
  );
}
