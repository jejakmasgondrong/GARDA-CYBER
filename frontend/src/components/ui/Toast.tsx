import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() { return useContext(ToastContext); }

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info,
};
const colors: Record<ToastType, string> = {
  success: 'border-[var(--gc-success)]/30 bg-[var(--gc-success)]/10',
  error: 'border-[var(--gc-critical)]/30 bg-[var(--gc-critical)]/10',
  warning: 'border-[var(--gc-warning)]/30 bg-[var(--gc-warning)]/10',
  info: 'border-[var(--gc-primary)]/30 bg-[var(--gc-primary)]/10',
};
const iconColors: Record<ToastType, string> = {
  success: 'text-[var(--gc-success)]', error: 'text-[var(--gc-critical)]',
  warning: 'text-[var(--gc-warning)]', info: 'text-[var(--gc-primary)]',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type];
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={`flex items-start gap-3 rounded-gc-lg border p-3.5 shadow-lg animate-slide-up ${colors[toast.type]}`} role="alert">
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--gc-text)]">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-xs text-[var(--gc-text-secondary)]">{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="flex-shrink-0 p-1 rounded hover:bg-white/10" aria-label="Dismiss">
        <X className="h-3.5 w-3.5 text-[var(--gc-text-secondary)]" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...t, id: Date.now().toString() }]);
  }, []);
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}
