import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageLayout({ title, subtitle, children, actions }: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={title} subtitle={subtitle} />
      <main className="flex-1 px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--gc-text)]">{title}</h1>
              {subtitle && <p className="text-xs text-[var(--gc-text-secondary)]">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
