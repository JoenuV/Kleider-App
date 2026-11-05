import { Download, Share2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { useFeedback } from '../../components/feedback';
import { ensureBuiltIns } from '../../db/repo';
import {
  backupFileName,
  backupStats,
  createBackup,
  parseBackup,
  restoreBackup,
  wipeAll,
  type BackupFile,
} from '../../lib/backup';

async function buildFile(): Promise<File> {
  const backup = await createBackup();
  return new File([JSON.stringify(backup)], backupFileName(), { type: 'application/json' });
}

export function BackupSection() {
  const { confirm, toast } = useFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;

  const download = async () => {
    setBusy(true);
    try {
      const file = await buildFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('Backup erstellt.');
    } catch (e) {
      toast(`Backup fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const file = await buildFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Kleider-Backup' });
      } else {
        await download();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(`Teilen fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const doRestore = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Alle Daten ersetzen?',
        message: 'Deine aktuellen Kleider, Outfits und der Verlauf werden gelöscht und durch das Backup ersetzt.',
        confirmLabel: 'Ersetzen',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await restoreBackup(pending, mode);
      await ensureBuiltIns();
      toast('Backup wiederhergestellt.');
      setPending(null);
    } catch (e) {
      toast(`Import fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    const ok = await confirm({
      title: 'Wirklich alles löschen?',
      message: 'Alle Kleider, Fotos, Outfits und der Verlauf werden auf diesem Gerät gelöscht. Erstelle vorher ein Backup.',
      confirmLabel: 'Alles löschen',
      danger: true,
    });
    if (!ok) return;
    await wipeAll();
    await ensureBuiltIns();
    toast('Alle Daten gelöscht.');
  };

  const stats = pending ? backupStats(pending) : null;

  return (
    <section className="section">
      <h2 className="section-title">Backup</h2>
      <div className="card stack">
        <p className="small muted">
          Deine Daten liegen nur auf diesem Gerät. Exportiere regelmässig ein Backup – es enthält alle Fotos.
        </p>
        <div className="row wrap">
          <button className="btn primary" onClick={download} disabled={busy}>
            <Download size={18} /> Exportieren
          </button>
          {canShare && (
            <button className="btn" onClick={share} disabled={busy}>
              <Share2 size={18} /> Teilen …
            </button>
          )}
          <button className="btn ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload size={18} /> Importieren
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button className="btn danger sm" style={{ alignSelf: 'flex-start' }} onClick={wipe}>
          <Trash2 size={16} /> Alle Daten löschen
        </button>
      </div>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Backup importieren">
        {stats && (
          <p className="muted">
            {stats.garments} Kleider, {stats.outfits} Outfits und {stats.wearLogs} Verlaufseinträge
            {pending?.exportedAt && ` vom ${new Date(pending.exportedAt).toLocaleDateString('de-CH')}`}.
          </p>
        )}
        <div className="stack" style={{ marginTop: 18 }}>
          <button className="btn primary block" onClick={() => doRestore('merge')} disabled={busy}>
            Zusammenführen
          </button>
          <p className="tiny muted">Behält deine aktuellen Daten und ergänzt sie mit dem Backup.</p>
          <button className="btn danger block" onClick={() => doRestore('replace')} disabled={busy}>
            Alles ersetzen
          </button>
          <button className="btn ghost block" onClick={() => setPending(null)}>
            Abbrechen
          </button>
        </div>
      </Sheet>
    </section>
  );
}
