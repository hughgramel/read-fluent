import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language files
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enAuth from './locales/en/auth.json';
import enProfile from './locales/en/profile.json';
import enReader from './locales/en/reader.json';
import enErrors from './locales/en/errors.json';

import esCommon from './locales/es/common.json';
import esNavigation from './locales/es/navigation.json';
import esAuth from './locales/es/auth.json';
import esProfile from './locales/es/profile.json';
import esReader from './locales/es/reader.json';
import esErrors from './locales/es/errors.json';

import frCommon from './locales/fr/common.json';
import frNavigation from './locales/fr/navigation.json';
import frAuth from './locales/fr/auth.json';
import frProfile from './locales/fr/profile.json';
import frReader from './locales/fr/reader.json';
import frErrors from './locales/fr/errors.json';

import deCommon from './locales/de/common.json';
import deNavigation from './locales/de/navigation.json';
import deAuth from './locales/de/auth.json';
import deProfile from './locales/de/profile.json';
import deReader from './locales/de/reader.json';
import deErrors from './locales/de/errors.json';

import itCommon from './locales/it/common.json';
import itNavigation from './locales/it/navigation.json';
import itAuth from './locales/it/auth.json';
import itProfile from './locales/it/profile.json';
import itReader from './locales/it/reader.json';
import itErrors from './locales/it/errors.json';

import ptCommon from './locales/pt/common.json';
import ptNavigation from './locales/pt/navigation.json';
import ptAuth from './locales/pt/auth.json';
import ptProfile from './locales/pt/profile.json';
import ptReader from './locales/pt/reader.json';
import ptErrors from './locales/pt/errors.json';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

// Resources object containing all translations
const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    profile: enProfile,
    reader: enReader,
    errors: enErrors,
  },
  es: {
    common: esCommon,
    navigation: esNavigation,
    auth: esAuth,
    profile: esProfile,
    reader: esReader,
    errors: esErrors,
  },
  fr: {
    common: frCommon,
    navigation: frNavigation,
    auth: frAuth,
    profile: frProfile,
    reader: frReader,
    errors: frErrors,
  },
  de: {
    common: deCommon,
    navigation: deNavigation,
    auth: deAuth,
    profile: deProfile,
    reader: deReader,
    errors: deErrors,
  },
  it: {
    common: itCommon,
    navigation: itNavigation,
    auth: itAuth,
    profile: itProfile,
    reader: itReader,
    errors: itErrors,
  },
  pt: {
    common: ptCommon,
    navigation: ptNavigation,
    auth: ptAuth,
    profile: ptProfile,
    reader: ptReader,
    errors: ptErrors,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'auth', 'profile', 'reader', 'errors'],
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;