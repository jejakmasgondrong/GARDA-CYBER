import { useState, useEffect, useCallback } from 'react';
import { platform } from '../platform/usePlatform';

type Theme = 'dark' | 'light' | 'system';

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return platform.window.getColorScheme();
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = platform.storage.getItem('gc-theme');
    return (stored as Theme) || 'dark';
  });

  const effectiveTheme = getEffectiveTheme(theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (effectiveTheme === 'light') {
      root.classList.add('light');
    }
  }, [effectiveTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    return platform.window.onColorSchemeChange(() => {
      // Force re-render
      setThemeState('system');
    });
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    platform.storage.setItem('gc-theme', newTheme);
  }, []);

  return { theme, effectiveTheme, setTheme };
}
