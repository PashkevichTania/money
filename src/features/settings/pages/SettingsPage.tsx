import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useApp } from '@/hooks/useApp'
import { updateProfile } from '@/api/users'
import { Section, Field, CurrencySelect } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotify } from '@/hooks/useNotify'
export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile)
  const { themeMode, toggleTheme } = useApp()
  const { enqueueSnackbar } = useNotify()
  const [busy, setBusy] = useState(false)
  const saveCurrency = async (currency: string) => {
    if (!profile) return
    setBusy(true)
    try {
      const next = await updateProfile(profile.id, {
        defaultCurrency: currency,
      })
      useAuthStore.setState({ profile: next })
      enqueueSnackbar('Default currency saved', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not save preference',
        { variant: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="max-w-3xl space-y-7">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-positive">
          Make it yours
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile and workspace preferences.
        </p>
      </header>
      <Section title="Profile" description="Your account details.">
        <Field
          label="Display name"
          value={profile?.displayName || ''}
          readOnly
        />
        <Field label="Email" value={profile?.email || ''} readOnly />
      </Section>
      <Section title="Preferences">
        <CurrencySelect
          label="Default currency for new groups"
          value={profile?.defaultCurrency || 'USD'}
          disabled={busy || !profile}
          onValueChange={(value) => void saveCurrency(value)}
        />
        <p className="text-xs text-muted-foreground">
          Existing groups keep the currency they were created with.
        </p>
        <div className="flex items-center justify-between border-t pt-5">
          <div>
            <Label htmlFor="dark-mode">Dark mode</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Use a graphite workspace with soft accents.
            </p>
          </div>
          <Switch
            id="dark-mode"
            checked={themeMode === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>
        <Button variant="ghost" onClick={toggleTheme}>
          Switch to {themeMode === 'dark' ? 'light' : 'dark'} theme
        </Button>
      </Section>
    </div>
  )
}
