import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '@/api/users';
import { LanguageSelect } from '@/components/LanguageSelect';
import { CurrencySelect, Field, Section } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/hooks/useApp';
import { useNotify } from '@/hooks/useNotify';
import { useAuthStore } from '@/stores/authStore';
export default function SettingsPage() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { themeMode, toggleTheme } = useApp();
  const { enqueueSnackbar } = useNotify();
  const [busy, setBusy] = useState(false);
  const saveCurrency = async (currency: string) => {
    if (!profile) return;
    setBusy(true);
    try {
      const next = await updateProfile(profile.id, {
        defaultCurrency: currency,
      });
      useAuthStore.setState({ profile: next });
      enqueueSnackbar('Default currency saved', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not save preference',
        { variant: 'error' }
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="w-full max-w-3xl space-y-7">
        <header>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-positive">
            {t('Make it yours')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('Settings')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('Your profile and workspace preferences.')}
          </p>
        </header>
        <Section title={t('Profile')} description={t('Your account details.')}>
          <Field
            label={t('Display name')}
            value={profile?.displayName || ''}
            readOnly
          />
          <Field label={t('Email')} value={profile?.email || ''} readOnly />
        </Section>
        <Section title={t('Preferences')}>
          <LanguageSelect />
          <CurrencySelect
            label={t('Default currency for new groups')}
            value={profile?.defaultCurrency || 'USD'}
            disabled={busy || !profile}
            onValueChange={(value) => void saveCurrency(value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('Existing groups keep the currency they were created with.')}
          </p>
          <div className="flex items-center justify-between border-t pt-5">
            <div>
              <Label htmlFor="dark-mode">{t('Dark mode')}</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('Use a graphite workspace with soft accents.')}
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={themeMode === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
