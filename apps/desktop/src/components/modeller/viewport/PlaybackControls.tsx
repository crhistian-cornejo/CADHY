/**
 * Playback Controls - CADHY
 *
 * Minimal playback controls displayed at the bottom of the viewport
 * for camera animation playback.
 */

import { Button, cn, Slider } from "@cadhy/ui"
import { PauseIcon, PlayIcon, StopIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback } from "react"
import {
  useCameraAnimations,
  useCurrentAnimation,
  useModellerStore,
  usePlaybackState,
  usePlaybackTime,
} from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

interface PlaybackControlsProps {
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PlaybackControls({ className }: PlaybackControlsProps) {
  const animations = useCameraAnimations()
  const currentAnimationId = useCurrentAnimation()
  const playbackState = usePlaybackState()
  const playbackTime = usePlaybackTime()

  const { play, pause, stop, setPlaybackTime } = useModellerStore()

  // All hooks must be called before any early returns
  const handleSeek = useCallback(
    (value: number[]) => {
      setPlaybackTime(value[0])
    },
    [setPlaybackTime]
  )

  const togglePlayPause = useCallback(() => {
    if (playbackState === "playing") {
      pause()
    } else {
      play()
    }
  }, [playbackState, play, pause])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentAnimation = animations.find((a) => a.id === currentAnimationId)

  // Don't render if there's no active animation (after all hooks)
  if (!currentAnimation) return null

  return (
    <div
      className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-10",
        "flex items-center gap-3 px-4 py-2.5",
        "bg-background/80 backdrop-blur-md border border-border rounded-xl shadow-lg",
        "min-w-[400px]",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {/* Play/Pause Toggle */}
      <Button
        variant={playbackState === "playing" ? "default" : "outline"}
        size="icon-sm"
        onClick={togglePlayPause}
        className="shrink-0"
      >
        <HugeiconsIcon
          icon={playbackState === "playing" ? PauseIcon : PlayIcon}
          className="size-4"
        />
      </Button>

      {/* Stop */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={stop}
        disabled={playbackState === "stopped"}
        className="shrink-0"
      >
        <HugeiconsIcon icon={StopIcon} className="size-4" />
      </Button>

      {/* Progress Bar */}
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-right">
          {formatTime(playbackTime)}
        </span>
        <Slider
          value={[playbackTime]}
          onValueChange={handleSeek}
          min={0}
          max={currentAnimation.duration}
          step={0.1}
          className="flex-1"
        />
        <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
          {formatTime(currentAnimation.duration)}
        </span>
      </div>

      {/* Animation Name */}
      <span className="text-xs text-muted-foreground shrink-0 max-w-[120px] truncate">
        {currentAnimation.name}
      </span>
    </div>
  )
}
