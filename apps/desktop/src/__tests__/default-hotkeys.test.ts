/**
 * Default Hotkeys Tests - @cadhy/desktop
 *
 * Tests for default hotkey definitions and utility functions.
 */

import { describe, expect, test } from "bun:test"
import {
  DEFAULT_HOTKEYS,
  getAllDefaultHotkeys,
  getCategoryLabel,
  getDefaultHotkeyById,
} from "../services/default-hotkeys"

describe("DEFAULT_HOTKEYS", () => {
  test("should have all expected categories", () => {
    const categories = DEFAULT_HOTKEYS.map((c) => c.category)

    expect(categories).toContain("file")
    expect(categories).toContain("edit")
    expect(categories).toContain("view")
    expect(categories).toContain("transform")
    expect(categories).toContain("navigation")
    expect(categories).toContain("workspace")
    expect(categories).toContain("tools")
  })

  test("should have labels for all categories", () => {
    for (const category of DEFAULT_HOTKEYS) {
      expect(category.label).toBeDefined()
      expect(category.label.length).toBeGreaterThan(0)
    }
  })

  test("should have hotkeys in each category", () => {
    for (const category of DEFAULT_HOTKEYS) {
      expect(category.hotkeys.length).toBeGreaterThan(0)
    }
  })
})

describe("hotkey definitions", () => {
  test("all hotkeys should have required properties", () => {
    for (const category of DEFAULT_HOTKEYS) {
      for (const hotkey of category.hotkeys) {
        expect(hotkey.id).toBeDefined()
        expect(hotkey.name).toBeDefined()
        expect(hotkey.description).toBeDefined()
        expect(hotkey.keys).toBeDefined()
        expect(Array.isArray(hotkey.keys)).toBe(true)
        expect(hotkey.keys.length).toBeGreaterThan(0)
      }
    }
  })

  test("all hotkey IDs should be unique", () => {
    const allHotkeys = getAllDefaultHotkeys()
    const ids = allHotkeys.map((h) => h.id)
    const uniqueIds = new Set(ids)

    expect(ids.length).toBe(uniqueIds.size)
  })

  test("hotkey IDs should follow category.action format", () => {
    for (const category of DEFAULT_HOTKEYS) {
      for (const hotkey of category.hotkeys) {
        expect(hotkey.id).toContain(".")
        expect(hotkey.id.split(".")[0]).toBe(category.category)
      }
    }
  })
})

describe("file hotkeys", () => {
  test("should have standard file operations", () => {
    const fileCategory = DEFAULT_HOTKEYS.find((c) => c.category === "file")!
    const ids = fileCategory.hotkeys.map((h) => h.id)

    expect(ids).toContain("file.new")
    expect(ids).toContain("file.open")
    expect(ids).toContain("file.save")
    expect(ids).toContain("file.saveAs")
    expect(ids).toContain("file.export")
  })

  test("save should use Ctrl+S", () => {
    const saveHotkey = getDefaultHotkeyById("file.save")
    expect(saveHotkey?.keys).toContain("Ctrl+S")
  })
})

describe("edit hotkeys", () => {
  test("should have standard edit operations", () => {
    const editCategory = DEFAULT_HOTKEYS.find((c) => c.category === "edit")!
    const ids = editCategory.hotkeys.map((h) => h.id)

    expect(ids).toContain("edit.undo")
    expect(ids).toContain("edit.redo")
    expect(ids).toContain("edit.cut")
    expect(ids).toContain("edit.copy")
    expect(ids).toContain("edit.paste")
    expect(ids).toContain("edit.delete")
    expect(ids).toContain("edit.selectAll")
  })

  test("undo should use Ctrl+Z", () => {
    const undoHotkey = getDefaultHotkeyById("edit.undo")
    expect(undoHotkey?.keys).toContain("Ctrl+Z")
  })

  test("redo should have multiple key bindings", () => {
    const redoHotkey = getDefaultHotkeyById("edit.redo")
    expect(redoHotkey?.keys.length).toBeGreaterThan(1)
    expect(redoHotkey?.keys).toContain("Ctrl+Y")
    expect(redoHotkey?.keys).toContain("Ctrl+Shift+Z")
  })
})

describe("transform hotkeys", () => {
  test("should have Blender-like shortcuts", () => {
    const translateHotkey = getDefaultHotkeyById("transform.translate")
    const rotateHotkey = getDefaultHotkeyById("transform.rotate")
    const scaleHotkey = getDefaultHotkeyById("transform.scale")

    expect(translateHotkey?.keys).toContain("G")
    expect(rotateHotkey?.keys).toContain("R")
    expect(scaleHotkey?.keys).toContain("S")
  })

  test("should have modeller context", () => {
    const translateHotkey = getDefaultHotkeyById("transform.translate")
    expect(translateHotkey?.context).toBe("modeller")
  })
})

describe("tools hotkeys", () => {
  test("should have primitives creation shortcuts", () => {
    const createBox = getDefaultHotkeyById("tools.createBox")
    const createCylinder = getDefaultHotkeyById("tools.createCylinder")
    const createSphere = getDefaultHotkeyById("tools.createSphere")

    expect(createBox).toBeDefined()
    expect(createCylinder).toBeDefined()
    expect(createSphere).toBeDefined()
  })

  test("should have hydraulic element shortcuts", () => {
    const createChannel = getDefaultHotkeyById("tools.createChannel")
    const createTransition = getDefaultHotkeyById("tools.createTransition")

    expect(createChannel).toBeDefined()
    expect(createTransition).toBeDefined()
  })
})

describe("getAllDefaultHotkeys", () => {
  test("should return flat array of all hotkeys", () => {
    const allHotkeys = getAllDefaultHotkeys()

    expect(Array.isArray(allHotkeys)).toBe(true)
    expect(allHotkeys.length).toBeGreaterThan(20)
  })

  test("should include hotkeys from all categories", () => {
    const allHotkeys = getAllDefaultHotkeys()
    const totalInCategories = DEFAULT_HOTKEYS.reduce((sum, cat) => sum + cat.hotkeys.length, 0)

    expect(allHotkeys.length).toBe(totalInCategories)
  })
})

describe("getDefaultHotkeyById", () => {
  test("should find existing hotkey by ID", () => {
    const hotkey = getDefaultHotkeyById("file.save")

    expect(hotkey).toBeDefined()
    expect(hotkey?.id).toBe("file.save")
    expect(hotkey?.name).toBe("Save")
  })

  test("should return undefined for non-existent ID", () => {
    const hotkey = getDefaultHotkeyById("non.existent")
    expect(hotkey).toBeUndefined()
  })

  test("should return undefined for empty ID", () => {
    const hotkey = getDefaultHotkeyById("")
    expect(hotkey).toBeUndefined()
  })
})

describe("getCategoryLabel", () => {
  test("should return label for existing category", () => {
    expect(getCategoryLabel("file")).toBe("File")
    expect(getCategoryLabel("edit")).toBe("Edit")
    expect(getCategoryLabel("view")).toBe("View")
    expect(getCategoryLabel("transform")).toBe("Transform")
    expect(getCategoryLabel("navigation")).toBe("Navigation")
    expect(getCategoryLabel("workspace")).toBe("Workspace")
    expect(getCategoryLabel("tools")).toBe("Tools")
  })

  test("should return category name for unknown category", () => {
    // For unknown categories, it should return the category string itself
    const unknownCategory = "unknown" as any
    expect(getCategoryLabel(unknownCategory)).toBe("unknown")
  })
})
