/**
 * i18n Configuration - CADHY
 *
 * Internationalization setup using i18next and react-i18next.
 * Supports English (en) and Spanish (es) languages.
 */

import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import es from "./locales/es.json"

// Supported languages
export const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
] as const

export type LanguageCode = (typeof languages)[number]["code"]

// Get stored language or default to system/browser language
function getInitialLanguage(): LanguageCode {
  // Try to get from localStorage
  const stored = localStorage.getItem("cadhy-language")
  if (stored && languages.some((l) => l.code === stored)) {
    return stored as LanguageCode
  }

  // Try to detect from browser
  const browserLang = navigator.language.split("-")[0]
  if (languages.some((l) => l.code === browserLang)) {
    return browserLang as LanguageCode
  }

  // Default to English
  return "en"
}

// Initialize i18n
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false,
  },
})

// Persist language changes
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("cadhy-language", lng)
  // Update document lang attribute for accessibility
  document.documentElement.lang = lng
})

export default i18n
