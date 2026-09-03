import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function useThemeModeListener() {
    const themeMode = useUIStore((s) => s.themeMode)
    useEffect(() => {
        document.documentElement.dataset.theme = themeMode
    }, [themeMode])
}
