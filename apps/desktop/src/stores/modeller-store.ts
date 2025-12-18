/**
 * Modeller Store - CADHY
 *
 * @deprecated This file is deprecated. Import from '@/stores/modeller' instead.
 *
 * This file re-exports everything from the new modular store structure
 * for backward compatibility. All new code should import from '@/stores/modeller'.
 */

// Re-export everything from the new modular store
export * from "./modeller"
export { useModellerStore as default } from "./modeller"
