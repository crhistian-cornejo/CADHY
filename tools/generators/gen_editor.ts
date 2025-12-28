#!/usr/bin/env bun
/**
 * Generate Editor Space
 *
 * Scaffolds a new editor space following CADHY's Blender-inspired pattern.
 *
 * Usage: bun run tools/generators/gen_editor.ts <name>
 * Example: bun run tools/generators/gen_editor.ts node
 *
 * This will create: editors/space_node/
 *   - ED_node_main.tsx
 *   - index.ts
 */

import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import path from "node:path"

interface EditorConfig {
  name: string // node, file, spreadsheet, etc.
}

function generateMainComponent(config: EditorConfig): string {
  const { name } = config
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1)
  const componentName = `${nameCapitalized}View`

  return `/**
 * ${nameCapitalized} Editor - CADHY
 *
 * @module editors/space_${name}
 * @editor ED_${name}
 */

import { cn } from "@cadhy/ui"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface ${componentName}Props {
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ${componentName}({ className }: ${componentName}Props) {
  const { t } = useTranslation()

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Header */}
      <div className="flex h-10 items-center border-b px-4">
        <h2 className="text-sm font-medium">
          {t("editors.${name}.title", "${nameCapitalized}")}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          {t("editors.${name}.empty", "${nameCapitalized} editor coming soon")}
        </div>
      </div>
    </div>
  )
}

export default ${componentName}
`
}

function generateIndex(config: EditorConfig): string {
  const { name } = config
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1)

  return `/**
 * @fileoverview ${nameCapitalized} Editor
 * @module editors/space_${name}
 */

export { default as ${nameCapitalized}View } from "./ED_${name}_main"
`
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log(`
Usage: bun run tools/generators/gen_editor.ts <name>

Examples:
  bun run tools/generators/gen_editor.ts node
  bun run tools/generators/gen_editor.ts file
  bun run tools/generators/gen_editor.ts spreadsheet
  bun run tools/generators/gen_editor.ts info

This will create an editor space:
  editors/space_<name>/
    - ED_<name>_main.tsx
    - index.ts
`)
    process.exit(1)
  }

  const [name] = args
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1)

  // Create directory
  const dirPath = path.join("apps/desktop/src/editors", `space_${name}`)
  if (existsSync(dirPath)) {
    console.error(`Error: Directory already exists: ${dirPath}`)
    process.exit(1)
  }

  mkdirSync(dirPath, { recursive: true })
  console.log(`Created directory: ${dirPath}`)

  // Generate main component
  const mainPath = path.join(dirPath, `ED_${name}_main.tsx`)
  await writeFile(mainPath, generateMainComponent({ name }))
  console.log(`Created: ${mainPath}`)

  // Generate index
  const indexPath = path.join(dirPath, "index.ts")
  await writeFile(indexPath, generateIndex({ name }))
  console.log(`Created: ${indexPath}`)

  console.log(`
Generated editor: space_${name}

Directory: ${dirPath}

Next steps:
1. Implement the main component UI
2. Add any panels in ${dirPath}/panels/
3. Add any toolbars in ${dirPath}/toolbars/
4. Export from editors/index.ts:
   export * from "./space_${name}"
5. Add to WM_layout.tsx navigation
6. Add translations in i18n/locales/
`)
}

main().catch(console.error)
