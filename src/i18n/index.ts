import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ru from './ru.json';

export const LANGUAGE_KEY = 'splitsmart.language';
export type Language = 'en' | 'ru';
export function normalizeLanguage(value: string | null): Language {
  return value === 'ru' ? 'ru' : 'en';
}
function savedLanguage(): Language {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
  } catch {
    return 'en';
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: savedLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'ru'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});

function applyLanguage(language: string) {
  const supported = normalizeLanguage(language);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = supported;
    document.title = i18n.t('SplitSmart — Split Expenses with Friends');
  }
  try {
    localStorage.setItem(LANGUAGE_KEY, supported);
  } catch {
    // Language switching remains available when browser storage is blocked.
  }
}
applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

export default i18n;
