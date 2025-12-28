/**
 * @fileoverview Icons library barrel export
 *
 * This file provides organized icon exports by category.
 * Import from specific categories for better tree-shaking.
 *
 * @example
 * ```tsx
 * // Import from categories (preferred)
 * import { ActionIcons, ToolIcons } from "@/lib/icons";
 *
 * // Import specific icons
 * import { Add01Icon, Move01Icon } from "@/lib/icons";
 *
 * // Use the Icon wrapper component
 * import { Icon, ActionIcons } from "@/lib/icons";
 * <Icon icon={ActionIcons.add} size={18} />
 * ```
 */

// Re-export HugeiconsIcon type
export type { HugeiconsIcon } from "@hugeicons/react"
// Re-export from hugeicons for backwards compatibility
// This ensures existing imports continue to work
export * from "./hugeicons"
// Category exports
export * from "./IC_actions"
export * from "./IC_files"
export * from "./IC_media"
export * from "./IC_objects"
export * from "./IC_status"
export * from "./IC_system"
export * from "./IC_tools"
export * from "./IC_ui"
export * from "./IC_users"
export * from "./IC_window"
