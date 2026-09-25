import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '@/api/users';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useNotify } from '@/hooks/useNotify';
import { normalizeLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const profile = useAuthStore((s) => s.profile);
  const [busy, setBusy] = useState(false);
  const { enqueueSnackbar } = useNotify();
  const changeLanguage = async (value: string) => {
    const language = normalizeLanguage(value);
    setBusy(true);
    try {
      if (profile) {
        await updateProfile(profile.id, { language });
        if (useAuthStore.getState().profile?.id !== profile.id) return;
        useAuthStore.setState((state) => ({
          profile: state.profile ? { ...state.profile, language } : null,
        }));
      }
      await i18n.changeLanguage(language);
    } catch {
      enqueueSnackbar('Could not save preference', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={compact ? '' : 'space-y-2'}>
      <Label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {t('Language')}
      </Label>
      <NativeSelect
        id={id}
        value={i18n.resolvedLanguage || 'en'}
        disabled={busy}
        onChange={(event) => void changeLanguage(event.target.value)}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="be" lang="be">
          Беларуская
        </option>
        <option value="ru" lang="ru">
          Русский
        </option>
      </NativeSelect>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {profile
            ? t('Saved to your account.')
            : t('Saved in this browser. Applies immediately.')}
        </p>
      )}
    </div>
  );
}
