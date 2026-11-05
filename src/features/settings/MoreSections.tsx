import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Download, HardDrive, Plus, Share, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFeedback } from '../../components/feedback';
import { db } from '../../db/db';
import type { Activity } from '../../domain/types';
import { useActivities } from '../../hooks/useData';
import { canPromptInstall, isIos, isStandalone, onInstallChange, promptInstall } from '../../lib/install';
import { ActivityEditor, newActivity } from '../activities/ActivityEditor';
import { SampleDataButton } from '../samples/SampleDataButton';
import { removeSampleData } from '../samples/sampleData';

export function ActivitiesSection() {
  const activities = useActivities();
  const [editing, setEditing] = useState<Activity | null>(null);
  return (
    <section className="section">
      <h2 className="section-title">Tätigkeiten & Regeln</h2>
      <div className="list">
        {activities?.map((a) => (
          <button key={a.id} className="list-item" onClick={() => setEditing(a)}>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 650 }}>{a.name}</span>
              <span className="sub">{a.rules.note || (a.builtIn ? 'Standard' : 'Eigene Tätigkeit')}</span>
            </span>
            <ChevronRight size={18} className="muted" />
          </button>
        ))}
        <button className="list-item" onClick={() => setEditing(newActivity(activities?.length ?? 0))}>
          <Plus size={18} />
          <span className="grow" style={{ fontWeight: 650 }}>
            Eigene Tätigkeit
          </span>
        </button>
      </div>
      {editing && <ActivityEditor activity={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

export function SamplesSection() {
  const { confirm, toast } = useFeedback();
  const count = useLiveQuery(() => db.garments.filter((g) => !!g.isSample).count(), []);
  if (count === undefined) return null;
  return (
    <section className="section">
      <h2 className="section-title">Beispieldaten</h2>
      <div className="card stack">
        {count > 0 ? (
          <>
            <p className="small muted">{count} Beispielkleider sind geladen. Deine eigenen Kleider bleiben beim Entfernen erhalten.</p>
            <button
              className="btn danger sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Beispieldaten entfernen?',
                  message: 'Alle Beispielkleider und Outfits, die nur aus Beispielkleidern bestehen, werden gelöscht.',
                  confirmLabel: 'Entfernen',
                  danger: true,
                });
                if (!ok) return;
                await removeSampleData();
                toast('Beispieldaten entfernt.');
              }}
            >
              Beispieldaten entfernen
            </button>
          </>
        ) : (
          <>
            <p className="small muted">Lade gezeichnete Beispielkleider mit kurzem Verlauf, um die App auszuprobieren.</p>
            <SampleDataButton className="btn sm" />
          </>
        )}
      </div>
    </section>
  );
}

export function InstallSection() {
  const { toast } = useFeedback();
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  if (isStandalone()) return null;
  return (
    <section className="section">
      <h2 className="section-title">Auf dem Homescreen</h2>
      <div className="card stack">
        {canPromptInstall() ? (
          <>
            <p className="small muted">Installiere die App – sie startet dann wie eine normale App und funktioniert offline.</p>
            <button
              className="btn primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                if (await promptInstall()) toast('Installiert!');
              }}
            >
              <Download size={18} /> App installieren
            </button>
          </>
        ) : isIos() ? (
          <p className="small">
            <Smartphone size={16} style={{ verticalAlign: -3 }} /> In Safari unten auf <Share size={15} style={{ verticalAlign: -2 }} />{' '}
            <strong>Teilen</strong> tippen und <strong>«Zum Home-Bildschirm»</strong> wählen.
          </p>
        ) : (
          <p className="small">
            <Smartphone size={16} style={{ verticalAlign: -3 }} /> Im Browser-Menü (⋮) <strong>«App installieren»</strong> oder{' '}
            <strong>«Zum Startbildschirm hinzufügen»</strong> wählen.
          </p>
        )}
      </div>
    </section>
  );
}

export function StorageSection() {
  const [info, setInfo] = useState<{ used: number; quota: number; persisted: boolean } | null>(null);
  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      if (est) setInfo({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted });
    })().catch(() => undefined);
  }, []);
  if (!info) return null;
  const mb = (n: number) => (n / 1024 / 1024).toLocaleString('de-CH', { maximumFractionDigits: 1 });
  return (
    <section className="section">
      <h2 className="section-title">Speicher</h2>
      <div className="card">
        <p className="small">
          <HardDrive size={16} style={{ verticalAlign: -3 }} /> {mb(info.used)} MB belegt
          {info.quota ? ` von ca. ${mb(info.quota)} MB` : ''}.
        </p>
        <p className="tiny muted" style={{ marginTop: 6 }}>
          {info.persisted
            ? 'Der Browser hält deine Daten dauerhaft fest.'
            : 'Der Browser könnte Daten bei Speichermangel löschen – exportiere regelmässig ein Backup oder installiere die App.'}
        </p>
      </div>
    </section>
  );
}
