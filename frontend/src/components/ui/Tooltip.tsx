import { useState, type ReactElement, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => { clearTimeout(timeoutRef.current); timeoutRef.current = setTimeout(() => setVisible(true), 300); };
  const hide = () => { clearTimeout(timeoutRef.current); setVisible(false); };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const positionClass: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap rounded-[var(--gc-radius)] bg-[var(--gc-card)] border border-[var(--gc-border)] px-2.5 py-1.5 text-xs text-[var(--gc-text)] shadow-lg pointer-events-none animate-fade-in ${positionClass[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
