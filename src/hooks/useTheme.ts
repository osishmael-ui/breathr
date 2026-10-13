import { useEffect, useState } from 'react';
import type { ThemeId } from '../types';

export function useTheme(theme: ThemeId) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'deep' : 'rill') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  const colors = { rill: '#e5f0eb', deep: '#173c3a', mist: '#edf5f1' };
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[resolvedTheme]);
  }, [resolvedTheme]);

  return resolvedTheme;
}
