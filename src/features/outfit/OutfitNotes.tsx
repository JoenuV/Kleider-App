import { AlertTriangle, Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Problem } from '../../engine';

export function Reasons({ reasons, warnings }: { reasons: string[]; warnings: string[] }) {
  return (
    <div className="reasons">
      {warnings.map((w) => (
        <p key={w} className="reason warn">
          <AlertTriangle size={16} /> <span>{w}</span>
        </p>
      ))}
      {reasons.map((r) => (
        <p key={r} className="reason">
          <Check size={16} /> <span>{r}</span>
        </p>
      ))}
    </div>
  );
}

export function ProblemNotice({ problems }: { problems: Problem[] }) {
  return (
    <div className="notice" role="alert">
      <AlertTriangle size={20} />
      <div>
        <strong>Für ein vollständiges Outfit fehlt noch etwas:</strong>
        <ul>
          {problems.map((p) => (
            <li key={p.category}>{p.message}</li>
          ))}
        </ul>
        <Link to="/kleider" className="btn sm" style={{ marginTop: 12 }}>
          Zu den Kleidern
        </Link>
      </div>
    </div>
  );
}

export function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="notice info">
      <Info size={20} />
      <div>
        {notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  );
}
