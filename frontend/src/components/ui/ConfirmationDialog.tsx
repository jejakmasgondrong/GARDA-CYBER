import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmationDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Konfirmasi', variant = 'primary', loading }: ConfirmationDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3 mb-4">
        {variant === 'danger' && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--gc-critical)]/15 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-[var(--gc-critical)]" />
          </div>
        )}
        <p className="text-sm text-[var(--gc-text-secondary)]">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
