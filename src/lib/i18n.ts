import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en/common.json';
import he from '../locales/he/common.json';

export const RTL_LANGUAGES = ['he'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      he: { common: he },
    },
    fallbackLng: 'he',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

export default i18n;
