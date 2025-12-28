/**
 * @fileoverview Core infrastructure barrel export
 * @module core
 *
 * Groups all core infrastructure:
 * - depsgraph: Dependency graph (DEG_*)
 * - kernel: Data operations (KE_*)
 * - modifiers: Non-destructive editing (MOD_*)
 * - stores: State management (ST_*)
 * - services: Backend services (SV_*)
 * - types: Type definitions
 */

export * from "./depsgraph"
export * from "./kernel"
export * from "./modifiers"
export * from "./services"
export * from "./stores"
export * from "./types"
