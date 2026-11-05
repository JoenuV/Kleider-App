import { Settings as Gear } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, SunArt } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { formatLongDate } from '../../lib/date';

export function TodayPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title="Heute"
        actions={
          <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen">
            <Gear size={22} />
          </Link>
        }
      />
      <EmptyState art={<SunArt />} title="Bald gibt's hier dein Outfit">
        Wetter und Tagesvorschlag folgen in Phase 4.
      </EmptyState>
    </div>
  );
}
