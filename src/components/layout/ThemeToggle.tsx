import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/hooks/useApp'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { themeMode, toggleTheme } = useApp()
  const label =
    themeMode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={t(label)}
      title={t(label)}
    >
      {themeMode === 'light' ? (
        <Moon aria-hidden="true" />
      ) : (
        <Sun aria-hidden="true" />
      )}
    </Button>
  )
}
