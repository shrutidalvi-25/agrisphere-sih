import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import hi from '../locales/hi.json'
import mr from '../locales/mr.json'

const STORAGE_KEY = 'agrisphere_lang'

// Without this, every hard reload (or a fresh tab) silently reset the
// language back to Marathi even after a farmer explicitly switched to
// Hindi/English — losing their choice, and also mislabeling any notes
// typed right after a reload as "translated from Marathi" since
// lotService reads i18n.language at submit time.
let savedLang = 'mr'
try {
  savedLang = localStorage.getItem(STORAGE_KEY) || 'mr'
} catch {
  // localStorage unavailable (private mode, etc.) — fall back to default
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: savedLang, // Marathi is the default, per the project's design
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignore
  }
})

export default i18n
