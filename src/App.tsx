import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { FeedbackProvider } from './components/feedback';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ensureBuiltIns } from './db/repo';
import { HistoryPage } from './features/history/HistoryPage';
import { MakerPage } from './features/maker/MakerPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TodayPage } from './features/today/TodayPage';
import { WardrobePage } from './features/wardrobe/WardrobePage';
import { useSettings } from './hooks/useSettings';
import { useApplyTheme } from './hooks/useTheme';

export function App() {
  const settings = useSettings();
  useApplyTheme(settings.theme);

  useEffect(() => {
    ensureBuiltIns().catch(console.error);
    // Ask the browser to keep our IndexedDB data (photos!) even under storage pressure.
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  return (
    <FeedbackProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/maker" element={<MakerPage />} />
            <Route path="/kleider/*" element={<WardrobePage />} />
            <Route path="/verlauf" element={<HistoryPage />} />
            <Route path="/einstellungen" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomNav />
          <UpdatePrompt />
        </div>
      </HashRouter>
    </FeedbackProvider>
  );
}
