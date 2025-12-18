/**
 * Scene Tools Tests - @cadhy/ai
 *
 * Tests for scene manipulation tools including:
 * - Context & Information tools (getSceneInfo, getObjectInfo, measureDistance)
 * - Material tools (setMaterial)
 * - Transform tools (transformObject, moveObject, rotateObject, scaleObject, alignObjects, distributeObjects)
 * - Visibility & Selection tools (setVisibility, setLocked, selectObjects)
 * - Naming & Organization tools (renameObject, setLayer)
 * - Level of Detail tools (setLOD)
 * - Copy & Array tools (copyObjects, arrayObjects, polarArray)
 * - Viewport tools (focusObjects, setCameraView)
 * - History tools (undo, redo, clearScene, getHistoryInfo)
 */

import { describe, expect, test } from "bun:test"
import {
  alignObjectsTool,
  arrayObjectsTool,
  clearSceneTool,
  copyObjectsTool,
  distributeObjectsTool,
  focusObjectsTool,
  getHistoryInfoTool,
  getObjectInfoTool,
  // Individual tool exports
  getSceneInfoTool,
  measureDistanceTool,
  moveObjectTool,
  polarArrayTool,
  redoTool,
  renameObjectTool,
  rotateObjectTool,
  scaleObjectTool,
  sceneTools,
  selectObjectsTool,
  setCameraViewTool,
  setLayerTool,
  setLODTool,
  setLockedTool,
  setMaterialTool,
  setVisibilityTool,
  transformObjectTool,
  undoTool,
} from "../tools/scene-tools"

describe("sceneTools", () => {
  // ============================================================
  // Export Verification
  // ============================================================

  describe("Export Verification", () => {
    test("should export sceneTools object with all 25 tools", () => {
      expect(sceneTools).toBeDefined()
      expect(typeof sceneTools).toBe("object")

      const expectedTools = [
        // Context & Information
        "getSceneInfo",
        "getObjectInfo",
        "measureDistance",
        // History & Scene Management
        "undo",
        "redo",
        "clearScene",
        "getHistoryInfo",
        // Material
        "setMaterial",
        // Transform
        "transformObject",
        "moveObject",
        "rotateObject",
        "scaleObject",
        "alignObjects",
        "distributeObjects",
        // Visibility & Selection
        "setVisibility",
        "setLocked",
        "selectObjects",
        // Naming & Organization
        "renameObject",
        "setLayer",
        // Level of Detail
        "setLOD",
        // Copy & Array
        "copyObjects",
        "arrayObjects",
        "polarArray",
        // Viewport
        "focusObjects",
        "setCameraView",
      ]

      expect(Object.keys(sceneTools).sort()).toEqual(expectedTools.sort())
    })

    test("should export individual tool functions", () => {
      expect(getSceneInfoTool).toBeDefined()
      expect(getObjectInfoTool).toBeDefined()
      expect(measureDistanceTool).toBeDefined()
      expect(setMaterialTool).toBeDefined()
      expect(transformObjectTool).toBeDefined()
      expect(moveObjectTool).toBeDefined()
      expect(rotateObjectTool).toBeDefined()
      expect(scaleObjectTool).toBeDefined()
      expect(alignObjectsTool).toBeDefined()
      expect(distributeObjectsTool).toBeDefined()
      expect(setVisibilityTool).toBeDefined()
      expect(setLockedTool).toBeDefined()
      expect(selectObjectsTool).toBeDefined()
      expect(renameObjectTool).toBeDefined()
      expect(setLayerTool).toBeDefined()
      expect(setLODTool).toBeDefined()
      expect(copyObjectsTool).toBeDefined()
      expect(arrayObjectsTool).toBeDefined()
      expect(polarArrayTool).toBeDefined()
      expect(focusObjectsTool).toBeDefined()
      expect(setCameraViewTool).toBeDefined()
      expect(undoTool).toBeDefined()
      expect(redoTool).toBeDefined()
      expect(clearSceneTool).toBeDefined()
      expect(getHistoryInfoTool).toBeDefined()
    })

    test("all tools should have description and execute function", () => {
      for (const [_name, tool] of Object.entries(sceneTools)) {
        expect(tool.description).toBeDefined()
        expect(typeof tool.description).toBe("string")
        expect(tool.description?.length).toBeGreaterThan(10)
        expect(tool.execute).toBeDefined()
        expect(typeof tool.execute).toBe("function")
      }
    })
  })

  // ============================================================
  // Context & Information Tools
  // ============================================================

  describe("Context & Information Tools", () => {
    test("getSceneInfo should have correct description", () => {
      expect(getSceneInfoTool.description).toContain("scene")
      expect(getSceneInfoTool.description).toContain("objects")
    })

    test("getSceneInfo should have execute function", () => {
      expect(getSceneInfoTool.execute).toBeDefined()
      expect(typeof getSceneInfoTool.execute).toBe("function")
    })

    test("getObjectInfo should have correct description", () => {
      expect(getObjectInfoTool.description).toContain("information")
      expect(getObjectInfoTool.description).toContain("object")
    })

    test("measureDistance should describe distance measurement", () => {
      expect(measureDistanceTool.description).toContain("distance")
      expect(measureDistanceTool.description).toContain("points")
    })
  })

  // ============================================================
  // Material Tools
  // ============================================================

  describe("Material Tools", () => {
    test("setMaterial should have correct description", () => {
      expect(setMaterialTool.description).toContain("material")
      expect(setMaterialTool.description).toContain("color")
      expect(setMaterialTool.description).toContain("opacity")
    })

    test("setMaterial should have execute function", () => {
      expect(setMaterialTool.execute).toBeDefined()
      expect(typeof setMaterialTool.execute).toBe("function")
    })
  })

  // ============================================================
  // Transform Tools
  // ============================================================

  describe("Transform Tools", () => {
    test("transformObject should describe position, rotation, scale", () => {
      expect(transformObjectTool.description).toContain("position")
      expect(transformObjectTool.description).toContain("rotation")
      expect(transformObjectTool.description).toContain("scale")
    })

    test("moveObject should describe relative offset", () => {
      expect(moveObjectTool.description).toContain("offset")
      expect(moveObjectTool.description).toContain("Move")
    })

    test("rotateObject should describe rotation", () => {
      expect(rotateObjectTool.description).toContain("Rotate")
      expect(rotateObjectTool.description).toContain("angle")
    })

    test("scaleObject should describe scaling", () => {
      expect(scaleObjectTool.description).toContain("Scale")
      expect(scaleObjectTool.description).toContain("factor")
    })

    test("alignObjects should describe alignment", () => {
      expect(alignObjectsTool.description).toContain("Align")
      expect(alignObjectsTool.description).toContain("axis")
    })

    test("distributeObjects should describe distribution", () => {
      expect(distributeObjectsTool.description).toContain("Distribute")
      expect(distributeObjectsTool.description).toContain("evenly")
    })

    test("all transform tools should have execute functions", () => {
      expect(transformObjectTool.execute).toBeDefined()
      expect(moveObjectTool.execute).toBeDefined()
      expect(rotateObjectTool.execute).toBeDefined()
      expect(scaleObjectTool.execute).toBeDefined()
      expect(alignObjectsTool.execute).toBeDefined()
      expect(distributeObjectsTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // Visibility & Selection Tools
  // ============================================================

  describe("Visibility & Selection Tools", () => {
    test("setVisibility should describe show/hide", () => {
      expect(setVisibilityTool.description).toContain("hide")
      expect(setVisibilityTool.description).toContain("Show")
    })

    test("setLocked should describe locking", () => {
      expect(setLockedTool.description).toContain("Lock")
      expect(setLockedTool.description).toContain("unlock")
    })

    test("selectObjects should describe selection modes", () => {
      expect(selectObjectsTool.description).toContain("Select")
      expect(selectObjectsTool.description).toContain("objects")
    })

    test("all visibility/selection tools should have execute functions", () => {
      expect(setVisibilityTool.execute).toBeDefined()
      expect(setLockedTool.execute).toBeDefined()
      expect(selectObjectsTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // Naming & Organization Tools
  // ============================================================

  describe("Naming & Organization Tools", () => {
    test("renameObject should describe renaming", () => {
      expect(renameObjectTool.description).toContain("Rename")
    })

    test("setLayer should describe layer management", () => {
      expect(setLayerTool.description).toContain("layer")
      expect(setLayerTool.description).toContain("Move")
    })

    test("all naming tools should have execute functions", () => {
      expect(renameObjectTool.execute).toBeDefined()
      expect(setLayerTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // Level of Detail Tools
  // ============================================================

  describe("Level of Detail Tools", () => {
    test("setLOD should describe mesh segments", () => {
      expect(setLODTool.description).toContain("level of detail")
      expect(setLODTool.description).toContain("segments")
    })

    test("setLOD should have execute function", () => {
      expect(setLODTool.execute).toBeDefined()
      expect(typeof setLODTool.execute).toBe("function")
    })
  })

  // ============================================================
  // Copy & Array Tools
  // ============================================================

  describe("Copy & Array Tools", () => {
    test("copyObjects should describe copying", () => {
      expect(copyObjectsTool.description).toContain("copies")
    })

    test("arrayObjects should describe linear/rectangular array", () => {
      expect(arrayObjectsTool.description).toContain("array")
      expect(arrayObjectsTool.description).toContain("rectangular")
    })

    test("polarArray should describe circular pattern", () => {
      expect(polarArrayTool.description).toContain("polar")
      expect(polarArrayTool.description).toContain("circular")
    })

    test("all copy/array tools should have execute functions", () => {
      expect(copyObjectsTool.execute).toBeDefined()
      expect(arrayObjectsTool.execute).toBeDefined()
      expect(polarArrayTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // Viewport Tools
  // ============================================================

  describe("Viewport Tools", () => {
    test("focusObjects should describe camera focus", () => {
      expect(focusObjectsTool.description).toContain("Focus")
      expect(focusObjectsTool.description).toContain("camera")
    })

    test("setCameraView should describe camera presets", () => {
      expect(setCameraViewTool.description).toContain("camera")
      expect(setCameraViewTool.description).toContain("view")
    })

    test("all viewport tools should have execute functions", () => {
      expect(focusObjectsTool.execute).toBeDefined()
      expect(setCameraViewTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // History & Scene Management Tools
  // ============================================================

  describe("History & Scene Management Tools", () => {
    test("undo should describe undoing actions", () => {
      expect(undoTool.description).toContain("Undo")
      expect(undoTool.description).toContain("action")
    })

    test("redo should describe redoing actions", () => {
      expect(redoTool.description).toContain("Redo")
    })

    test("clearScene should describe clearing with safety", () => {
      expect(clearSceneTool.description).toContain("Clear")
      expect(clearSceneTool.description).toContain("objects")
    })

    test("getHistoryInfo should describe history information", () => {
      expect(getHistoryInfoTool.description).toContain("history")
      expect(getHistoryInfoTool.description).toContain("undo")
    })

    test("all history tools should have execute functions", () => {
      expect(undoTool.execute).toBeDefined()
      expect(redoTool.execute).toBeDefined()
      expect(clearSceneTool.execute).toBeDefined()
      expect(getHistoryInfoTool.execute).toBeDefined()
    })
  })

  // ============================================================
  // Tool Consistency Checks
  // ============================================================

  describe("Tool Consistency", () => {
    test("all tools should have inputSchema defined", () => {
      for (const [_name, tool] of Object.entries(sceneTools)) {
        expect(tool.inputSchema).toBeDefined()
      }
    })

    test("tool count should match expected (25 tools)", () => {
      expect(Object.keys(sceneTools)).toHaveLength(25)
    })

    test("individual exports should match sceneTools object", () => {
      expect(sceneTools.getSceneInfo).toBe(getSceneInfoTool)
      expect(sceneTools.getObjectInfo).toBe(getObjectInfoTool)
      expect(sceneTools.measureDistance).toBe(measureDistanceTool)
      expect(sceneTools.setMaterial).toBe(setMaterialTool)
      expect(sceneTools.transformObject).toBe(transformObjectTool)
      expect(sceneTools.moveObject).toBe(moveObjectTool)
      expect(sceneTools.rotateObject).toBe(rotateObjectTool)
      expect(sceneTools.scaleObject).toBe(scaleObjectTool)
      expect(sceneTools.alignObjects).toBe(alignObjectsTool)
      expect(sceneTools.distributeObjects).toBe(distributeObjectsTool)
      expect(sceneTools.setVisibility).toBe(setVisibilityTool)
      expect(sceneTools.setLocked).toBe(setLockedTool)
      expect(sceneTools.selectObjects).toBe(selectObjectsTool)
      expect(sceneTools.renameObject).toBe(renameObjectTool)
      expect(sceneTools.setLayer).toBe(setLayerTool)
      expect(sceneTools.setLOD).toBe(setLODTool)
      expect(sceneTools.copyObjects).toBe(copyObjectsTool)
      expect(sceneTools.arrayObjects).toBe(arrayObjectsTool)
      expect(sceneTools.polarArray).toBe(polarArrayTool)
      expect(sceneTools.focusObjects).toBe(focusObjectsTool)
      expect(sceneTools.setCameraView).toBe(setCameraViewTool)
      expect(sceneTools.undo).toBe(undoTool)
      expect(sceneTools.redo).toBe(redoTool)
      expect(sceneTools.clearScene).toBe(clearSceneTool)
      expect(sceneTools.getHistoryInfo).toBe(getHistoryInfoTool)
    })
  })
})
