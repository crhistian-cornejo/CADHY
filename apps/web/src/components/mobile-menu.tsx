/**
 * Mobile Menu Component
 *
 * Animated mobile navigation menu using Motion.
 * Features smooth slide-in animation, animated hamburger icon,
 * and staggered content animations.
 */

import { Button } from "@cadhy/ui"
import {
  ArrowRight01Icon,
  Download02Icon,
  Github01Icon,
  type GridIcon,
  HelpCircleIcon,
  QuestionIcon,
  RoadLocation01Icon,
  Rocket01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Logo } from "@/components/logo"
import { Hamburger } from "@/components/ui/hamburger"
import { useTranslation } from "@/lib/i18n"

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

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformLabel: string
  onDownloadClick: () => void
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

export function MobileMenu({
  open,
  onOpenChange,
  platformLabel,
  onDownloadClick,
}: MobileMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const menuGroups: MenuGroup[] = [
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
  ]

  const handleNavigation = (url: string, external?: boolean) => {
    onOpenChange(false)
    if (external) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }
    if (url.includes("#")) {
      const [path, hash] = url.split("#")
      const targetPath = path || "/"
      navigate(targetPath)
      if (hash) setTimeout(() => scrollToElement(hash), 150)
    } else {
      navigate(url)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Full screen menu from top */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative flex items-center justify-between border-b border-border p-4"
            >
              <Link to="/" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
                <Logo className="h-7 w-7" />
                <span className="text-lg font-bold tracking-tighter">CADHY</span>
              </Link>

              <Hamburger
                open={open}
                onClick={() => onOpenChange(false)}
                className="h-9 w-9"
                aria-label="Close menu"
              />
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {menuGroups.map((group, groupIndex) => (
                <motion.div
                  key={group.title}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + groupIndex * 0.08 }}
                  className="mb-6"
                >
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="flex flex-col gap-1">
                    {group.items.map((item, itemIndex) => (
                      <motion.button
                        key={item.title}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + groupIndex * 0.08 + itemIndex * 0.04 }}
                        type="button"
                        className="flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                        onClick={() => handleNavigation(item.href, item.external)}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                          <HugeiconsIcon icon={item.icon} size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground flex items-center gap-1">
                            {item.title}
                            {item.external && (
                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                size={12}
                                className="text-muted-foreground -rotate-45"
                              />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Documentation Link */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Link
                  to="/docs"
                  className="flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => onOpenChange(false)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">{t.nav.docs}</span>
                </Link>
              </motion.div>
            </div>

            {/* Footer - Download Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="mt-auto border-t border-border p-4"
            >
              <Button
                className="w-full rounded-full gap-2"
                onClick={() => {
                  onOpenChange(false)
                  onDownloadClick()
                }}
              >
                <HugeiconsIcon icon={Rocket01Icon} size={18} />
                {t.nav.downloadFor} {platformLabel}
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
