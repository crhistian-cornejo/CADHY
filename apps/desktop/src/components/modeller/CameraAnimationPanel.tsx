/**
 * Camera Animation Panel - CADHY
 *
 * Panel for creating and managing camera animations:
 * - Timeline with keyframes
 * - Playback controls (Play, Pause, Stop)
 * - Add/Edit/Delete keyframes
 * - Animation settings (duration, easing)
 */

import {
  Button,
  cn,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  toast,
} from "@cadhy/ui"
import {
  Add01Icon,
  Delete02Icon,
  PauseIcon,
  PlayIcon,
  Settings01Icon,
  StopIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type CameraAnimation,
  type EasingType,
  useCameraAnimations,
  useCurrentAnimation,
  useModellerStore,
  usePlaybackState,
  usePlaybackTime,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface CameraAnimationPanelProps {
  className?: string
  onClose?: () => void
}

// ============================================================================
// EASING FUNCTION
// ============================================================================

export function applyEasing(t: number, type: EasingType): number {
  switch (type) {
    case "linear":
      return t
    case "ease-in":
      return t * t
    case "ease-out":
      return t * (2 - t)
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    default:
      return t
  }
}

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

interface TimelineProps {
  animation: CameraAnimation
  playbackTime: number
  onSeek: (time: number) => void
  onAddKeyframe: () => void
  onDeleteKeyframe: (keyframeId: string) => void
}

function Timeline({
  animation,
  playbackTime,
  onSeek,
  onAddKeyframe,
  onDeleteKeyframe,
}: TimelineProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const time = (x / rect.width) * animation.duration
      onSeek(Math.max(0, Math.min(time, animation.duration)))
    },
    [animation.duration, onSeek]
  )

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return
      handleTimelineClick(e)
    },
    [isDragging, handleTimelineClick]
  )

  return (
    <div className="space-y-2">
      {/* Timeline Bar */}
      <div
        className="relative h-12 bg-muted/30 rounded-md border border-border cursor-pointer select-none"
        onClick={handleTimelineClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      >
        {/* Keyframes */}
        {animation.keyframes.map((keyframe) => {
          const position = (keyframe.time / animation.duration) * 100
          return (
            <div
              key={keyframe.id}
              className="absolute top-0 bottom-0 w-1 bg-primary hover:w-2 transition-all group"
              style={{ left: `${position}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {keyframe.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-4 w-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteKeyframe(keyframe.id)
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none"
          style={{ left: `${(playbackTime / animation.duration) * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
        </div>

        {/* Time markers */}
        <div className="absolute inset-x-0 bottom-1 flex justify-between px-2 text-[9px] text-muted-foreground">
          <span>0s</span>
          <span>{playbackTime.toFixed(1)}s</span>
          <span>{animation.duration}s</span>
        </div>
      </div>

      {/* Add Keyframe Button */}
      <Button variant="outline" size="sm" className="w-full" onClick={onAddKeyframe}>
        <HugeiconsIcon icon={Add01Icon} className="mr-2 size-3" />
        {t("animation.addKeyframe", "Add Keyframe at Current Time")}
      </Button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CameraAnimationPanel({ className, onClose }: CameraAnimationPanelProps) {
  const { t } = useTranslation()
  const animations = useCameraAnimations()
  const currentAnimationId = useCurrentAnimation()
  const playbackState = usePlaybackState()
  const playbackTime = usePlaybackTime()

  const {
    createAnimation,
    deleteAnimation,
    setCurrentAnimation,
    addKeyframe,
    deleteKeyframe,
    setAnimationDuration,
    setAnimationEasing,
    play,
    pause,
    stop,
    setPlaybackTime,
    createExampleAnimations,
  } = useModellerStore()

  const [newAnimationName, setNewAnimationName] = useState("")

  const currentAnimation = useMemo(
    () => animations.find((a) => a.id === currentAnimationId),
    [animations, currentAnimationId]
  )

  const handleCreateAnimation = useCallback(() => {
    const name = newAnimationName.trim()
    if (!name) {
      toast.error(t("animation.enterName", "Please enter an animation name"))
      return
    }

    createAnimation(name)
    setNewAnimationName("")
    toast.success(t("animation.created", `Animation "${name}" created`))
  }, [newAnimationName, createAnimation, t])

  const handleDeleteAnimation = useCallback(() => {
    if (!currentAnimation) return

    deleteAnimation(currentAnimation.id)
    toast.success(t("animation.deleted", `Animation deleted`))
  }, [currentAnimation, deleteAnimation, t])

  const handleAddKeyframe = useCallback(() => {
    if (!currentAnimation) return

    addKeyframe(currentAnimation.id)
    toast.success(t("animation.keyframeAdded", "Keyframe added"))
  }, [currentAnimation, addKeyframe, t])

  const handleDeleteKeyframe = useCallback(
    (keyframeId: string) => {
      if (!currentAnimation) return

      deleteKeyframe(currentAnimation.id, keyframeId)
      toast.success(t("animation.keyframeDeleted", "Keyframe deleted"))
    },
    [currentAnimation, deleteKeyframe, t]
  )

  const handleDurationChange = useCallback(
    (value: number[]) => {
      if (!currentAnimation) return
      setAnimationDuration(currentAnimation.id, value[0])
    },
    [currentAnimation, setAnimationDuration]
  )

  const handleEasingChange = useCallback(
    (value: string) => {
      if (!currentAnimation) return
      setAnimationEasing(currentAnimation.id, value as EasingType)
    },
    [currentAnimation, setAnimationEasing]
  )

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold">{t("animation.title", "Camera Animations")}</h2>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {/* Create New Animation */}
          <div className="space-y-2">
            <Label className="text-xs">{t("animation.createNew", "Create New Animation")}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("animation.animationName", "Animation name...")}
                value={newAnimationName}
                onChange={(e) => setNewAnimationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateAnimation()
                  }
                }}
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={handleCreateAnimation} disabled={!newAnimationName.trim()}>
                {t("common.add", "Add")}
              </Button>
            </div>
            {/* Load Examples Button */}
            {animations.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  createExampleAnimations()
                  toast.success("Example animations loaded! Select one and press Play")
                }}
              >
                Load Example Animations
              </Button>
            )}
          </div>

          <Separator />

          {/* Animation List */}
          {animations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">
                {t("animation.selectAnimation", "Select Animation")}
              </Label>
              <Select value={currentAnimationId ?? undefined} onValueChange={setCurrentAnimation}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("animation.selectOne", "Select an animation...")} />
                </SelectTrigger>
                <SelectContent>
                  {animations.map((anim) => (
                    <SelectItem key={anim.id} value={anim.id}>
                      {anim.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current Animation Controls */}
          {currentAnimation && (
            <>
              <Separator />

              {/* Playback Controls */}
              <div className="space-y-2">
                <Label className="text-xs">{t("animation.playback", "Playback")}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={playbackState === "playing" ? "default" : "outline"}
                    size="sm"
                    onClick={play}
                    disabled={playbackState === "playing"}
                  >
                    <HugeiconsIcon icon={PlayIcon} className="size-4" />
                  </Button>
                  <Button
                    variant={playbackState === "paused" ? "default" : "outline"}
                    size="sm"
                    onClick={pause}
                    disabled={playbackState !== "playing"}
                  >
                    <HugeiconsIcon icon={PauseIcon} className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stop}
                    disabled={playbackState === "stopped"}
                  >
                    <HugeiconsIcon icon={StopIcon} className="size-4" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <HugeiconsIcon icon={Settings01Icon} className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-3">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {t("animation.duration", "Duration")}: {currentAnimation.duration}s
                          </Label>
                          <Slider
                            value={[currentAnimation.duration]}
                            onValueChange={handleDurationChange}
                            min={1}
                            max={60}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("animation.easing", "Easing")}</Label>
                          <Select
                            value={currentAnimation.easing}
                            onValueChange={handleEasingChange}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="linear">Linear</SelectItem>
                              <SelectItem value="ease-in">Ease In</SelectItem>
                              <SelectItem value="ease-out">Ease Out</SelectItem>
                              <SelectItem value="ease-in-out">Ease In-Out</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAnimation}>
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div className="space-y-2">
                <Label className="text-xs">
                  {t("animation.timeline", "Timeline")} ({currentAnimation.keyframes.length}{" "}
                  {t("animation.keyframes", "keyframes")})
                </Label>
                <Timeline
                  animation={currentAnimation}
                  playbackTime={playbackTime}
                  onSeek={setPlaybackTime}
                  onAddKeyframe={handleAddKeyframe}
                  onDeleteKeyframe={handleDeleteKeyframe}
                />
              </div>

              {/* Keyframes List */}
              <div className="space-y-2">
                <Label className="text-xs">{t("animation.keyframesList", "Keyframes")}</Label>
                <div className="space-y-1">
                  {currentAnimation.keyframes.map((keyframe, index) => (
                    <div
                      key={keyframe.id}
                      className="flex items-center justify-between p-2 rounded border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {keyframe.time.toFixed(1)}s
                        </span>
                        <span className="text-xs">{keyframe.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={() => handleDeleteKeyframe(keyframe.id)}
                        disabled={currentAnimation.keyframes.length === 1}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {animations.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("animation.noAnimations", "No animations yet. Create one to get started.")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
