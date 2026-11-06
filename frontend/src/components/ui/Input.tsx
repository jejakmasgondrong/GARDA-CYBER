import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--gc-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 text-sm text-[var(--gc-text)]
            placeholder:text-[var(--gc-text-secondary)]/60
            focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-touch transition-colors ${error ? 'border-[var(--gc-critical)]' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && <p id={`${inputId}-error`} className="text-xs text-[var(--gc-critical)]">{error}</p>}
        {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-[var(--gc-text-secondary)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
