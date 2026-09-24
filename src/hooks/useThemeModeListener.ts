import { useEffect } from 'react';

import { useUIStore } from '@/stores/uiStore';

export function useThemeModeListener() {
  const themeMode = useUIStore((s) => s.themeMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);
}
