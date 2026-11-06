import { useEffect, useState } from 'react';
import '../styles/live.css';

export interface ThemeTokens {
  isLight: boolean;
  primary: string;
  electric: string;
  success: string;
  warning: string;
  critical: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  surface: string;
  teal: string;
  violet: string;
  orange: string;
}

function read(): ThemeTokens {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const v = (n: string, fallback: string) => cs.getPropertyValue(n).trim() || fallback;
  return {
    isLight: root.classList.contains('light'),
    primary: v('--gc-primary', '#2685F6'),
    electric: v('--gc-electric', '#38BDF8'),
    success: v('--gc-success', '#22C55E'),
    warning: v('--gc-warning', '#F59E0B'),
    critical: v('--gc-critical', '#EF4444'),
    text: v('--gc-text', '#E5EDF7'),
    textSecondary: v('--gc-text-secondary', '#94A3B8'),
    border: v('--gc-border', '#26364D'),
    card: v('--gc-card', '#162338'),
    surface: v('--gc-surface', '#1C2B40'),
    teal: v('--gc-teal', '#2DD4BF'),
    violet: v('--gc-violet', '#A78BFA'),
    orange: v('--gc-orange', '#FB923C'),
  };
}

/** Token warna aktual (untuk canvas/WebGL yang tidak bisa memakai var(--...)). Ikut berganti saat tema berubah. */
export function useThemeTokens(): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTokens(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return tokens;
}

export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const s = h.replace('#', '');
    const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}
