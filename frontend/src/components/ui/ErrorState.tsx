import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-gc-lg border border-[var(--gc-critical)]/20 bg-[var(--gc-critical)]/5 px-6 py-10 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-[var(--gc-critical)]" />
      <p className="mb-3 max-w-sm text-sm text-[var(--gc-text-secondary)]">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
