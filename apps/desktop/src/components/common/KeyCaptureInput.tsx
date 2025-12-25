/**
 * Key Capture Input Component - CADHY
 *
 * Advanced keyboard shortcut capture component with:
 * - Real-time key detection
 * - Visual feedback
 * - Conflict detection
 * - Support for multiple key combinations
 * - Platform-aware formatting
 */

import { formatKbd, Input, Kbd, KbdGroup } from "@cadhy/ui"
import { AlertCircleIcon, KeyboardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePlatform } from "@/hooks/use-platform"
import {
  hotkeyRegistry,
  isSystemShortcut,
  normalizeShortcut,
  validateShortcut,
} from "@/services/hotkey-registry"

// ============================================================================
// TYPES
// ============================================================================

export interface KeyCaptureInputProps {
  /** Current key combination value */
  value: string[]
  /** Callback when keys are captured */
  onChange: (keys: string[]) => void
  /** Callback when capture is cancelled */
  onCancel?: () => void
  /** Hotkey ID to exclude from conflict detection */
  excludeId?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// KEY MAPPING
// ============================================================================

/**
 * Map special keys to normalized names
 */
const KEY_MAP: Record<string, string> = {
  " ": "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Escape: "Escape",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Insert: "Insert",
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
}

/**
 * Map numpad keys
 */
const NUMPAD_MAP: Record<string, string> = {
  Numpad0: "Numpad0",
  Numpad1: "Numpad1",
  Numpad2: "Numpad2",
  Numpad3: "Numpad3",
  Numpad4: "Numpad4",
  Numpad5: "Numpad5",
  Numpad6: "Numpad6",
  Numpad7: "Numpad7",
  Numpad8: "Numpad8",
  Numpad9: "Numpad9",
  NumpadAdd: "Numpad+",
  NumpadSubtract: "Numpad-",
  NumpadMultiply: "Numpad*",
  NumpadDivide: "Numpad/",
  NumpadDecimal: "Numpad.",
  NumpadEnter: "NumpadEnter",
}

/**
 * Check if a key is a modifier
 */
function isModifierKey(key: string): boolean {
  return ["Control", "Alt", "Shift", "Meta", "Cmd", "Command"].includes(key)
}

/**
 * Normalize a key name
 */
function normalizeKeyName(key: string, code: string, isMac: boolean): string {
  // Handle numpad keys
  if (NUMPAD_MAP[code]) {
    return NUMPAD_MAP[code]
  }

  // Handle special keys
  if (KEY_MAP[key]) {
    return KEY_MAP[key]
  }

  // Handle single character keys
  if (key.length === 1) {
    return key.toUpperCase()
  }

  // Handle function keys
  if (key.startsWith("F") && /^F\d+$/.test(key)) {
    return key
  }

  return key
}

/**
 * Build shortcut string from keyboard event
 */
function buildShortcut(event: KeyboardEvent, isMac: boolean): string | null {
  const parts: string[] = []

  // Add modifiers in standard order
  if (event.ctrlKey || event.metaKey) {
    parts.push(isMac ? "Cmd" : "Ctrl")
  }
  if (event.altKey) {
    parts.push(isMac ? "Option" : "Alt")
  }
  if (event.shiftKey) {
    parts.push("Shift")
  }

  // Skip if only modifiers
  const key = normalizeKeyName(event.key, event.code, isMac)
  if (isModifierKey(key)) {
    return null
  }

  parts.push(key)
  return parts.join("+")
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KeyCaptureInput({
  value,
  onChange,
  onCancel,
  excludeId,
  disabled = false,
  placeholder = "Press keys...",
  className,
}: KeyCaptureInputProps) {
  const { isMacOS } = usePlatform()
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedKey, setCapturedKey] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Start capturing
  const startCapture = useCallback(() => {
    if (disabled) return
    setIsCapturing(true)
    setCapturedKey(null)
    setConflict(null)
    inputRef.current?.focus()
  }, [disabled])

  // Stop capturing
  const stopCapture = useCallback(() => {
    setIsCapturing(false)
    setCapturedKey(null)
    setConflict(null)
  }, [])

  // Handle keyboard events
  useEffect(() => {
    if (!isCapturing) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior
      event.preventDefault()
      event.stopPropagation()

      // Build shortcut string
      const shortcut = buildShortcut(event, isMacOS)
      if (!shortcut) return

      // Validate shortcut
      const validationError = validateShortcut(shortcut)
      if (validationError) {
        setConflict(validationError)
        setCapturedKey(shortcut)
        return
      }

      // Check if it's a system shortcut
      if (isSystemShortcut(shortcut)) {
        setConflict("This is a system shortcut and cannot be used")
        setCapturedKey(shortcut)
        return
      }

      // Normalize for conflict checking
      const normalized = normalizeShortcut(shortcut)

      // Check for conflicts
      const conflictHotkey = hotkeyRegistry.getConflict(normalized, excludeId)
      if (conflictHotkey) {
        setConflict(`Conflicts with: ${conflictHotkey.name}`)
        setCapturedKey(shortcut)
        return
      }

      // No conflict - update value
      setConflict(null)
      setCapturedKey(shortcut)
      onChange([shortcut])
      stopCapture()
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        stopCapture()
        onCancel?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keydown", handleEscape, { capture: true })

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keydown", handleEscape, { capture: true })
    }
  }, [isCapturing, isMacOS, onChange, onCancel, excludeId, stopCapture])

  // Handle click outside to stop capturing
  useEffect(() => {
    if (!isCapturing) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (inputRef.current && !inputRef.current.contains(target)) {
        stopCapture()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isCapturing, stopCapture])

  // Display value
  const displayValue = isCapturing && capturedKey ? capturedKey : value.join(" / ")

  return (
    <div className={className}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={displayValue || (isCapturing ? placeholder : "")}
          onChange={() => {}} // Controlled by keyboard events
          onClick={startCapture}
          onFocus={startCapture}
          readOnly
          disabled={disabled}
          placeholder={placeholder}
          className={`pr-8 ${isCapturing ? "ring-2 ring-primary" : ""}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <HugeiconsIcon
            icon={KeyboardIcon}
            className={`size-4 ${isCapturing ? "text-primary animate-pulse" : "text-muted-foreground"}`}
          />
        </div>
      </div>

      {/* Conflict warning */}
      {conflict && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
          <HugeiconsIcon icon={AlertCircleIcon} className="size-3" />
          <span>{conflict}</span>
        </div>
      )}

      {/* Current keys display */}
      {!isCapturing && value.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {value.map((key, i) => (
            <KbdGroup key={i}>
              {key.split("+").map((k, j) => (
                <Kbd key={j}>{formatKbd(k)}</Kbd>
              ))}
            </KbdGroup>
          ))}
        </div>
      )}

      {/* Hint */}
      {isCapturing && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Press the key combination you want to use. Press Escape to cancel.
        </p>
      )}
    </div>
  )
}
