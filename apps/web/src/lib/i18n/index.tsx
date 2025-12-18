/**
 * i18n Context and Hook
 *
 * Simple i18n implementation using Context + JSON files.
 * Supports English and Spanish with localStorage persistence.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import en from "./en.json"
import es from "./es.json"

// Supported languages
export type Language = "en" | "es"

// Translation structure (inferred from JSON)
type Translations = typeof en

// All translations
const translations: Record<Language, Translations> = { en, es }

// Language names for display
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  es: "Español",
}

// Storage key
const STORAGE_KEY = "cadhy-web-language"

// Context type
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

// Create context
const LanguageContext = createContext<LanguageContextType | null>(null)

// Detect browser language
function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en"
  const browserLang = navigator.language.split("-")[0]
  return browserLang === "es" ? "es" : "en"
}

// Get initial language from storage or browser
function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en"
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === "en" || saved === "es") return saved
  return detectBrowserLanguage()
}

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  // Persist language to localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
    // Update html lang attribute for SEO/accessibility
    document.documentElement.lang = lang
  }, [])

  // Set html lang on mount
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Memoize translations object
  const t = useMemo(() => translations[language], [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}

// Export translations type for type safety
export type { Translations }
