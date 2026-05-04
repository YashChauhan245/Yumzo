import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './en-US.json';
import hiIN from './hi-IN.json';

const resources = {
  'en-US': { translation: enUS },
  'hi-IN': { translation: hiIN },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'en-US',
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false,
  },
  saveMissing: false,
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  document.documentElement.lang = lng.split('-')[0];
});

export default i18n;
