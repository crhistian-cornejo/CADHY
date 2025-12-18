/**
 * Language Switcher Component
 *
 * Dropdown to switch between languages.
 * Shows current language with globe icon.
 */

import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cadhy/ui"
import { ArrowDown01Icon, EarthIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LANGUAGE_NAMES, type Language, useTranslation } from "@/lib/i18n"

const LANGUAGES: Language[] = ["en", "es"]

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors rounded-full"
        >
          <HugeiconsIcon icon={EarthIcon} size={14} />
          <span>{LANGUAGE_NAMES[language]}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[140px] p-1 rounded-lg border-border bg-popover shadow-lg"
      >
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2 rounded-md cursor-pointer text-sm",
              language === lang
                ? "bg-accent text-accent-foreground font-medium"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span>{LANGUAGE_NAMES[lang]}</span>
            {language === lang && (
              <HugeiconsIcon icon={Tick01Icon} size={14} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
