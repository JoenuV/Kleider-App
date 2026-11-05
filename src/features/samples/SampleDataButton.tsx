import { useState } from 'react';
import { useFeedback } from '../../components/feedback';
import { loadSampleData } from './sampleData';

export function SampleDataButton({ className = 'btn ghost' }: { className?: string }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const n = await loadSampleData();
          toast(`${n} Beispielkleider geladen. Du kannst sie in den Einstellungen wieder entfernen.`);
        } finally {
          setBusy(false);
        }
      }}
    >
      Beispieldaten ausprobieren
    </button>
  );
}
