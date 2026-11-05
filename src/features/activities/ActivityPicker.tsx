import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Activity } from '../../domain/types';
import { ActivityEditor, newActivity } from './ActivityEditor';

export function ActivityPicker({
  activities,
  value,
  onChange,
}: {
  activities: Activity[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Activity | null>(null);
  const selected = activities.find((a) => a.id === value);
  return (
    <div className="activity-picker">
      <div className="chips scroll" role="radiogroup" aria-label="Tätigkeit">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={a.id === value}
            aria-pressed={a.id === value}
            className="chip"
            onClick={() => onChange(a.id)}
          >
            {a.name}
          </button>
        ))}
        <button type="button" className="chip ghost-chip" onClick={() => setEditing(newActivity(activities.length))}>
          <Plus size={16} /> Eigene
        </button>
      </div>
      {selected && (
        <button className="activity-rules" onClick={() => setEditing(selected)}>
          <span className="truncate">
            {selected.rules.note || describeRules(selected)}
          </span>
          <Pencil size={14} />
        </button>
      )}
      {editing && (
        <ActivityEditor
          activity={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => onChange(a.id)}
        />
      )}
    </div>
  );
}

function describeRules(a: Activity): string {
  const parts: string[] = [];
  if (a.rules.avoidDelicate) parts.push('keine empfindlichen Kleider');
  if (a.rules.preferRobust) parts.push('praktisch & robust');
  if (!parts.length) return 'Regeln anpassen';
  return parts.join(', ');
}
