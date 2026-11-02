import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: (activeTab: string) => ReactNode;
}

export function Tabs({ tabs, defaultTab, onChange, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || '');
  const handleChange = (id: string) => { setActive(id); onChange?.(id); };

  return (
    <div>
      <div className="flex border-b border-[var(--gc-border)] overflow-x-auto" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            disabled={tab.disabled}
            onClick={() => handleChange(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors min-h-touch
              ${active === tab.id
                ? 'text-[var(--gc-primary)] border-b-2 border-[var(--gc-primary)]'
                : 'text-[var(--gc-text-secondary)] hover:text-[var(--gc-text)] border-b-2 border-transparent'}
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-[var(--gc-surface)] px-1.5 py-0.5 text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">{children(active)}</div>
    </div>
  );
}
