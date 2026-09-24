import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '@/api/users';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Button } from '@/components/ui/button';
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
  const favorites = profile?.favoriteCurrencies ?? [];
  const savePreference = async (patch: {
    defaultCurrency?: string;
    favoriteCurrencies?: string[];
  }) => {
    if (!profile) return;
    setBusy(true);
    try {
      await updateProfile(profile.id, patch);
      if (useAuthStore.getState().profile?.id !== profile.id) return;
      useAuthStore.setState((state) => ({
        profile: state.profile ? { ...state.profile, ...patch } : null,
      }));
      enqueueSnackbar('Preferences saved', { variant: 'success' });
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
            label={t('Default currency')}
            value={profile?.defaultCurrency || 'USD'}
            disabled={busy || !profile}
            onValueChange={(value) =>
              void savePreference({ defaultCurrency: value })
            }
          />
          <p className="text-xs text-muted-foreground">
            {t('Existing groups keep the currency they were created with.')}
          </p>
          <div className="space-y-3 border-t pt-5">
            <CurrencySelect
              label={t('Favorite currencies')}
              value=""
              disabled={busy || !profile || favorites.length >= 5}
              onValueChange={(value) => {
                if (!favorites.includes(value) && favorites.length < 5)
                  void savePreference({
                    favoriteCurrencies: [...favorites, value],
                  });
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'Choose up to five currencies. They appear first in currency lists.'
              )}{' '}
              ({favorites.length}/5)
            </p>
            <div className="flex flex-wrap gap-2">
              {favorites.map((code) => (
                <Button
                  key={code}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={t('Remove {{currency}} from favorites', {
                    currency: code,
                  })}
                  onClick={() =>
                    void savePreference({
                      favoriteCurrencies: favorites.filter((c) => c !== code),
                    })
                  }
                >
                  {code} ×
                </Button>
              ))}
            </div>
          </div>
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
