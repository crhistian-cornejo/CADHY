/**
 * CadIcon Component
 *
 * Optimized SVG icon system using symbol references.
 * 10x lighter than loading all icons as React components.
 *
 * Usage:
 *   <CadIcon name="box" size={24} />
 *   <CadIcon name="channel" className="text-blue-500" />
 */

export interface CadIconProps {
  /** Icon name without 'icon-' prefix (e.g., 'box', 'channel', 'sweep') */
  name: string
  /** Icon size in pixels (default: 24) */
  size?: number | string
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
  /** ARIA label for accessibility */
  "aria-label"?: string
}

/**
 * Renders an optimized SVG icon from the cad-icons sprite
 */
export function CadIcon({
  name,
  size = 24,
  className = "",
  onClick,
  "aria-label": ariaLabel,
}: CadIconProps) {
  const iconId = name.startsWith("icon-") ? name : `icon-${name}`

  return (
    <svg
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
      onClick={onClick}
      aria-label={ariaLabel || name}
      role={onClick ? "button" : "img"}
      style={{ fill: "currentColor" }}
    >
      <use xlinkHref={`#${iconId}`} />
    </svg>
  )
}

/**
 * Type-safe icon names (autocomplete support)
 */
export type IconName =
  // Primitives
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus"
  // Hydraulics
  | "channel"
  | "chute"
  | "transition"
  // CAD Operations
  | "extrude"
  | "revolve"
  | "sweep"
  | "loft"
  | "helix"
  // Modifiers
  | "fillet"
  | "chamfer"
  | "offset"
  | "shell"
  // Booleans
  | "union"
  | "difference"
  | "intersection"
  // Tools & Actions
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "measure"
  // View Controls
  | "view-top"
  | "view-front"
  | "view-iso"
  | "zoom-in"
  | "zoom-out"
  | "zoom-fit"
  // UI General
  | "save"
  | "open"
  | "settings"
  | "undo"
  | "redo"
  | "delete"
  | "eye"
  | "eye-slash"
  | "grid"
  | "play"
  | "pause"
  | "stop"
