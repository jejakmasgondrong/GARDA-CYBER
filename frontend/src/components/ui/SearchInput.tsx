import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, className = '', ...props }, ref) => {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gc-text-secondary)]" />
        <input
          ref={ref}
          type="search"
          value={value}
          className="w-full rounded-gc border border-[var(--gc-border)] bg-[var(--gc-surface)] pl-9 pr-9 py-2.5 text-sm text-[var(--gc-text)]
            placeholder:text-[var(--gc-text-secondary)]/60
            focus:border-[var(--gc-primary)] focus:ring-1 focus:ring-[var(--gc-primary)] focus:outline-none
            min-h-touch transition-colors"
          aria-label="Search"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--gc-surface)] text-[var(--gc-text-secondary)]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
