/**
 * BoxCommand - CADHY
 *
 * Interactive box creation command inspired by Plasticity.
 * Coordinates PointPicker, BoxFactory, and ActiveOperationDialog.
 *
 * Flow:
 * 1. Pick first corner (p1)
 * 2. Pick second corner (p2) - defines base rectangle
 * 3. Pick height (p3) - defines box height
 * 4. Show ActiveOperationDialog for fine-tuning
 * 5. Confirm and create final box
 */

import type * as THREE from "three"
import { PointPicker } from "../point-picker"
import { BoxFactory } from "./BoxFactory"

// ============================================================================
// TYPES
// ============================================================================

export interface BoxCommandOptions {
  camera: THREE.Camera
  scene: THREE.Scene
  domElement: HTMLElement
  onShowDialog: (params: BoxDialogParams) => void
  onHideDialog: () => void
}

export interface BoxDialogParams {
  width: number
  length: number
  height: number
  onParameterChange: (id: string, value: number) => void
  onConfirm: () => void
  onCancel: () => void
}

export type BoxCommandState =
  | "idle"
  | "picking_p1"
  | "picking_p2"
  | "picking_p3"
  | "editing_params"
  | "completed"
  | "cancelled"

// ============================================================================
// BOX COMMAND
// ============================================================================

export class BoxCommand {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private domElement: HTMLElement
  private onShowDialog: (params: BoxDialogParams) => void
  private onHideDialog: () => void

  private pointPicker: PointPicker
  private factory: BoxFactory

  private resolvePromise: ((shapeId: string | null) => void) | null = null
  private rejectPromise: ((error: Error) => void) | null = null

  constructor(options: BoxCommandOptions) {
    this.camera = options.camera
    this.scene = options.scene
    this.domElement = options.domElement
    this.onShowDialog = options.onShowDialog
    this.onHideDialog = options.onHideDialog

    this.pointPicker = new PointPicker({
      camera: this.camera,
      scene: this.scene,
      domElement: this.domElement,
      gridSnap: true,
      gridSize: 1,
      objectSnap: true,
    })

    this.factory = new BoxFactory(this.scene)
  }

  /**
   * Execute the box creation command
   * Returns a promise that resolves with the shape ID or null if cancelled
   */
  async execute(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject
      this.start()
    })
  }

  private async start() {
    try {
      this.state = "picking_p1"
      console.log("[BoxCommand] Waiting for first corner point (p1)...")

      // Step 1: Pick first corner (p1)
      const { point: p1 } = await this.pointPicker.execute()
      this.factory.p1 = p1
      console.log("[BoxCommand] p1 selected:", p1)

      this.state = "picking_p2"
      console.log("[BoxCommand] Waiting for second corner point (p2)...")

      // Step 2: Pick second corner (p2) with live preview
      const { point: p2 } = await this.pointPicker.execute(({ point }) => {
        if (point) {
          this.factory.p2 = point
          this.factory.update()
        }
      })
      this.factory.p2 = p2
      this.factory.update()
      console.log("[BoxCommand] p2 selected:", p2)

      this.state = "picking_p3"
      console.log("[BoxCommand] Waiting for height point (p3)...")

      // Step 3: Pick height (p3) with live preview
      const { point: p3 } = await this.pointPicker.execute(({ point }) => {
        if (point) {
          this.factory.p3 = point
          this.factory.update()
        }
      })
      this.factory.p3 = p3
      this.factory.update()
      console.log("[BoxCommand] p3 selected:", p3)

      // Step 4: Show dialog for parameter editing
      this.state = "editing_params"
      this.showParameterDialog()
    } catch (error) {
      console.error("[BoxCommand] Error during execution:", error)
      this.cancel()
      if (this.rejectPromise) {
        this.rejectPromise(error as Error)
      }
    }
  }

  private showParameterDialog() {
    this.onShowDialog({
      width: this.factory.width,
      length: this.factory.length,
      height: this.factory.height,
      onParameterChange: (id: string, value: number) => {
        switch (id) {
          case "width":
            this.factory.width = value
            break
          case "length":
            this.factory.length = value
            break
          case "height":
            this.factory.height = value
            break
        }
        this.factory.update()
      },
      onConfirm: () => this.confirm(),
      onCancel: () => this.cancel(),
    })
  }

  private async confirm() {
    try {
      this.state = "completed"
      console.log("[BoxCommand] Confirming box creation...")

      const shapeId = await this.factory.commit()
      console.log("[BoxCommand] Box created with ID:", shapeId)

      this.onHideDialog()
      this.cleanup()

      if (this.resolvePromise) {
        this.resolvePromise(shapeId)
      }
    } catch (error) {
      console.error("[BoxCommand] Failed to create box:", error)
      if (this.rejectPromise) {
        this.rejectPromise(error as Error)
      }
    }
  }

  private cancel() {
    this.state = "cancelled"
    console.log("[BoxCommand] Cancelled")

    this.factory.cancel()
    this.pointPicker.cancel()
    this.onHideDialog()
    this.cleanup()

    if (this.resolvePromise) {
      this.resolvePromise(null)
    }
  }

  private cleanup() {
    this.pointPicker.dispose()
    this.factory.dispose()
  }
}

export default BoxCommand
