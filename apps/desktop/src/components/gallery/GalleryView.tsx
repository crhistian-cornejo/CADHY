/**
 * Gallery View - CADHY
 *
 * Dedicated page for browsing AI-generated images from chat sessions.
 * Features:
 * - Full bento grid layout
 * - Search and filter options
 * - Lightbox for full-size viewing
 * - Download and share actions
 *
 * @package @cadhy/desktop
 */

"use client"

import { AIImage, AIImageActions, AIImagePreview, Button, cn, Input, ScrollArea } from "@cadhy/ui"
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  Download01Icon,
  Image01Icon,
  Search01Icon,
  SparklesIcon,
  ZoomIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { type GalleryImage, useAIGallery } from "@/hooks"
import { useCurrentProject } from "@/stores/project-store"

// ============================================================================
// TYPES
// ============================================================================

interface GalleryViewProps {
  onBack?: () => void
  className?: string
}

// ============================================================================
// GALLERY ITEM
// ============================================================================

interface GalleryItemProps {
  image: GalleryImage
  index: number
  onClick: () => void
}

function GalleryItem({ image, index, onClick }: GalleryItemProps) {
  return (
    <motion.div
      layoutId={`gallery-full-${image.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.03,
      }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl",
        "bg-muted/50 border border-border/50",
        "aspect-[4/3]"
      )}
      onClick={onClick}
    >
      <AIImage
        data={{
          base64: image.base64,
          mediaType: image.mediaType,
          alt: `Generated from ${image.sessionTitle}`,
        }}
      >
        <div className="group relative h-full w-full">
          <AIImagePreview className="h-full w-full object-cover" lightbox={false} />

          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
          >
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-medium text-white truncate">{image.sessionTitle}</p>
              <p className="text-[10px] text-white/70 mt-0.5">
                {new Date(image.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Zoom icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <HugeiconsIcon icon={ZoomIcon} className="size-6 text-white" />
              </div>
            </div>
          </motion.div>

          <AIImageActions />
        </div>
      </AIImage>
    </motion.div>
  )
}

// ============================================================================
// LIGHTBOX
// ============================================================================

interface LightboxProps {
  image: GalleryImage
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

function Lightbox({ image, onClose, onPrev, onNext, hasPrev, hasNext }: LightboxProps) {
  const dataUrl = useMemo(
    () => `data:${image.mediaType};base64,${image.base64}`,
    [image.mediaType, image.base64]
  )

  const handleDownload = useCallback(() => {
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `cadhy-render-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [dataUrl])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev()
      if (e.key === "ArrowRight" && hasNext && onNext) onNext()
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Navigation arrows */}
        {hasPrev && onPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 backdrop-blur-sm transition-colors z-10"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-6" />
          </button>
        )}

        {hasNext && onNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 backdrop-blur-sm transition-colors z-10 rotate-180"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-6" />
          </button>
        )}

        <motion.div
          layoutId={`gallery-full-${image.id}`}
          className="relative max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={dataUrl}
            alt={`Generated from ${image.sessionTitle}`}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
          />

          {/* Image info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-4 left-4 right-4 flex items-center justify-between"
          >
            <div className="rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">{image.sessionTitle}</p>
              <p className="text-xs text-white/70">{new Date(image.createdAt).toLocaleString()}</p>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg bg-black/50 p-2 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
            >
              <HugeiconsIcon icon={Download01Icon} className="size-5" />
            </button>
          </motion.div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-3 -top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ searchQuery }: { searchQuery: string }) {
  const { t } = useTranslation()

  if (searchQuery) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-4 rounded-full bg-muted/50 p-5">
          <HugeiconsIcon icon={Search01Icon} className="size-10 text-muted-foreground" />
        </div>
        <p className="text-base font-medium text-muted-foreground">
          {t("gallery.noResults", "No images found")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          {t("gallery.tryDifferentSearch", "Try a different search term")}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 rounded-full bg-muted/50 p-5">
        <HugeiconsIcon icon={SparklesIcon} className="size-10 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-muted-foreground">
        {t("gallery.empty", "No AI-generated images yet")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground/70 max-w-[300px]">
        {t("gallery.emptyDesc", "Use the AI assistant to generate images. They will appear here.")}
      </p>
    </motion.div>
  )
}

// ============================================================================
// NO PROJECT STATE
// ============================================================================

function NoProjectState() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 rounded-full bg-muted/50 p-5">
        <HugeiconsIcon icon={Image01Icon} className="size-10 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-muted-foreground">
        {t("gallery.noProject", "No project open")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground/70 max-w-[300px]">
        {t("gallery.noProjectDesc", "Open a project to view its AI-generated images.")}
      </p>
    </motion.div>
  )
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={cn("animate-pulse rounded-xl bg-muted/50", "aspect-[4/3]")}>
          <div className="flex h-full items-center justify-center">
            <HugeiconsIcon icon={Image01Icon} className="size-8 text-muted-foreground/30" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN GALLERY VIEW
// ============================================================================

export function GalleryView({ onBack, className }: GalleryViewProps) {
  const { t } = useTranslation()
  const currentProject = useCurrentProject()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const { images, isLoading, totalCount } = useAIGallery({
    projectPath: currentProject?.path ?? null,
    limit: 100, // Show more images in the full gallery
  })

  // Filter images by search query (matches session title)
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images
    const query = searchQuery.toLowerCase()
    return images.filter((img) => img.sessionTitle.toLowerCase().includes(query))
  }, [images, searchQuery])

  // Lightbox navigation
  const selectedImage = selectedIndex !== null ? filteredImages[selectedIndex] : null

  const handlePrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }, [selectedIndex])

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < filteredImages.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }, [selectedIndex, filteredImages.length])

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold">{t("gallery.title", "AI Gallery")}</h1>
            {totalCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("gallery.imageCount", "{{count}} images", { count: totalCount })}
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder={t("gallery.search", "Search images...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!currentProject ? (
          <NoProjectState />
        ) : isLoading ? (
          <LoadingState />
        ) : filteredImages.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
            {filteredImages.map((image, index) => (
              <GalleryItem
                key={image.id}
                image={image}
                index={index}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Lightbox */}
      {selectedImage && (
        <Lightbox
          image={selectedImage}
          onClose={() => setSelectedIndex(null)}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={selectedIndex !== null && selectedIndex > 0}
          hasNext={selectedIndex !== null && selectedIndex < filteredImages.length - 1}
        />
      )}
    </div>
  )
}
