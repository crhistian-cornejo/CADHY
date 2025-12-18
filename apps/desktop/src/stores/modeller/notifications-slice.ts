/**
 * Notifications Slice - CADHY Modeller Store
 *
 * Manages design notifications and warnings for hydraulic elements.
 * Automatically analyzes the scene and generates warnings for:
 * - Froude number out of range for stilling basin types
 * - Excessive velocities
 * - Steep slopes without energy dissipators
 * - Geometry issues (dimensions, continuity)
 * - Connection problems
 */

import type { StateCreator } from "zustand"
import type { ModellerStore } from "./store-types"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  DesignNotification,
  NotificationAction,
  NotificationCategory,
  NotificationSeverity,
  NotificationSummary,
  StillingBasinConfig,
  StillingBasinType,
  TransitionObject,
} from "./types"

// ============================================================================
// SLICE STATE TYPE
// ============================================================================

export interface NotificationsSliceState {
  notifications: DesignNotification[]
  showNotificationsPanel: boolean
}

export interface NotificationsSliceActions {
  /** Regenerate all notifications based on current scene objects */
  analyzeScene: () => void
  /** Dismiss a specific notification */
  dismissNotification: (id: string) => void
  /** Dismiss all notifications */
  dismissAllNotifications: () => void
  /** Clear all notifications */
  clearNotifications: () => void
  /** Toggle notifications panel visibility */
  toggleNotificationsPanel: () => void
  /** Set notifications panel visibility */
  setShowNotificationsPanel: (show: boolean) => void
  /** Get notification summary counts */
  getNotificationSummary: () => NotificationSummary
  /** Get notifications for a specific object */
  getNotificationsForObject: (objectId: string) => DesignNotification[]
  /** Get active (non-dismissed) notifications */
  getActiveNotifications: () => DesignNotification[]
  /** Execute a notification action (e.g., add recommended basin) */
  executeNotificationAction: (notificationId: string) => void
}

export type NotificationsSlice = NotificationsSliceState & NotificationsSliceActions

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: NotificationsSliceState = {
  notifications: [],
  showNotificationsPanel: false,
}

// ============================================================================
// HYDRAULIC ANALYSIS HELPERS
// ============================================================================

/** Froude number ranges for different stilling basin types (USBR EM-25) */
const STILLING_BASIN_FROUDE_RANGES: Record<
  StillingBasinType,
  { min: number; max: number; name: string }
> = {
  none: { min: 0, max: Infinity, name: "None" },
  "type-i": { min: 1.7, max: 2.5, name: "USBR Type I" },
  "type-ii": { min: 4.5, max: Infinity, name: "USBR Type II" },
  "type-iii": { min: 4.5, max: 17, name: "USBR Type III" },
  "type-iv": { min: 2.5, max: 4.5, name: "USBR Type IV" },
  saf: { min: 1.7, max: 17, name: "SAF" },
}

/** Maximum recommended velocities by material */
const MAX_VELOCITIES = {
  concrete: 10, // m/s - concrete lined
  earth: 1.5, // m/s - unlined earth
  rock: 4.5, // m/s - rock
}

/** Generate a unique notification ID */
function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a notification object */
function createNotification(
  objectId: string | null,
  objectName: string | null,
  severity: NotificationSeverity,
  category: NotificationCategory,
  title: string,
  message: string,
  recommendation?: string,
  action?: NotificationAction
): DesignNotification {
  return {
    id: generateNotificationId(),
    objectId,
    objectName,
    severity,
    category,
    title,
    message,
    recommendation,
    action,
    timestamp: Date.now(),
    dismissed: false,
  }
}

/** Estimate Froude number for a channel/chute */
function estimateFroudeNumber(
  slope: number,
  depth: number,
  width: number,
  manningN: number = 0.015
): number {
  // Using Manning's equation to estimate velocity
  // V = (1/n) * R^(2/3) * S^(1/2)
  // For wide channels: R ≈ depth
  // Fr = V / sqrt(g * depth)
  const g = 9.81
  const hydraulicRadius = (width * depth) / (width + 2 * depth)
  const velocity = (1 / manningN) * hydraulicRadius ** (2 / 3) * slope ** 0.5
  const froude = velocity / Math.sqrt(g * depth)
  return froude
}

/** Estimate velocity using Manning's equation */
function estimateVelocity(
  slope: number,
  depth: number,
  width: number,
  manningN: number = 0.015
): number {
  const hydraulicRadius = (width * depth) / (width + 2 * depth)
  return (1 / manningN) * hydraulicRadius ** (2 / 3) * slope ** 0.5
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeChannel(channel: ChannelObject, notifications: DesignNotification[]): void {
  const { name, id, slope, section, manningN } = channel

  // Get section dimensions
  let width = 2
  let depth = 1.5

  if (section.type === "rectangular") {
    width = section.width
    depth = section.depth
  } else if (section.type === "trapezoidal") {
    width = section.bottomWidth
    depth = section.depth
  } else if (section.type === "triangular") {
    depth = section.depth
    width = depth * section.sideSlope * 2
  }

  // Check for steep slopes without protection
  if (slope > 0.05) {
    // > 5%
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "hydraulics",
        "Steep Channel Slope",
        `Slope exceeds 5%, which may cause supercritical flow and erosion issues.`,
        "Consider using a chute with step blocks or a drop structure with stilling basin (USBR EM-25)."
      )
    )
  }

  // Estimate velocity and check limits
  const velocity = estimateVelocity(slope, depth, width, manningN)
  if (velocity > MAX_VELOCITIES.concrete) {
    notifications.push(
      createNotification(
        id,
        name,
        "error",
        "hydraulics",
        "Excessive Velocity",
        `Velocity exceeds ${MAX_VELOCITIES.concrete} m/s, the maximum for concrete-lined channels.`,
        "Reduce slope, increase cross-section area, or add energy dissipators (USBR Design Standards No. 14)."
      )
    )
  } else if (velocity > MAX_VELOCITIES.rock) {
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "hydraulics",
        "High Velocity",
        `Velocity is in the 4.5-10 m/s range. Ensure adequate erosion protection.`,
        "Consider concrete lining (n=0.013-0.015) or riprap protection per HEC-15."
      )
    )
  }

  // Check freeboard
  if (channel.freeBoard < 0.15) {
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "geometry",
        "Low Freeboard",
        `Freeboard is below the minimum 15 cm recommended for small channels.`,
        "Increase freeboard to 15-30 cm for small channels, 30-60 cm for large channels (ASCE Manual 108)."
      )
    )
  }
}

function analyzeTransition(
  transition: TransitionObject,
  _objects: AnySceneObject[],
  notifications: DesignNotification[]
): void {
  const { name, id, inlet, outlet, startElevation, endElevation, length, stillingBasin } =
    transition

  const drop = startElevation - endElevation
  const slope = drop / length

  // Check for significant drop without stilling basin
  if (drop > 1 && (!stillingBasin || stillingBasin.type === "none")) {
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "stilling-basin",
        "Drop Without Stilling Basin",
        `Drop exceeds 1 meter without energy dissipation structure.`,
        "Add a stilling basin per USBR EM-25 or a drop structure for energy dissipation."
      )
    )
  }

  // If has stilling basin, check Froude number compatibility
  if (stillingBasin && stillingBasin.type !== "none") {
    const froude = estimateFroudeNumber(slope, outlet.depth, outlet.width)
    const range = STILLING_BASIN_FROUDE_RANGES[stillingBasin.type]

    if (froude < range.min || froude > range.max) {
      notifications.push(
        createNotification(
          id,
          name,
          "warning",
          "stilling-basin",
          "Froude Number Mismatch",
          `${range.name} basin is designed for Fr ${range.min}-${range.max}. Current geometry suggests flow outside this range.`,
          froude < range.min
            ? "Consider Type I basin for lower Froude numbers, or increase slope to match Fr range."
            : "Consider Type II or Type III basin for higher Froude numbers (USBR Design Standards)."
        )
      )
    }
  }

  // Check for width changes > 3:1 ratio
  const widthRatio = Math.max(inlet.width, outlet.width) / Math.min(inlet.width, outlet.width)
  if (widthRatio > 3) {
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "geometry",
        "Large Width Change",
        `Width ratio exceeds 3:1, which may cause flow separation and eddies.`,
        "Use multiple transitions with max 2:1 ratio each, or increase transition length (ASCE Manual 108)."
      )
    )
  }

  // Check transition length (should be >= 2*width change)
  const widthChange = Math.abs(outlet.width - inlet.width)
  const recommendedLength = widthChange * 4
  if (length < recommendedLength && widthChange > 0.5) {
    notifications.push(
      createNotification(
        id,
        name,
        "info",
        "geometry",
        "Short Transition",
        `Transition length should be at least 4× the width change for smooth flow.`,
        "Recommended minimum: 4-6× width change for expansions, 2-4× for contractions (Chow, 1959)."
      )
    )
  }
}

function analyzeChute(chute: ChuteObject, notifications: DesignNotification[]): void {
  const { name, id, slope, width, depth, manningN, drop, stillingBasin, chuteType } = chute

  // Estimate Froude number at chute outlet
  const froude = estimateFroudeNumber(slope, depth, width, manningN)
  const velocity = estimateVelocity(slope, depth, width, manningN)

  // Check for very steep smooth chutes (no energy dissipation along the way)
  if (slope > 0.15 && chuteType === "smooth") {
    notifications.push(
      createNotification(
        id,
        name,
        "warning",
        "hydraulics",
        "Steep Smooth Chute",
        `Slope exceeds 15% without energy dissipation along the chute.`,
        "Consider using stepped or baffled chute type to reduce outlet velocity (USBR Design of Small Dams)."
      )
    )
  }

  // Check for high drops without stilling basin
  if (drop > 3 && (!stillingBasin || stillingBasin.type === "none")) {
    // Calculate recommended basin parameters for the action
    const recommendedBasinType =
      froude > 4.5 ? (velocity > 15 ? "type-ii" : "type-iii") : froude > 2.5 ? "type-iv" : "saf"

    // Calculate contracted depth at chute outlet
    // For supercritical flow: d1 = q/V where q = Q/width
    // Estimate q from Manning: Q = A*V, for rectangular section
    const _g = 9.81
    // Using energy equation: d1 ≈ depth at critical depth / Fr^(2/3) for supercritical
    // Or simpler: d1 = (2 * depth) / (1 + 2 * froude^2 / (froude^2 - 1)^0.5)
    // Simplified: for high Fr, d1 ≈ depth / (0.5 * Fr)
    const d1 = froude > 1.5 ? Math.max(0.1, depth / (0.5 * froude)) : depth * 0.8

    // Conjugate depth using Belanger equation
    const d2 = (d1 / 2) * (Math.sqrt(1 + 8 * froude * froude) - 1)

    // Basin length from USBR curves (approximately 4.5 * d2 for Type III, 4.0 for Type II)
    const basinLengthMultiplier = recommendedBasinType === "type-ii" ? 4.0 : 4.5
    const basinLength = Math.max(basinLengthMultiplier * d2, 3) // Minimum 3m

    // Basin depth = difference between conjugate depth and expected tailwater
    // Assuming tailwater at approximately d1 elevation, basin goes down by d2 - d1
    const _basinDepth = Math.max(d2 - d1, d1, 0.5) // At least d1 or 0.5m

    notifications.push(
      createNotification(
        id,
        name,
        "error",
        "stilling-basin",
        "High Drop Without Stilling Basin",
        `Drop exceeds 3 meters without a stilling basin for energy dissipation. Fr ≈ ${froude.toFixed(1)}, V ≈ ${velocity.toFixed(1)} m/s.`,
        "Add USBR Type II or III basin. Basin length typically 4-5× conjugate depth (EM-25).",
        {
          type: "add-stilling-basin",
          label: "Add Recommended Basin",
          payload: {
            objectId: id,
            basinType: recommendedBasinType,
            basinLength: Math.max(basinLength, 3),
            basinDepth: d2 * 0.5,
            froude,
            velocity,
          },
        }
      )
    )
  }

  // Check stilling basin Froude compatibility
  if (stillingBasin && stillingBasin.type !== "none") {
    const range = STILLING_BASIN_FROUDE_RANGES[stillingBasin.type]

    if (froude < range.min) {
      notifications.push(
        createNotification(
          id,
          name,
          "warning",
          "stilling-basin",
          "Froude Number Too Low",
          `${range.name} basin requires Fr > ${range.min}. Current geometry produces Fr ≈ ${froude.toFixed(1)}.`,
          "Consider Type I basin for low Fr, or increase chute slope to match required Fr range."
        )
      )
    } else if (froude > range.max) {
      notifications.push(
        createNotification(
          id,
          name,
          "warning",
          "stilling-basin",
          "Froude Number Too High",
          `${range.name} basin is limited to Fr < ${range.max}. Current geometry produces Fr ≈ ${froude.toFixed(1)}.`,
          "Consider Type II basin (no upper Fr limit) for very high velocity flows."
        )
      )
    }
  }

  // Check outlet velocity
  if (velocity > MAX_VELOCITIES.concrete) {
    notifications.push(
      createNotification(
        id,
        name,
        "error",
        "hydraulics",
        "Excessive Outlet Velocity",
        `Outlet velocity exceeds ${MAX_VELOCITIES.concrete} m/s concrete limit.`,
        "Add step blocks, deepen stilling basin, or reduce chute slope (USBR Design Standards No. 14)."
      )
    )
  }
}

function analyzeConnections(objects: AnySceneObject[], notifications: DesignNotification[]): void {
  // Find disconnected hydraulic elements
  const hydraulicObjects = objects.filter(
    (o) => o.type === "channel" || o.type === "transition" || o.type === "chute"
  ) as (ChannelObject | TransitionObject | ChuteObject)[]

  for (const obj of hydraulicObjects) {
    // Check for elements without upstream connection (except first in chain)
    if (!obj.upstreamChannelId) {
      // This might be intentional (start of system), so just info
      const hasDownstreamConnection = hydraulicObjects.some((o) => o.upstreamChannelId === obj.id)

      if (!hasDownstreamConnection && hydraulicObjects.length > 1) {
        notifications.push(
          createNotification(
            obj.id,
            obj.name,
            "info",
            "connection",
            "Isolated Element",
            `"${obj.name}" is not connected to other hydraulic elements in the system.`,
            "Connect upstream or downstream to form a continuous hydraulic chain. Isolated elements cannot be analyzed for energy grade line continuity."
          )
        )
      }
    }
  }

  // Check for elevation discontinuities
  for (const obj of hydraulicObjects) {
    if (obj.upstreamChannelId) {
      const upstream = hydraulicObjects.find((o) => o.id === obj.upstreamChannelId)
      if (upstream) {
        const upstreamEnd = "endElevation" in upstream ? upstream.endElevation : 0
        const currentStart = obj.startElevation
        const diff = Math.abs(upstreamEnd - currentStart)

        if (diff > 0.01) {
          // More than 1cm difference
          const severity = diff > 0.1 ? "error" : "warning" // >10cm is critical
          notifications.push(
            createNotification(
              obj.id,
              obj.name,
              severity,
              "connection",
              "Elevation Discontinuity",
              `${(diff * 100).toFixed(0)}cm elevation gap between "${upstream.name}" outlet and "${obj.name}" inlet.`,
              diff > 0.1
                ? "Critical discontinuity will cause hydraulic jump or flow separation. Add a transition structure or recalculate the hydraulic chain."
                : "Minor discontinuity may cause local turbulence. Verify if intentional drop or adjust elevations for smooth energy grade line."
            )
          )
        }
      }
    }
  }
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createNotificationsSlice: StateCreator<ModellerStore, [], [], NotificationsSlice> = (
  set,
  get
) => ({
  ...initialState,

  analyzeScene: () => {
    const notifications: DesignNotification[] = []
    const objects = get().objects

    // Analyze each object by type
    for (const obj of objects) {
      switch (obj.type) {
        case "channel":
          analyzeChannel(obj as ChannelObject, notifications)
          break
        case "transition":
          analyzeTransition(obj as TransitionObject, objects, notifications)
          break
        case "chute":
          analyzeChute(obj as ChuteObject, notifications)
          break
      }
    }

    // Analyze connections between elements
    analyzeConnections(objects, notifications)

    set({ notifications })
  },

  dismissNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n)),
    }))
  },

  dismissAllNotifications: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, dismissed: true })),
    }))
  },

  clearNotifications: () => {
    set({ notifications: [] })
  },

  toggleNotificationsPanel: () => {
    set((state) => ({ showNotificationsPanel: !state.showNotificationsPanel }))
  },

  setShowNotificationsPanel: (show: boolean) => {
    set({ showNotificationsPanel: show })
  },

  getNotificationSummary: () => {
    const notifications = get().notifications.filter((n) => !n.dismissed)
    return {
      info: notifications.filter((n) => n.severity === "info").length,
      warning: notifications.filter((n) => n.severity === "warning").length,
      error: notifications.filter((n) => n.severity === "error").length,
      total: notifications.length,
    }
  },

  getNotificationsForObject: (objectId: string) => {
    return get().notifications.filter((n) => n.objectId === objectId && !n.dismissed)
  },

  getActiveNotifications: () => {
    return get().notifications.filter((n) => !n.dismissed)
  },

  executeNotificationAction: (notificationId: string) => {
    const notification = get().notifications.find((n) => n.id === notificationId)
    if (!notification?.action) return

    const { action } = notification
    const updateObject = get().updateObject

    switch (action.type) {
      case "add-stilling-basin": {
        const payload = action.payload as {
          objectId: string
          basinType: StillingBasinType
          basinLength: number
          basinDepth: number
          froude?: number
        }

        if (!payload.objectId) return

        // Get the chute to calculate proportional dimensions
        const chute = get().objects.find((o) => o.id === payload.objectId) as
          | ChuteObject
          | undefined
        if (!chute || chute.type !== "chute") return

        // Calculate block dimensions based on chute geometry
        // D1 is approximately the contracted depth at chute outlet
        const d1 = chute.depth * 0.6 // Conservative estimate for contracted depth
        const chuteWidth = chute.width

        // Block dimensions per USBR guidelines
        const blockWidth = Math.max(0.2, d1 * 0.75)
        const blockHeight = Math.max(0.2, d1)
        const blockThickness = Math.max(0.15, d1 * 0.5)
        const blockCount = Math.max(2, Math.floor(chuteWidth / (blockWidth * 2)))

        // Create a recommended stilling basin configuration
        const basinConfig: StillingBasinConfig = {
          type: payload.basinType,
          length: payload.basinLength,
          depth: payload.basinDepth,
          floorThickness: Math.max(0.25, chute.thickness * 1.5),
          chuteBlocks:
            payload.basinType !== "type-i" && payload.basinType !== "type-iv"
              ? {
                  count: blockCount,
                  width: blockWidth,
                  height: blockHeight,
                  thickness: blockThickness,
                  spacing: blockWidth * 0.5,
                }
              : null,
          baffleBlocks:
            payload.basinType === "type-iii" || payload.basinType === "saf"
              ? {
                  rows: 1,
                  blocksPerRow: Math.max(2, blockCount - 1),
                  width: blockWidth * 0.8,
                  height: blockHeight * 0.8, // 0.8*D1 per USBR Type III
                  thickness: blockThickness,
                  distanceFromInlet: payload.basinLength * 0.35,
                  rowSpacing: 0,
                }
              : null,
          endSill:
            payload.basinType !== "type-i"
              ? {
                  type: payload.basinType === "type-ii" ? "dentated" : "solid",
                  height: Math.max(0.2, d1 * 0.5),
                  toothWidth: payload.basinType === "type-ii" ? blockWidth * 0.5 : undefined,
                  toothSpacing: payload.basinType === "type-ii" ? blockWidth * 0.5 : undefined,
                }
              : null,
          wingwallAngle: payload.basinType === "saf" ? 45 : 0,
        }

        // Update the chute object with the new basin
        updateObject(payload.objectId, { stillingBasin: basinConfig })

        // Dismiss this notification since the action was taken
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, dismissed: true } : n
          ),
        }))

        // Re-analyze to update remaining notifications
        setTimeout(() => get().analyzeScene(), 100)
        break
      }
      // Add more action types as needed
      default:
        console.warn(`Unknown notification action type: ${action.type}`)
    }
  },
})
