import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChipSelect } from '../../components/inputs';
import { PageHeader } from '../../components/PageHeader';
import { updateSettings } from '../../db/repo';
import type { Settings } from '../../domain/types';
import { useSettings } from '../../hooks/useSettings';
import { BackupSection } from './BackupSection';

const THEMES = [
  { value: 'system', label: 'Automatisch' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const;

export function SettingsPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <button className="btn ghost sm" style={{ marginLeft: -4, marginBottom: 6 }} onClick={() => navigate(-1)}>
            <ChevronLeft size={16} /> Zurück
          </button>
        }
        title="Einstellungen"
      />
      <section className="section">
        <h2 className="section-title">Darstellung</h2>
        <div className="card">
          <ChipSelect<Settings['theme']>
            label="Farbschema"
            options={THEMES}
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </div>
      </section>
      <BackupSection />
      <p className="tiny muted" style={{ marginTop: 28, textAlign: 'center' }}>
        Kleider-App · alle Daten bleiben lokal auf deinem Gerät
      </p>
    </div>
  );
}
