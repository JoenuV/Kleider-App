import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (message: string) => void;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const confirm = useCallback((o: ConfirmOptions) => {
    setPending(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setPending(null);
  };

  const toast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToastMsg(message);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}
      <Sheet open={!!pending} onClose={() => close(false)} title={pending?.title}>
        {pending?.message && <div className="muted">{pending.message}</div>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={() => close(false)}>
            {pending?.cancelLabel ?? 'Abbrechen'}
          </button>
          <button className={`btn ${pending?.danger ? 'danger' : 'primary'}`} onClick={() => close(true)} autoFocus>
            {pending?.confirmLabel ?? 'OK'}
          </button>
        </div>
      </Sheet>
      {toastMsg && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast">{toastMsg}</div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback must be used inside FeedbackProvider');
  return v;
}
