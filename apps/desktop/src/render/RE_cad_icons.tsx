/**
 * CAD Icons - CADHY
 *
 * SVG icons adapted from Plasticity CAD for selection modes,
 * view modes, and common CAD operations.
 *
 * Full icon library from Plasticity + custom CADHY icons
 */

import { cn } from "@cadhy/ui"

interface IconProps {
  className?: string
}

// ============================================================================
// SELECTION MODE ICONS
// ============================================================================

/** Control point / Vertex selection */
export function ControlPointIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7.35304L21 16.647C21 16.8649 20.8819 17.0656 20.6914 17.1715L12.2914 21.8381C12.1102 21.9388 11.8898 21.9388 11.7086 21.8381L3.30861 17.1715C3.11814 17.0656 3 16.8649 3 16.647L2.99998 7.35304C2.99998 7.13514 3.11812 6.93437 3.3086 6.82855L11.7086 2.16188C11.8898 2.06121 12.1102 2.06121 12.2914 2.16188L20.6914 6.82855C20.8818 6.93437 21 7.13514 21 7.35304Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Edge selection */
export function EdgeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 7.35304L21 16.647C21 16.8649 20.8819 17.0656 20.6914 17.1715L12.2914 21.8381C12.1102 21.9388 11.8898 21.9388 11.7086 21.8381L3.30861 17.1715C3.11814 17.0656 3 16.8649 3 16.647L2.99998 7.35304C2.99998 7.13514 3.11812 6.93437 3.3086 6.82855L11.7086 2.16188C11.8898 2.06121 12.1102 2.06121 12.2914 2.16188L20.6914 6.82855C20.8818 6.93437 21 7.13514 21 7.35304Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 21L12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12.5 11V21C12.5 21.2761 12.2761 21.5 12 21.5C11.7239 21.5 11.5 21.2761 11.5 21V11C11.5 10.7239 11.7239 10.5 12 10.5C12.2761 10.5 12.5 10.7239 12.5 11Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Face selection */
export function FaceIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 7.35304L21 16.647C21 16.8649 20.8819 17.0656 20.6914 17.1715L12.2914 21.8381C12.1102 21.9388 11.8898 21.9388 11.7086 21.8381L3.30861 17.1715C3.11814 17.0656 3 16.8649 3 16.647L2.99998 7.35304C2.99998 7.13514 3.11812 6.93437 3.3086 6.82855L11.7086 2.16188C11.8898 2.06121 12.1102 2.06121 12.2914 2.16188L20.6914 6.82855C20.8818 6.93437 21 7.13514 21 7.35304Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.52844 7.29357L11.7086 11.8381C11.8898 11.9388 12.1102 11.9388 12.2914 11.8381L20.5 7.27777"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 21L12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M11.6914 11.8285L3.89139 7.49521C3.49147 7.27304 3 7.56222 3 8.01971V16.647C3 16.8649 3.11813 17.0656 3.30861 17.1715L11.1086 21.5048C11.5085 21.727 12 21.4378 12 20.9803V12.353C12 12.1351 11.8819 11.9344 11.6914 11.8285Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Solid / Body selection */
export function SolidIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.6954 7.18536L11.6954 11.1854L12.3046 9.81464L3.3046 5.81464L2.6954 7.18536ZM12.75 21.5V10.5H11.25V21.5H12.75ZM12.3046 11.1854L21.3046 7.18536L20.6954 5.81464L11.6954 9.81464L12.3046 11.1854Z"
        fill="currentColor"
      />
      <path
        d="M3 17.1101V6.88992C3 6.65281 3.13964 6.43794 3.35632 6.34164L11.7563 2.6083C11.9115 2.53935 12.0885 2.53935 12.2437 2.6083L20.6437 6.34164C20.8604 6.43794 21 6.65281 21 6.88992V17.1101C21 17.3472 20.8604 17.5621 20.6437 17.6584L12.2437 21.3917C12.0885 21.4606 11.9115 21.4606 11.7563 21.3917L3.35632 17.6584C3.13964 17.5621 3 17.3472 3 17.1101Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// VIEW MODE ICONS
// ============================================================================

/** Orthographic view */
export function OrthoViewIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 21V3H21V21H3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 16.5H12H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7.5H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 3V12V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Perspective view */
export function PerspectiveViewIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 21L4.14286 3H19.8571L23 21H1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 16.5H22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7.5H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M8 3.5L6.5 20.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.5L17.5 20.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** X-Ray / Wireframe view */
export function XRayIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 7.35304L21 16.647C21 16.8649 20.8819 17.0656 20.6914 17.1715L12.2914 21.8381C12.1102 21.9388 11.8898 21.9388 11.7086 21.8381L3.30861 17.1715C3.11814 17.0656 3 16.8649 3 16.647L2.99998 7.35304C2.99998 7.13514 3.11812 6.93437 3.3086 6.82855L11.7086 2.16188C11.8898 2.06121 12.1102 2.06121 12.2914 2.16188L20.6914 6.82855C20.8818 6.93437 21 7.13514 21 7.35304Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 16.7222L12.2914 12.1619C12.1102 12.0612 11.8898 12.0612 11.7086 12.1619L3.5 16.7222"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.52844 7.29357L11.7086 11.8381C11.8898 11.9388 12.1102 11.9388 12.2914 11.8381L20.5 7.27777"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 21L12 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Overlays / Gizmos toggle */
export function OverlaysIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 19.4516L12 12.8428M12 12.8428L12 2.99999M12 12.8428L3 19.4516"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.4375 16.7097L21 19.4516L18.1875 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 5.19354L12 2.99999L14.25 5.19354"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.8125 20L3 19.4516L3.5625 16.7097"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Render mode */
export function RenderModeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.1973 9C17.0976 8.82774 16.9896 8.66089 16.8739 8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.811 13.5C17.2683 15.6084 15.6084 17.2683 13.5 17.811"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Light on */
export function LightOnIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 2L20 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 2L4 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16L20 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16L4 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18H15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M11.9998 3C7.9997 3 5.95186 4.95029 5.99985 8C6.02324 9.48689 6.4997 10.5 7.49985 11.5C8.5 12.5 9 13 8.99985 15H14.9998C15 13.0001 15.5 12.5 16.4997 11.5001L16.4998 11.5C17.4997 10.5 17.9765 9.48689 17.9998 8C18.0478 4.95029 16 3 11.9998 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Light off */
export function LightOffIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 18H15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M16.4999 11.5C17.4997 10.5 17.9765 9.48689 17.9999 8C18.0479 4.95029 16 3 11.9999 3C10.8324 3 9.83119 3.16613 8.99988 3.47724"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.99985 15C9 13 8.5 12.5 7.49985 11.5C6.4997 10.5 6.02324 9.48689 5.99985 8C5.99142 7.46458 6.0476 6.96304 6.1676 6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3L21 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Eye / Visibility on */
export function EyeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12C19.1114 14.991 15.7183 18 12 18C8.2817 18 4.88856 14.991 3 12C5.29855 9.15825 7.99163 6 12 6C16.0084 6 18.7015 9.1582 21 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Eye off / Visibility off */
export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 8C7.5 14.5 16.5 14.5 19.5 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.8162 11.3175L19.5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.875V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.18383 11.3175L4.5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Settings */
export function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// TRANSFORM ICONS
// ============================================================================

/** Move / Translate */
export function MoveIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 9L12 22M12 22L15 19M12 22L9 19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15L12 2M12 2L15 5M12 2L9 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12H2M2 12L5 9M2 12L5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12H22M22 12L19 9M22 12L19 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Rotate */
export function RotateIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 12V16C5.5 18.2091 7.29086 20 9.5 20H10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14.5L5.5 12L8 14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12V8C18 5.79086 16.2091 4 14 4H13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 9.5L18 12L15.5 9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Scale */
export function ScaleIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 13.6V21H3.6C3.26863 21 3 20.7314 3 20.4V13H10.4C10.7314 13 11 13.2686 11 13.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 21H14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13V10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 3H3.6C3.26863 3 3 3.26863 3 3.6V6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3H10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 10V14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M18 3H20.4C20.7314 3 21 3.26863 21 3.6V6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 21H20.4C20.7314 21 21 20.7314 21 20.4V18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 10H14V13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Mirror */
export function MirrorIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.5 20H2L9.5 4V20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.125 20H22L21.0625 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.375 20H14.5V18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.5 12V14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M18.25 12L19.1875 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.375 8L14.5 4V8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// 3D PRIMITIVES ICONS
// ============================================================================

/** Box / Cube */
export function BoxIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.6954 7.18536L11.6954 11.1854L12.3046 9.81464L3.3046 5.81464L2.6954 7.18536ZM12.75 21.5V10.5H11.25V21.5H12.75ZM12.3046 11.1854L21.3046 7.18536L20.6954 5.81464L11.6954 9.81464L12.3046 11.1854Z"
        fill="currentColor"
      />
      <path
        d="M3 17.1101V6.88992C3 6.65281 3.13964 6.43794 3.35632 6.34164L11.7563 2.6083C11.9115 2.53935 12.0885 2.53935 12.2437 2.6083L20.6437 6.34164C20.8604 6.43794 21 6.65281 21 6.88992V17.1101C21 17.3472 20.8604 17.5621 20.6437 17.6584L12.2437 21.3917C12.0885 21.4606 11.9115 21.4606 11.7563 21.3917L3.35632 17.6584C3.13964 17.5621 3 17.3472 3 17.1101Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Sphere */
export function SphereIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22C8.68629 22 6 17.5228 6 12C6 6.47715 8.68629 2 12 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Cylinder */
export function CylinderIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C20 2 20 5 20 5C20 5 20 8 12 8C4 8 4 5 4 5C4 5 4 2 12 2Z"
        stroke="currentColor"
      />
      <path
        d="M12 16C20 16 20 19 20 19C20 19 20 22 12 22C4 22 4 19 4 19C4 19 4 16 12 16Z"
        stroke="currentColor"
      />
      <path d="M20 5V19" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5V19" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Cone */
export function ConeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L20 19C20 19 20 22 12 22C4 22 4 19 4 19L12 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16C20 16 20 19 20 19C20 19 20 22 12 22C4 22 4 19 4 19C4 19 4 16 12 16Z"
        stroke="currentColor"
      />
    </svg>
  )
}

/** Torus */
export function TorusIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
      />
    </svg>
  )
}

// ============================================================================
// 2D DRAWING ICONS
// ============================================================================

/** Line tool */
export function LineIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 20L21 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Curve tool */
export function CurveIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 20C11 20 13 4 21 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Circle tool */
export function CircleIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Arc */
export function ArcIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22 16C22 10.4772 17.5228 6 12 6C6.47715 6 2 10.4772 2 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17C2.55228 17 3 16.5523 3 16C3 15.4477 2.55228 15 2 15C1.44772 15 1 15.4477 1 16C1 16.5523 1.44772 17 2 17Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 17C22.5523 17 23 16.5523 23 16C23 15.4477 22.5523 15 22 15C21.4477 15 21 15.4477 21 16C21 16.5523 21.4477 17 22 17Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Ellipse */
export function EllipseIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C16.4183 22 20 18.4183 20 14C20 9.58172 16.4183 2 12 2C7.58172 2 4 9.58172 4 14C4 18.4183 7.58172 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Rectangle tool */
export function RectangleIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z"
        stroke="currentColor"
      />
      <path
        d="M3 4C3.55228 4 4 3.55228 4 3C4 2.44772 3.55228 2 3 2C2.44772 2 2 2.44772 2 3C2 3.55228 2.44772 4 3 4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 22C21.5523 22 22 21.5523 22 21C22 20.4477 21.5523 20 21 20C20.4477 20 20 20.4477 20 21C20 21.5523 20.4477 22 21 22Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Polygon tool */
export function PolygonIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.7 1.1732C11.8856 1.06603 12.1144 1.06603 12.3 1.17321L21.2263 6.3268C21.4119 6.43397 21.5263 6.63205 21.5263 6.84641V17.1536C21.5263 17.3679 21.4119 17.566 21.2263 17.6732L12.3 22.8268C12.1144 22.934 11.8856 22.934 11.7 22.8268L2.77372 17.6732C2.58808 17.566 2.47372 17.3679 2.47372 17.1536V6.84641C2.47372 6.63205 2.58808 6.43397 2.77372 6.32679L11.7 1.1732Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Spiral */
export function SpiralIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 6.00398C3.5 7.80795 6.35714 9 11.5 9C18.5 9 19.5 6.00398 19.5 6.00398C19.5 6.00398 18.5 3 11.5 3C6.35714 3 3.5 4.2 3.5 6.00398Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 12.004C3.5 13.808 6.35714 15 11.5 15C18.5 15 19.5 12.004 19.5 12.004C19.5 12.004 18.5 9 11.5 9C6.35714 9 3.5 10.2 3.5 12.004Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 18.004C3.5 19.808 6.35714 21 11.5 21C18.5 21 19.5 18.004 19.5 18.004C19.5 18.004 18.5 15 11.5 15C6.35714 15 3.5 16.2 3.5 18.004Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Trim */
export function TrimIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.23611 7C7.71115 6.46924 8 5.76835 8 5C8 3.34315 6.65685 2 5 2C3.34315 2 2 3.34315 2 5C2 6.65685 3.34315 8 5 8C5.8885 8 6.68679 7.61375 7.23611 7ZM7.23611 7L20 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.23611 17C7.71115 17.5308 8 18.2316 8 19C8 20.6569 6.65685 22 5 22C3.34315 22 2 20.6569 2 19C2 17.3431 3.34315 16 5 16C5.8885 16 6.68679 16.3863 7.23611 17ZM7.23611 17L20 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// OPERATION ICONS
// ============================================================================

/** Extrude */
export function ExtrudeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 2L6 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 22L6 22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 14V19M12 19L15 16M12 19L9 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10V5M12 5L15 8M12 5L9 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Boolean */
export function BooleanIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 9H20.4C20.7314 9 21 9.26863 21 9.6V20.4C21 20.7314 20.7314 21 20.4 21H9.6C9.26863 21 9 20.7314 9 20.4V15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 9V3.6C15 3.26863 14.7314 3 14.4 3H3.6C3.26863 3 3 3.26863 3 3.6V14.4C3 14.7314 3.26863 15 3.6 15H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Boolean Intersection */
export function IntersectionIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 13.5V16.5M13.5 21H16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 9H9.6C9.26863 9 9 9.26863 9 9.6V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 21H9.6C9.26863 21 9 20.7314 9 20.4V19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 19.5V20.4C21 20.7314 20.7314 21 20.4 21H19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 9H20.4C20.7314 9 21 9.26863 21 9.6V10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 10.5V7.5M7.5 3H10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 15H14.4C14.7314 15 15 14.7314 15 14.4V7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 15H3.6C3.26863 15 3 14.7314 3 14.4V13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4.5V3.6C3 3.26863 3.26863 3 3.6 3H4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3H14.4C14.7314 3 15 3.26863 15 3.6V4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Boolean Difference */
export function DifferenceIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 3.6V14.4C15 14.7314 14.7314 15 14.4 15H3.6C3.26863 15 3 14.7314 3 14.4V3.6C3 3.26863 3.26863 3 3.6 3H14.4C14.7314 3 15 3.26863 15 3.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 21H16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13.5V16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 19.5V20.4C21 20.7314 20.7314 21 20.4 21H19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 21H9.6C9.26863 21 9 20.7314 9 20.4V19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 9H20.4C20.7314 9 21 9.26863 21 9.6V10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 9H9.6C9.26863 9 9 9.26863 9 9.6V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Fillet / Chamfer */
export function FilletIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 3.6V14.4C15 14.7314 14.7314 15 14.4 15H3.6C3.26863 15 3 14.7314 3 14.4V3.6C3 3.26863 3.26863 3 3.6 3H14.4C14.7314 3 15 3.26863 15 3.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 21H16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13.5V16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 19.5V20.4C21 20.7314 20.7314 21 20.4 21H19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 21H9.6C9.26863 21 9 20.7314 9 20.4V19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 9H20.4C20.7314 9 21 9.26863 21 9.6V10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 9H9.6C9.26863 9 9 9.26863 9 9.6V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Shell / Hollow */
export function ShellIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.0098 16L11.9998 16.0111"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.0098 12L11.9998 12.0111"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.0098 8.00001L11.9998 8.01112"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00977 12L7.99977 12.0111"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.0098 12L15.9998 12.0111"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Loft / Sweep */
export function LoftIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 3.6V14.4C15 14.7314 14.7314 15 14.4 15H3.6C3.26863 15 3 14.7314 3 14.4V3.6C3 3.26863 3.26863 3 3.6 3H14.4C14.7314 3 15 3.26863 15 3.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 21H16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13.5V16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 19.5V20.4C21 20.7314 20.7314 21 20.4 21H19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 21H9.6C9.26863 21 9 20.7314 9 20.4V19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 9H20.4C20.7314 9 21 9.26863 21 9.6V10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 9H9.6C9.26863 9 9 9.26863 9 9.6V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Revolution / Revolve */
export function RevolveIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 6L12 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16L12 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12H16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Offset */
export function OffsetIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.8476 13.317L9.50515 18.2798C8.70833 19.1905 7.29167 19.1905 6.49485 18.2798L2.15238 13.317C1.49259 12.563 1.49259 11.437 2.15238 10.683L6.49485 5.72018C7.29167 4.80952 8.70833 4.80952 9.50515 5.72017L13.8476 10.683C14.5074 11.437 14.5074 12.563 13.8476 13.317Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 19L17.8844 13.3016C18.5263 12.5526 18.5263 11.4474 17.8844 10.6984L13 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 19L21.8844 13.3016C22.5263 12.5526 22.5263 11.4474 21.8844 10.6984L17 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Cut */
export function CutIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20.01L4.01 19.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.01L4.01 15.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 8.01L4.01 7.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4.01L4.01 3.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 4.01L8.01 3.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 4.01L16.01 3.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4.01L20.01 3.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 8.01L20.01 7.99889"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 20.01L8.01 19.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 20.01L16.01 19.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 20.01L20.01 19.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.01L20.01 15.9989"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12H12M20 12H12M12 12V4M12 12V20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Delete */
export function DeleteIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 11V20.4C19 20.7314 18.7314 21 18.4 21H5.6C5.26863 21 5 20.7314 5 20.4V11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 17V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 17V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 7L16 7M3 7L8 7M8 7V3.6C8 3.26863 8.26863 3 8.6 3L15.4 3C15.7314 3 16 3.26863 16 3.6V7M8 7L16 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Duplicate */
export function DuplicateIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.4 20H9.6C9.26863 20 9 19.7314 9 19.4V9.6C9 9.26863 9.26863 9 9.6 9H19.4C19.7314 9 20 9.26863 20 9.6V19.4C20 19.7314 19.7314 20 19.4 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Radial Array */
export function RadialArrayIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 11.5C14.2091 11.5 16 9.70914 16 7.5C16 5.29086 14.2091 3.5 12 3.5C9.79086 3.5 8 5.29086 8 7.5C8 9.70914 9.79086 11.5 12 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 20.5C9.20914 20.5 11 18.7091 11 16.5C11 14.2909 9.20914 12.5 7 12.5C4.79086 12.5 3 14.2909 3 16.5C3 18.7091 4.79086 20.5 7 20.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 20.5C19.2091 20.5 21 18.7091 21 16.5C21 14.2909 19.2091 12.5 17 12.5C14.7909 12.5 13 14.2909 13 16.5C13 18.7091 14.7909 20.5 17 20.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Linear / Rectangular Array */
export function LinearArrayIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 20.4V14.6C14 14.2686 14.2686 14 14.6 14H20.4C20.7314 14 21 14.2686 21 14.6V20.4C21 20.7314 20.7314 21 20.4 21H14.6C14.2686 21 14 20.7314 14 20.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 20.4V14.6C3 14.2686 3.26863 14 3.6 14H9.4C9.73137 14 10 14.2686 10 14.6V20.4C10 20.7314 9.73137 21 9.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M14 9.4V3.6C14 3.26863 14.2686 3 14.6 3H20.4C20.7314 3 21 3.26863 21 3.6V9.4C21 9.73137 20.7314 10 20.4 10H14.6C14.2686 10 14 9.73137 14 9.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 9.4V3.6C3 3.26863 3.26863 3 3.6 3H9.4C9.73137 3 10 3.26863 10 3.6V9.4C10 9.73137 9.73137 10 9.4 10H3.6C3.26863 10 3 9.73137 3 9.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

// ============================================================================
// HYDRAULIC SPECIFIC ICONS (Custom CADHY icons)
// ============================================================================

/** Channel / Conduit */
export function ChannelIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 8L3 18C3 19.1046 3.89543 20 5 20L19 20C20.1046 20 21 19.1046 21 18L21 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 8L12 4L21 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10L6 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 10L18 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 16C6 16 9 14 12 14C15 14 18 16 18 16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Transition */
export function TransitionIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6L4 18L8 18L8 10L16 10L16 18L20 18L20 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 6L12 3L20 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10L12 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Stilling Basin / Energy Dissipator */
export function StillingBasinIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12L6 8L6 16L2 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 12L22 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8L10 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8L14 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 8L18 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 16L22 16L22 20L6 20L6 16Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Weir / Dam */
export function WeirIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 18L8 18L8 10L16 10L16 18L22 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10C8 10 10 6 12 6C14 6 16 10 16 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 21L22 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 6C4 6 6 8 8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
      />
    </svg>
  )
}

/** Gate / Sluice */
export function GateIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20L4 8L20 8L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 8L4 4L20 4L20 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 8L8 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8L16 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14L16 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4L12 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Pipe / Culvert */
export function PipeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="5"
        cy="12"
        rx="3"
        ry="5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx="19"
        cy="12"
        rx="3"
        ry="5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 7L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17L19 17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Manhole */
export function ManholeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C16 2 18 4 18 6L18 8L6 8L6 6C6 4 8 2 12 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8L6 18C6 20 8 22 12 22C16 22 18 20 18 18L18 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 14L18 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14L6 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14L21 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ============================================================================
// ADDITIONAL UTILITY ICONS
// ============================================================================

/** Grid / Snap to Grid */
export function GridIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3V21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Shadow toggle */
export function ShadowIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 2V22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22" fill="currentColor" />
    </svg>
  )
}

/** Snap point */
export function SnapPointIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 12L12 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12L20 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12L4 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}

/** Undo */
export function UndoIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 9H13C16.866 9 20 12.134 20 16C20 19.866 16.866 23 13 23H4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 4L4 9L9 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Redo */
export function RedoIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 9H11C7.13401 9 4 12.134 4 16C4 19.866 7.13401 23 11 23H20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 4L20 9L15 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Helix / Spiral 3D */
export function HelixIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C16 2 18 4 18 6C18 8 14 10 12 10C10 10 6 8 6 6C6 4 8 2 12 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 6C18 8 18 10 18 12C18 14 14 16 12 16C10 16 6 14 6 12C6 10 6 8 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12C18 14 18 16 18 18C18 20 14 22 12 22C10 22 6 20 6 18C6 16 6 14 6 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Wedge / Prism */
export function WedgeIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20L12 4L20 20H4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 20L4 8L12 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 8L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
    </svg>
  )
}

/** Plane / Face */
export function PlaneIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12L12 6L22 12L12 18L2 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
