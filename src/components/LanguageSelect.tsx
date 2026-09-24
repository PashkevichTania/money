import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  return (
    <div className={compact ? '' : 'space-y-2'}>
      <Label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {t('Language')}
      </Label>
      <NativeSelect
        id={id}
        value={i18n.resolvedLanguage || 'en'}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="ru" lang="ru">
          Русский
        </option>
      </NativeSelect>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {t('Saved in this browser. Applies immediately.')}
        </p>
      )}
    </div>
  );
}
