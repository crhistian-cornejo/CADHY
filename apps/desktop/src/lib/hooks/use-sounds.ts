/**
 * useSounds - Hook for subtle UI sound effects
 *
 * Provides various sound effects for UI feedback.
 * All sounds are generated programmatically using Web Audio API.
 */

import { useCallback, useRef } from "react"

export type SoundType =
  | "success" // Task completed
  | "error" // Error occurred
  | "click" // Button click
  | "pop" // Item created
  | "notification" // New message
  | "aiThinking" // AI is processing/analyzing scene
  | "aiComplete" // AI finished responding

export interface UseSoundsOptions {
  /** Master volume (0-1) */
  volume?: number
  /** Enable/disable all sounds */
  enabled?: boolean
}

// Sound configurations
const SOUND_CONFIGS: Record<
  SoundType,
  {
    frequencies: number[]
    type: OscillatorType
    duration: number
    decay: number
    stagger?: number
    volumeMultiplier?: number
  }
> = {
  success: {
    frequencies: [523, 659, 784], // C5, E5, G5 - C major
    type: "sine",
    duration: 0.15,
    decay: 0.1,
    stagger: 0.05,
    volumeMultiplier: 0.4,
  },
  error: {
    frequencies: [200, 150], // Low tones
    type: "sawtooth",
    duration: 0.2,
    decay: 0.15,
    stagger: 0.1,
    volumeMultiplier: 0.3,
  },
  click: {
    frequencies: [800],
    type: "sine",
    duration: 0.05,
    decay: 0.03,
    volumeMultiplier: 0.2,
  },
  pop: {
    frequencies: [600, 900],
    type: "sine",
    duration: 0.08,
    decay: 0.05,
    stagger: 0.02,
    volumeMultiplier: 0.3,
  },
  notification: {
    frequencies: [880, 1108], // A5, C#6
    type: "sine",
    duration: 0.12,
    decay: 0.08,
    stagger: 0.08,
    volumeMultiplier: 0.35,
  },
  aiThinking: {
    // Ethereal ascending chord - mysterious AI analyzing
    frequencies: [440, 554, 659], // A4, C#5, E5 - A major chord
    type: "sine",
    duration: 0.35,
    decay: 0.25,
    stagger: 0.06,
    volumeMultiplier: 0.45,
  },
  aiComplete: {
    // Bright confirmation - analysis complete
    frequencies: [523, 659, 784, 1047], // C5, E5, G5, C6 - ascending C major
    type: "sine",
    duration: 0.12,
    decay: 0.08,
    stagger: 0.05,
    volumeMultiplier: 0.35,
  },
}

export function useSounds(options: UseSoundsOptions = {}) {
  const { volume = 0.3, enabled = true } = options
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const play = useCallback(
    (soundType: SoundType) => {
      if (!enabled) return

      try {
        const ctx = getAudioContext()
        const config = SOUND_CONFIGS[soundType]
        const masterVolume = volume * (config.volumeMultiplier ?? 1)

        config.frequencies.forEach((freq, i) => {
          const oscillator = ctx.createOscillator()
          const gainNode = ctx.createGain()

          oscillator.type = config.type
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime)

          const startTime = ctx.currentTime + i * (config.stagger ?? 0)
          const endTime = startTime + config.duration

          // Envelope: quick attack, gradual decay
          gainNode.gain.setValueAtTime(0, startTime)
          gainNode.gain.linearRampToValueAtTime(masterVolume, startTime + 0.01)
          gainNode.gain.exponentialRampToValueAtTime(0.001, endTime + config.decay)

          oscillator.connect(gainNode)
          gainNode.connect(ctx.destination)

          oscillator.start(startTime)
          oscillator.stop(endTime + config.decay)
        })
      } catch {
        // Audio not supported or blocked - fail silently
      }
    },
    [enabled, volume, getAudioContext]
  )

  // Convenience methods
  const playSuccess = useCallback(() => play("success"), [play])
  const playError = useCallback(() => play("error"), [play])
  const playClick = useCallback(() => play("click"), [play])
  const playPop = useCallback(() => play("pop"), [play])
  const playNotification = useCallback(() => play("notification"), [play])
  const playAiThinking = useCallback(() => play("aiThinking"), [play])
  const playAiComplete = useCallback(() => play("aiComplete"), [play])

  return {
    play,
    playSuccess,
    playError,
    playClick,
    playPop,
    playNotification,
    playAiThinking,
    playAiComplete,
  }
}

export default useSounds
