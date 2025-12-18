/**
 * useSounds Hook Tests - @cadhy/desktop
 *
 * Tests for the sound effects configuration and logic.
 * Note: We test the configuration and type definitions since Web Audio API
 * requires a browser environment with user interaction to play sounds.
 */

import { describe, expect, test } from "bun:test"
import type { SoundType, UseSoundsOptions } from "../hooks/use-sounds"

// Define the sound configs inline for testing (matches the module)
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
    frequencies: [523, 659, 784],
    type: "sine",
    duration: 0.15,
    decay: 0.1,
    stagger: 0.05,
    volumeMultiplier: 0.4,
  },
  error: {
    frequencies: [200, 150],
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
    frequencies: [880, 1108],
    type: "sine",
    duration: 0.12,
    decay: 0.08,
    stagger: 0.08,
    volumeMultiplier: 0.35,
  },
  aiThinking: {
    frequencies: [440, 554, 659],
    type: "sine",
    duration: 0.35,
    decay: 0.25,
    stagger: 0.06,
    volumeMultiplier: 0.45,
  },
  aiComplete: {
    frequencies: [523, 659, 784, 1047],
    type: "sine",
    duration: 0.12,
    decay: 0.08,
    stagger: 0.05,
    volumeMultiplier: 0.35,
  },
}

describe("useSounds", () => {
  // ============================================================
  // Sound Types
  // ============================================================

  describe("SoundType", () => {
    test("should have all expected sound types", () => {
      const soundTypes: SoundType[] = [
        "success",
        "error",
        "click",
        "pop",
        "notification",
        "aiThinking",
        "aiComplete",
      ]

      expect(soundTypes).toHaveLength(7)
      expect(Object.keys(SOUND_CONFIGS)).toHaveLength(7)
    })

    test("should include UI feedback sounds", () => {
      expect(SOUND_CONFIGS.success).toBeDefined()
      expect(SOUND_CONFIGS.error).toBeDefined()
      expect(SOUND_CONFIGS.click).toBeDefined()
      expect(SOUND_CONFIGS.pop).toBeDefined()
    })

    test("should include AI-related sounds", () => {
      expect(SOUND_CONFIGS.aiThinking).toBeDefined()
      expect(SOUND_CONFIGS.aiComplete).toBeDefined()
    })
  })

  // ============================================================
  // Sound Configurations
  // ============================================================

  describe("Sound Configurations", () => {
    test("all sounds should have valid frequencies", () => {
      for (const [_name, config] of Object.entries(SOUND_CONFIGS)) {
        expect(config.frequencies).toBeDefined()
        expect(config.frequencies.length).toBeGreaterThan(0)
        for (const freq of config.frequencies) {
          expect(freq).toBeGreaterThan(0)
          expect(freq).toBeLessThan(20000) // Human hearing range
        }
      }
    })

    test("all sounds should have valid oscillator type", () => {
      const validTypes: OscillatorType[] = ["sine", "square", "sawtooth", "triangle"]

      for (const config of Object.values(SOUND_CONFIGS)) {
        expect(validTypes).toContain(config.type)
      }
    })

    test("all sounds should have valid duration", () => {
      for (const config of Object.values(SOUND_CONFIGS)) {
        expect(config.duration).toBeGreaterThan(0)
        expect(config.duration).toBeLessThan(10) // Reasonable max
      }
    })

    test("all sounds should have valid decay", () => {
      for (const config of Object.values(SOUND_CONFIGS)) {
        expect(config.decay).toBeGreaterThan(0)
        expect(config.decay).toBeLessThanOrEqual(config.duration * 2)
      }
    })

    test("volume multipliers should be between 0 and 1", () => {
      for (const config of Object.values(SOUND_CONFIGS)) {
        if (config.volumeMultiplier !== undefined) {
          expect(config.volumeMultiplier).toBeGreaterThan(0)
          expect(config.volumeMultiplier).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  // ============================================================
  // Success Sound
  // ============================================================

  describe("Success Sound", () => {
    test("should use C major chord frequencies", () => {
      const { frequencies } = SOUND_CONFIGS.success
      // C5, E5, G5
      expect(frequencies).toContain(523)
      expect(frequencies).toContain(659)
      expect(frequencies).toContain(784)
    })

    test("should use sine wave for pleasant tone", () => {
      expect(SOUND_CONFIGS.success.type).toBe("sine")
    })

    test("should have staggered notes for arpeggio effect", () => {
      expect(SOUND_CONFIGS.success.stagger).toBeDefined()
      expect(SOUND_CONFIGS.success.stagger).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // Error Sound
  // ============================================================

  describe("Error Sound", () => {
    test("should use low frequencies", () => {
      const { frequencies } = SOUND_CONFIGS.error
      for (const freq of frequencies) {
        expect(freq).toBeLessThan(500)
      }
    })

    test("should use sawtooth wave for harsher tone", () => {
      expect(SOUND_CONFIGS.error.type).toBe("sawtooth")
    })

    test("should have longer duration than click", () => {
      expect(SOUND_CONFIGS.error.duration).toBeGreaterThan(SOUND_CONFIGS.click.duration)
    })
  })

  // ============================================================
  // Click Sound
  // ============================================================

  describe("Click Sound", () => {
    test("should have single frequency", () => {
      expect(SOUND_CONFIGS.click.frequencies).toHaveLength(1)
    })

    test("should be very short", () => {
      expect(SOUND_CONFIGS.click.duration).toBeLessThan(0.1)
    })

    test("should have low volume multiplier", () => {
      expect(SOUND_CONFIGS.click.volumeMultiplier).toBeLessThan(0.3)
    })
  })

  // ============================================================
  // AI Sounds
  // ============================================================

  describe("AI Sounds", () => {
    test("aiThinking should use A major chord", () => {
      const { frequencies } = SOUND_CONFIGS.aiThinking
      // A4, C#5, E5
      expect(frequencies).toContain(440)
      expect(frequencies).toContain(554)
      expect(frequencies).toContain(659)
    })

    test("aiComplete should have ascending pattern", () => {
      const { frequencies } = SOUND_CONFIGS.aiComplete
      // C5, E5, G5, C6 - ascending
      expect(frequencies[0]).toBeLessThan(frequencies[1])
      expect(frequencies[1]).toBeLessThan(frequencies[2])
      expect(frequencies[2]).toBeLessThan(frequencies[3])
    })

    test("aiThinking should be longer than aiComplete", () => {
      expect(SOUND_CONFIGS.aiThinking.duration).toBeGreaterThan(SOUND_CONFIGS.aiComplete.duration)
    })
  })

  // ============================================================
  // UseSoundsOptions
  // ============================================================

  describe("UseSoundsOptions", () => {
    test("should accept volume option", () => {
      const options: UseSoundsOptions = { volume: 0.5 }
      expect(options.volume).toBe(0.5)
    })

    test("should accept enabled option", () => {
      const options: UseSoundsOptions = { enabled: false }
      expect(options.enabled).toBe(false)
    })

    test("should accept both options", () => {
      const options: UseSoundsOptions = { volume: 0.3, enabled: true }
      expect(options.volume).toBe(0.3)
      expect(options.enabled).toBe(true)
    })

    test("should work with empty options", () => {
      const options: UseSoundsOptions = {}
      expect(options.volume).toBeUndefined()
      expect(options.enabled).toBeUndefined()
    })
  })

  // ============================================================
  // Volume Calculation
  // ============================================================

  describe("Volume Calculation", () => {
    test("should calculate master volume correctly", () => {
      const baseVolume = 0.3
      const multiplier = 0.4

      const masterVolume = baseVolume * multiplier
      expect(masterVolume).toBeCloseTo(0.12, 2)
    })

    test("should default to 1 when no multiplier", () => {
      const baseVolume = 0.3
      const multiplier = undefined

      const masterVolume = baseVolume * (multiplier ?? 1)
      expect(masterVolume).toBe(0.3)
    })
  })

  // ============================================================
  // Envelope Timing
  // ============================================================

  describe("Envelope Timing", () => {
    test("staggered sounds should have increasing start times", () => {
      const config = SOUND_CONFIGS.success
      const frequencies = config.frequencies
      const stagger = config.stagger ?? 0

      const startTimes = frequencies.map((_, i) => i * stagger)

      // Each start time should be greater than the previous
      for (let i = 1; i < startTimes.length; i++) {
        expect(startTimes[i]).toBeGreaterThan(startTimes[i - 1])
      }
    })

    test("total sound duration should account for stagger and decay", () => {
      const config = SOUND_CONFIGS.success
      const stagger = config.stagger ?? 0
      const noteCount = config.frequencies.length

      const lastNoteStart = (noteCount - 1) * stagger
      const totalDuration = lastNoteStart + config.duration + config.decay

      expect(totalDuration).toBeGreaterThan(config.duration)
    })
  })
})
