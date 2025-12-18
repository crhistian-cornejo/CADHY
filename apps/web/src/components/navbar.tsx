/**
 * Navbar Component
 *
 * Main navigation with dropdowns, search, theme toggle and download button.
 * Adapted from GraphCAD with hugeicons.
 */

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  ArrowDown01Icon,
  Download02Icon,
  Github01Icon,
  type GridIcon,
  HelpCircleIcon,
  Moon02Icon,
  QuestionIcon,
  RoadLocation01Icon,
  Search01Icon,
  SparklesIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { SearchDialog, useSearchDialog } from "@/components/docs/search-dialog"
import { LinuxIcon, MacIcon, WindowsIcon } from "@/components/icons/platform-icons"
import { Logo } from "@/components/logo"
import { MobileMenu } from "@/components/mobile-menu"
import { Hamburger } from "@/components/ui/hamburger"
import { useTranslation } from "@/lib/i18n"

// Platform detection
type Platform = "WINDOWS" | "MACOS" | "LINUX" | "UNKNOWN"

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "UNKNOWN"
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes("win")) return "WINDOWS"
  if (ua.includes("mac")) return "MACOS"
  if (ua.includes("linux")) return "LINUX"
  return "UNKNOWN"
}

// Menu structure with icons and descriptions
interface MenuItem {
  title: string
  description?: string
  href: string
  icon: typeof GridIcon
  external?: boolean
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

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

const platformConfig = {
  WINDOWS: { label: "Windows", Icon: WindowsIcon, tooltip: "Download for Windows" },
  MACOS: { label: "macOS", Icon: MacIcon, tooltip: "Download for macOS" },
  LINUX: { label: "Linux", Icon: LinuxIcon, tooltip: "Download for Linux" },
  UNKNOWN: { label: "Download", Icon: Download02Icon, tooltip: "Download CADHY" },
}

// Desktop dropdown with hover support
function NavDropdownMenu({
  group,
  navigate,
  currentPath,
}: {
  group: MenuGroup
  navigate: ReturnType<typeof useNavigate>
  currentPath: string
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setOpen(true)
  }

  const closeMenu = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 100)
  }

  const handleNavigation = (url: string, external?: boolean) => {
    setOpen(false)
    if (external) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }
    if (url.startsWith("/#")) {
      const hash = url.slice(2) // Remove '/#'
      if (currentPath === "/") {
        scrollToElement(hash)
      } else {
        navigate("/")
        setTimeout(() => scrollToElement(hash), 200)
      }
    } else if (url.includes("#")) {
      const [path, hash] = url.split("#")
      navigate(path || "/")
      if (hash) setTimeout(() => scrollToElement(hash), 200)
    } else {
      navigate(url)
    }
  }

  return (
    <div onMouseEnter={openMenu} onMouseLeave={closeMenu} className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
              group.items.some((item) => {
                const [path] = item.href.split("#")
                return path === currentPath || (path === "" && currentPath === "/")
              })
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {group.title}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              className="transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={12}
          className="w-72 p-2 rounded-xl shadow-xl border-border bg-popover/95 backdrop-blur-md z-[100]"
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
        >
          {group.items.map((item) => (
            <DropdownMenuItem
              key={item.title}
              className="flex cursor-pointer gap-3 rounded-lg p-3 focus:bg-accent"
              onClick={() => handleNavigation(item.href, item.external)}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                <HugeiconsIcon icon={item.icon} size={18} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    currentPath === item.href.split("#")[0] ? "text-primary" : ""
                  )}
                >
                  {item.title}
                </span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function Navbar() {
  const [platform, setPlatform] = useState<Platform>("UNKNOWN")
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark"
    const saved = localStorage.getItem("cadhy-web-theme")
    return saved === "light" ? "light" : "dark"
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { open: searchOpen, setOpen: setSearchOpen } = useSearchDialog()
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const { t } = useTranslation()

  // Build menu groups from translations
  const menuGroups: MenuGroup[] = useMemo(
    () => [
      {
        title: t.nav.product,
        items: [
          {
            title: t.nav.features,
            description: t.nav.featuresDesc,
            href: "/#features",
            icon: SparklesIcon,
          },
          {
            title: t.nav.roadmap,
            description: t.nav.roadmapDesc,
            href: "/roadmap",
            icon: RoadLocation01Icon,
          },
          {
            title: t.nav.downloadNav,
            description: t.nav.downloadDesc,
            href: "/download",
            icon: Download02Icon,
          },
          {
            title: t.nav.faq,
            description: t.nav.faqDesc,
            href: "/#faq",
            icon: QuestionIcon,
          },
        ],
      },
      {
        title: t.nav.resources,
        items: [
          {
            title: t.nav.github,
            description: t.nav.githubDesc,
            href: "https://github.com/crhistian-cornejo/CADHY",
            icon: Github01Icon,
            external: true,
          },
          {
            title: t.nav.support,
            description: t.nav.supportDesc,
            href: "https://github.com/crhistian-cornejo/CADHY/issues",
            icon: HelpCircleIcon,
            external: true,
          },
        ],
      },
    ],
    [t]
  )

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
      root.setAttribute("data-theme", "dark")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
      root.setAttribute("data-theme", "light")
    }
    localStorage.setItem("cadhy-web-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"))

  const { label: platformLabel, Icon: PlatformIcon } = platformConfig[platform]

  const handleDownloadClick = () => {
    if (currentPath === "/") {
      scrollToElement("downloads")
    } else {
      navigate("/")
      setTimeout(() => scrollToElement("downloads"), 150)
    }
  }

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Desktop Navbar */}
          <nav className="hidden lg:flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <Logo className="h-8 w-8" />
                <span className="text-xl font-bold tracking-tighter">
                  CAD<span className="text-muted-foreground">HY</span>
                </span>
              </Link>

              {/* Navigation Dropdowns */}
              <div className="flex items-center gap-1">
                {menuGroups.map((group) => (
                  <NavDropdownMenu
                    key={group.title}
                    group={group}
                    navigate={navigate}
                    currentPath={currentPath}
                  />
                ))}
                <Link
                  to="/docs"
                  className="inline-flex h-9 items-center justify-center rounded-full bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {t.nav.docs}
                </Link>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchOpen(true)}
                    className="rounded-full"
                  >
                    <HugeiconsIcon icon={Search01Icon} size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search (⌘K)</TooltipContent>
              </Tooltip>

              {/* Theme Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full"
                    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                  >
                    <HugeiconsIcon icon={theme === "light" ? Moon02Icon : Sun03Icon} size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === "light" ? "Dark mode" : "Light mode"}</TooltipContent>
              </Tooltip>

              {/* Download Button */}
              <Button
                onClick={handleDownloadClick}
                className="rounded-full font-medium gap-2 px-5 py-2 h-auto transition-all hover:scale-105 hover:shadow-md"
              >
                {platform !== "UNKNOWN" && typeof PlatformIcon === "function" ? (
                  <PlatformIcon className="h-4 w-4 fill-current" />
                ) : (
                  <HugeiconsIcon icon={Download02Icon} size={16} />
                )}
                {t.common.download}
              </Button>
            </div>
          </nav>

          {/* Mobile Navbar */}
          <div className="flex lg:hidden items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="text-lg font-bold tracking-tighter">CADHY</span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Search button mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="rounded-full h-9 w-9"
              >
                <HugeiconsIcon icon={Search01Icon} size={18} />
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-9 w-9"
              >
                <HugeiconsIcon icon={theme === "light" ? Moon02Icon : Sun03Icon} size={18} />
              </Button>

              {/* Mobile Menu Trigger */}
              <Hamburger
                open={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-9 w-9"
              />

              {/* Mobile Menu with Motion animations */}
              <MobileMenu
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                platformLabel={platformLabel}
                onDownloadClick={handleDownloadClick}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-16" />

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
