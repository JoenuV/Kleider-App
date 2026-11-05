import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Shows a small banner when a new app version is ready (or offline mode is ready). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for updates once an hour while the app is open.
      if (reg) setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="update-banner" role="status">
      <span>{needRefresh ? 'Neue Version verfügbar.' : 'Die App funktioniert jetzt auch offline.'}</span>
      {needRefresh ? (
        <button className="btn primary sm" onClick={() => updateServiceWorker(true)}>
          <RefreshCw size={16} /> Aktualisieren
        </button>
      ) : (
        <button className="btn sm" onClick={() => setOfflineReady(false)}>
          OK
        </button>
      )}
      {needRefresh && (
        <button className="btn ghost sm" onClick={() => setNeedRefresh(false)}>
          Später
        </button>
      )}
    </div>
  );
}
