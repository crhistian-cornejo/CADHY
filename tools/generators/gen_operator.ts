#!/usr/bin/env bun
/**
 * Generate Operator
 *
 * Scaffolds a new operator following CADHY's Blender-inspired pattern.
 *
 * Usage: bun run tools/generators/gen_operator.ts <module> <name>
 * Example: bun run tools/generators/gen_operator.ts mesh subdivide
 *
 * This will create: operators/mesh/MESH_OT_subdivide.ts
 */

import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import path from "node:path"

interface OperatorConfig {
  module: string // mesh, object, view, cad, curve, etc.
  name: string // subdivide, extrude, boolean_union, etc.
}

function generateOperator(config: OperatorConfig): string {
  const { module, name } = config
  const moduleUpper = module.toUpperCase()
  const operatorId = `${moduleUpper}_OT_${name}`
  const operatorName = name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return `/**
 * ${operatorName} Operator
 *
 * @module operators/${module}
 * @operator ${operatorId}
 */

import { invoke } from "@tauri-apps/api/core"
import type { Operator, OperatorContext, OperatorResult } from "@/types/operators"

// ============================================================================
// TYPES
// ============================================================================

export interface ${operatorId}_Props {
  // TODO: Define operator properties
  // example: count: number
}

// ============================================================================
// POLL FUNCTION
// ============================================================================

/**
 * Determines when this operator is available
 */
function poll(context: OperatorContext): boolean {
  // TODO: Implement poll logic
  // Example: return context.selectedObjects.length > 0
  return true
}

// ============================================================================
// EXECUTE FUNCTION
// ============================================================================

/**
 * Executes the operator
 */
async function exec(
  context: OperatorContext,
  props: ${operatorId}_Props
): Promise<OperatorResult> {
  try {
    // TODO: Implement operator logic
    const result = await invoke("${module}_${name}", {
      object_id: context.activeObject?.id,
      ...props,
    })

    return {
      success: true,
      result,
      message: "${operatorName} completed successfully",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ============================================================================
// OPERATOR DEFINITION
// ============================================================================

export const ${operatorId}: Operator<${operatorId}_Props> = {
  // Identification
  id: "${operatorId}",
  name: "${operatorName}",
  description: "TODO: Add description",

  // Icon (from IC_* modules)
  // icon: ToolIcons.${name},

  // Functions
  poll,
  exec,

  // Properties for UI generation
  properties: {
    // TODO: Define properties
    // example: { type: "int", default: 1, min: 1, max: 10, name: "Count" }
  },

  // Undo support
  undo: true,

  // Optional keymap binding
  // keymap: { key: "W", ctrl: true },
}

export default ${operatorId}
`
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
Usage: bun run tools/generators/gen_operator.ts <module> <name>

Examples:
  bun run tools/generators/gen_operator.ts mesh subdivide
  bun run tools/generators/gen_operator.ts object duplicate
  bun run tools/generators/gen_operator.ts cad fillet
  bun run tools/generators/gen_operator.ts view rotate

This will create an operator file following the pattern:
  operators/<module>/<MODULE>_OT_<name>.ts
`)
    process.exit(1)
  }

  const [module, name] = args
  const moduleUpper = module.toUpperCase()
  const operatorId = `${moduleUpper}_OT_${name}`

  // Create directory if needed
  const dirPath = path.join("apps/desktop/src/operators", module)
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
    console.log(`Created directory: ${dirPath}`)
  }

  // Generate file
  const filePath = path.join(dirPath, `${operatorId}.ts`)
  if (existsSync(filePath)) {
    console.error(`Error: File already exists: ${filePath}`)
    process.exit(1)
  }

  const content = generateOperator({ module, name })
  await writeFile(filePath, content)

  console.log(`
Generated operator: ${operatorId}

File: ${filePath}

Next steps:
1. Define the properties interface
2. Implement the poll() function
3. Implement the exec() function
4. Add the Rust command if needed
5. Export from operators/${module}/index.ts
`)
}

main().catch(console.error)
