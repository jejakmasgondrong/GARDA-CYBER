import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--gc-primary)] text-white hover:brightness-110 active:brightness-90',
  secondary: 'bg-[var(--gc-surface)] text-[var(--gc-text)] border border-[var(--gc-border)] hover:bg-[var(--gc-card)]',
  ghost: 'text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)] hover:bg-[var(--gc-surface)]',
  danger: 'bg-[var(--gc-critical)] text-white hover:brightness-110 active:brightness-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2 min-h-touch',
  lg: 'h-12 px-6 text-sm gap-2 min-h-touch',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', leftIcon, rightIcon, loading, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-semibold rounded-gc transition-all duration-150 min-w-touch
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gc-primary)] focus-visible:outline-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : leftIcon}
        {children && <span>{children}</span>}
        {rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';
