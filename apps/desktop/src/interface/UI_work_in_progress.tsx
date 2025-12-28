/**
 * WorkInProgress Component
 *
 * A minimal, elegant placeholder for pages that are still under development.
 * Inspired by 404 error pages with a clean, modern aesthetic.
 */

import { type Settings01Icon, SparklesIcon, Wrench01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

interface WorkInProgressProps {
  /** The name of the feature/page being worked on */
  feature?: string
  /** Optional description */
  description?: string
  /** Icon to display */
  icon?: typeof Settings01Icon
}

export function WorkInProgress({ feature, description, icon = Wrench01Icon }: WorkInProgressProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-6 text-center px-8 max-w-md"
      >
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.1,
          }}
          className="relative"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />

          {/* Icon container */}
          <div className="relative flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shadow-lg">
            <HugeiconsIcon
              icon={icon}
              className="size-10 text-muted-foreground"
              strokeWidth={1.5}
            />
          </div>

          {/* Sparkle decoration */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="absolute -top-1 -right-1"
          >
            <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("wip.title", "Work in Progress")}
          </h2>

          {feature && (
            <p className="text-base text-muted-foreground">
              <span className="font-medium text-foreground">{feature}</span>{" "}
              {t("wip.comingSoon", "is coming soon")}
            </p>
          )}

          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto">
            {description ||
              t(
                "wip.description",
                "We're working hard to bring you this feature. Check back soon!"
              )}
          </p>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-48"
        >
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default WorkInProgress
