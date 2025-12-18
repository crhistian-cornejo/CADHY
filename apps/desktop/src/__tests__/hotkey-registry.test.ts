/**
 * Hotkey Registry Tests - @cadhy/desktop
 *
 * Tests for hotkey parsing utilities.
 * Note: Platform-dependent tests are skipped because mock.module
 * doesn't work reliably when tests are run from the monorepo root.
 */

import { describe, expect, test } from "bun:test"
import { parseShortcut } from "../services/hotkey-registry"

describe("parseShortcut", () => {
  test("should parse simple key", () => {
    const result = parseShortcut("A")

    expect(result.ctrl).toBe(false)
    expect(result.alt).toBe(false)
    expect(result.shift).toBe(false)
    expect(result.meta).toBe(false)
    expect(result.key).toBe("a")
  })

  test("should parse Ctrl modifier", () => {
    const result = parseShortcut("Ctrl+S")

    expect(result.ctrl).toBe(true)
    expect(result.key).toBe("s")
  })

  test("should parse Control as Ctrl", () => {
    const result = parseShortcut("Control+S")
    expect(result.ctrl).toBe(true)
  })

  test("should parse Alt modifier", () => {
    const result = parseShortcut("Alt+A")

    expect(result.alt).toBe(true)
    expect(result.key).toBe("a")
  })

  test("should parse Option as Alt (Mac)", () => {
    const result = parseShortcut("Option+A")
    expect(result.alt).toBe(true)
  })

  test("should parse Shift modifier", () => {
    const result = parseShortcut("Shift+S")

    expect(result.shift).toBe(true)
    expect(result.key).toBe("s")
  })

  test("should parse Meta/Cmd modifier", () => {
    const meta = parseShortcut("Meta+S")
    expect(meta.meta).toBe(true)

    const cmd = parseShortcut("Cmd+S")
    expect(cmd.meta).toBe(true)

    const command = parseShortcut("Command+S")
    expect(command.meta).toBe(true)
  })

  test("should parse multiple modifiers", () => {
    const result = parseShortcut("Ctrl+Shift+Alt+S")

    expect(result.ctrl).toBe(true)
    expect(result.shift).toBe(true)
    expect(result.alt).toBe(true)
    expect(result.key).toBe("s")
  })

  test("should handle case insensitively", () => {
    const upper = parseShortcut("CTRL+SHIFT+A")
    const lower = parseShortcut("ctrl+shift+a")

    expect(upper.ctrl).toBe(true)
    expect(upper.shift).toBe(true)
    expect(lower.ctrl).toBe(true)
    expect(lower.shift).toBe(true)
  })

  test("should handle spaces around plus signs", () => {
    const result = parseShortcut("Ctrl + Shift + A")

    expect(result.ctrl).toBe(true)
    expect(result.shift).toBe(true)
    expect(result.key).toBe("a")
  })

  test("should handle special keys", () => {
    expect(parseShortcut("Delete").key).toBe("delete")
    expect(parseShortcut("Escape").key).toBe("escape")
    expect(parseShortcut("Enter").key).toBe("enter")
    expect(parseShortcut("Space").key).toBe("space")
    expect(parseShortcut("Tab").key).toBe("tab")
  })

  test("should handle numpad keys", () => {
    expect(parseShortcut("Numpad7").key).toBe("numpad7")
    expect(parseShortcut("Numpad.").key).toBe("numpad.")
  })

  test("should handle function keys", () => {
    expect(parseShortcut("F1").key).toBe("f1")
    expect(parseShortcut("F11").key).toBe("f11")
  })

  test("should handle Ctrl+Shift combination", () => {
    const result = parseShortcut("Ctrl+Shift+Z")

    expect(result.ctrl).toBe(true)
    expect(result.shift).toBe(true)
    expect(result.key).toBe("z")
  })

  test("should handle Alt+key combination", () => {
    const result = parseShortcut("Alt+F4")

    expect(result.alt).toBe(true)
    expect(result.key).toBe("f4")
  })

  test("should handle Home/End/Insert/PageUp/PageDown", () => {
    expect(parseShortcut("Home").key).toBe("home")
    expect(parseShortcut("End").key).toBe("end")
    expect(parseShortcut("Insert").key).toBe("insert")
    expect(parseShortcut("PageUp").key).toBe("pageup")
    expect(parseShortcut("PageDown").key).toBe("pagedown")
  })

  test("should handle arrow keys", () => {
    expect(parseShortcut("ArrowUp").key).toBe("arrowup")
    expect(parseShortcut("ArrowDown").key).toBe("arrowdown")
    expect(parseShortcut("ArrowLeft").key).toBe("arrowleft")
    expect(parseShortcut("ArrowRight").key).toBe("arrowright")
  })
})

describe("parseShortcut modifier combinations", () => {
  test("should correctly identify all modifier flags", () => {
    // Test various combinations
    const tests = [
      { input: "A", expected: { ctrl: false, alt: false, shift: false, meta: false } },
      { input: "Ctrl+A", expected: { ctrl: true, alt: false, shift: false, meta: false } },
      { input: "Alt+A", expected: { ctrl: false, alt: true, shift: false, meta: false } },
      { input: "Shift+A", expected: { ctrl: false, alt: false, shift: true, meta: false } },
      { input: "Meta+A", expected: { ctrl: false, alt: false, shift: false, meta: true } },
      { input: "Ctrl+Alt+A", expected: { ctrl: true, alt: true, shift: false, meta: false } },
      { input: "Ctrl+Shift+A", expected: { ctrl: true, alt: false, shift: true, meta: false } },
      { input: "Alt+Shift+A", expected: { ctrl: false, alt: true, shift: true, meta: false } },
      { input: "Ctrl+Alt+Shift+A", expected: { ctrl: true, alt: true, shift: true, meta: false } },
    ]

    for (const { input, expected } of tests) {
      const result = parseShortcut(input)
      expect(result.ctrl).toBe(expected.ctrl)
      expect(result.alt).toBe(expected.alt)
      expect(result.shift).toBe(expected.shift)
      expect(result.meta).toBe(expected.meta)
    }
  })
})
