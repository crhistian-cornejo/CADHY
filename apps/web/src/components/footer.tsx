/**
 * Footer Component
 *
 * Full footer with FlickeringGrid text effect and link sections.
 * Copied from GraphCAD with CADHY branding.
 */

import {
  ArrowRight01Icon,
  Book02Icon,
  Github01Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { FlickeringGrid } from "@/components/flickering-grid"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import { useTranslation } from "@/lib/i18n"

// Scroll to element by ID with offset for fixed navbar
function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId)
  if (element) {
    const navbarHeight = 64
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: elementPosition - navbarHeight - 16,
      behavior: "smooth",
    })
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const checkQuery = () => {
      setMatches(window.matchMedia(query).matches)
    }
    checkQuery()
    window.addEventListener("resize", checkQuery)
    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener("change", checkQuery)
    return () => {
      window.removeEventListener("resize", checkQuery)
      mediaQuery.removeEventListener("change", checkQuery)
    }
  }, [query])

  return matches
}

export function Footer() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { t, language } = useTranslation()

  // Build footer links from translations
  const footerLinks = useMemo(
    () => [
      {
        title: t.footer.product,
        links: [
          { id: 1, label: t.footer.features, href: "/#features" },
          { id: 2, label: t.footer.roadmap, href: "/roadmap" },
          { id: 3, label: t.footer.downloads, href: "/download" },
          {
            id: 4,
            label: t.footer.changelog,
            href: "/changelog",
          },
        ],
      },
      {
        title: t.footer.resources,
        links: [
          { id: 5, label: t.footer.docs, href: "/docs" },
          { id: 6, label: t.footer.gettingStarted, href: "/docs/getting-started/installation" },
          { id: 7, label: t.footer.openChannels, href: "/docs/hydraulics" },
          { id: 8, label: t.footer.aiIntegration, href: "/docs/ai-integration" },
        ],
      },
      {
        title: language === "es" ? "Comunidad" : "Community",
        links: [
          {
            id: 9,
            label: t.footer.github,
            href: "https://github.com/crhistian-cornejo/CADHY",
          },
          {
            id: 10,
            label: language === "es" ? "Discusiones" : "Discussions",
            href: "https://github.com/crhistian-cornejo/CADHY/discussions",
          },
          {
            id: 11,
            label: language === "es" ? "Reportar Problemas" : "Report Issues",
            href: "https://github.com/crhistian-cornejo/CADHY/issues",
          },
          {
            id: 12,
            label: language === "es" ? "Contacto" : "Contact",
            href: "mailto:support@cadhy.app",
          },
        ],
      },
    ],
    [t, language]
  )

  const handleHashClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
      e.preventDefault()
      const elementId = hash.replace("/#", "")

      if (currentPath !== "/") {
        navigate("/")
        setTimeout(() => scrollToElement(elementId), 100)
      } else {
        scrollToElement(elementId)
      }
    },
    [currentPath, navigate]
  )

  const gridText = isMobile
    ? "CADHY"
    : language === "es"
      ? "Para Ingenieros"
      : "Built for Engineers"

  return (
    <footer id="footer" className="w-full pb-0 border-t border-border bg-background">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between p-8 lg:p-12 max-w-7xl mx-auto">
        {/* Brand Column */}
        <div className="flex flex-col items-start justify-start gap-y-5 max-w-xs mb-10 md:mb-0">
          <Link to="/" className="flex items-center gap-3 text-foreground">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tighter">
              CAD<span className="text-muted-foreground">HY</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {language === "es"
              ? "Software de análisis hidráulico potenciado por IA para ingenieros civiles. Diseña canales abiertos, analiza redes de tuberías y resuelve problemas complejos con facilidad."
              : "AI-powered hydraulic analysis software for civil engineers. Design open channels, analyze pipe networks, and solve complex problems with ease."}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <a
              href="https://github.com/crhistian-cornejo/CADHY"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Github01Icon} size={20} />
            </a>
            <a
              href="https://twitter.com/cadhy_app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={NewTwitterIcon} size={20} />
            </a>
            <Link
              to="/docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Book02Icon} size={20} />
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            {language === "es" ? "SOFTWARE PROPIETARIO" : "PROPRIETARY SOFTWARE"}
          </div>
        </div>

        {/* Links Columns */}
        <div className="flex-1 md:pl-16 lg:pl-24">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12">
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h4 className="text-sm font-semibold text-foreground mb-4">{column.title}</h4>
                <ul className="space-y-3">
                  {column.links.map((link) => {
                    const isExternal = link.href.startsWith("http")
                    const isHashLink = link.href.startsWith("/#")

                    if (isExternal) {
                      return (
                        <li key={link.id}>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {link.label}
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              size={12}
                              className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                            />
                          </a>
                        </li>
                      )
                    }

                    if (isHashLink) {
                      return (
                        <li key={link.id}>
                          <a
                            href={link.href}
                            onClick={(e) => handleHashClick(e, link.href)}
                            className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {link.label}
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              size={12}
                              className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                            />
                          </a>
                        </li>
                      )
                    }

                    return (
                      <li key={link.id}>
                        <Link
                          to={link.href}
                          className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            size={12}
                            className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                          />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flickering Grid with Text */}
      <div className="w-full h-40 md:h-56 relative mt-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-background z-10 from-30%" />
        <div className="absolute inset-0 mx-4">
          <FlickeringGrid
            text={gridText}
            fontSize={isMobile ? 48 : 72}
            fontWeight={700}
            className="h-full w-full"
            squareSize={2}
            gridGap={isMobile ? 2 : 3}
            color="#6B7280"
            maxOpacity={0.25}
            flickerChance={0.1}
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>&copy; 2025 CADHY. {t.footer.copyright}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono">v0.1.0</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t.footer.privacy}
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {t.footer.terms}
            </Link>
            <a
              href="https://github.com/crhistian-cornejo/CADHY"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
