import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-[var(--gc-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2.5 pr-8 text-sm text-[var(--gc-text)]
              focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed min-h-touch transition-colors ${className}`}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gc-text-secondary)] pointer-events-none" />
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';
