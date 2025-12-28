# CADHY Development Tools

Miscellaneous tools, utilities, configurations and anything that helps with CADHY development.

Inspired by [Blender's tools directory](https://github.com/blender/blender/tree/main/tools).

## Directory Structure

```
tools/
├── check_docs/             # Documentation verification
│   └── check_docs.ts       # Validate JSDoc and README files
├── check_source/           # Code quality checks
│   ├── check_naming.ts     # Validate naming conventions
│   └── check_exports.ts    # Validate barrel exports
├── config/                 # IDE and tool configurations
│   └── (auto-generated)    # See utils/ide/
├── debug/                  # Debug utilities
│   ├── lldb_rust.py        # LLDB helpers for Rust
│   ├── debug_frontend.ts   # Browser DevTools scripts
│   ├── debug_backend.ts    # Rust/Tauri debugging
│   └── README.md           # Debug documentation
├── generators/             # Code scaffolding
│   ├── gen_operator.ts     # Generate new operator
│   └── gen_editor.ts       # Generate new editor space
├── git/                    # Git utilities
│   └── git_branch_report.ts # Branch status report
└── utils/                  # All utilities consolidated
    ├── stats.ts            # Project statistics
    ├── build/
    │   └── build_check.ts  # Pre-build validation
    ├── ide/
    │   └── setup_vscode.ts # VSCode/Cursor setup
    └── maintenance/
        └── clean_cache.ts  # Clean caches and artifacts
```

## Quick Start

### Pre-commit Checks

```bash
bun tools/check_source/check_naming.ts   # Check naming conventions
bun tools/check_source/check_exports.ts  # Check barrel exports
bun tools/check_docs/check_docs.ts       # Check documentation
bun tools/utils/build/build_check.ts     # Pre-build validation
```

### Development Utilities

```bash
bun tools/utils/stats.ts                 # Project statistics
bun tools/git/git_branch_report.ts       # Git branch report
bun tools/utils/maintenance/clean_cache.ts        # Clean caches
bun tools/utils/maintenance/clean_cache.ts --all  # Include node_modules/target
```

### Code Generation

```bash
bun tools/generators/gen_operator.ts mesh subdivide  # Generate operator
bun tools/generators/gen_editor.ts node              # Generate editor
```

### IDE Setup

```bash
bun tools/utils/ide/setup_vscode.ts      # Configure VSCode/Cursor
```

### Debugging

```bash
bun tools/debug/debug_backend.ts trace   # Trace Tauri commands
bun tools/debug/debug_backend.ts logs    # Analyze log statements
bun tools/debug/debug_backend.ts profile # Profiling guide

bun tools/debug/debug_frontend.ts memory # Browser memory analysis
bun tools/debug/debug_frontend.ts scene  # Three.js scene inspector
bun tools/debug/debug_frontend.ts perf   # Performance profiling
```

**LLDB Rust Helpers:**
```bash
# Add to ~/.lldbinit
command script import /path/to/cadhy/tools/debug/lldb_rust.py

# Commands: rust_bt, show_vec, show_str, cadhy_shapes
```

## Naming Convention Reference

### File Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `ED_` | Editor functions | `ED_view3d_main.tsx` |
| `OP_` | Operators | `OP_create_channel.tsx` |
| `WM_` | Window manager | `WM_layout.tsx` |
| `UI_` | UI components | `UI_dialog.tsx` |
| `RE_` | Rendering | `RE_scene_content.tsx` |
| `ST_` | Store/State | `ST_scene.ts` |
| `SV_` | Services | `SV_cad.ts` |
| `KE_` | Kernel | `KE_topology.ts` |
| `IC_` | Icons | `IC_tools.ts` |
| `UT_` | Utilities | `UT_math.ts` |

### Operator Naming Pattern

```
<MODULE>_OT_<action>

Examples:
- MESH_OT_subdivide
- OBJECT_OT_duplicate
- CAD_OT_fillet
- VIEW_OT_rotate
```

## Adding New Tools

When adding new tools:

1. Place in the appropriate subdirectory
2. Use TypeScript with Bun shebang: `#!/usr/bin/env bun`
3. Include usage documentation in the file header
4. Follow the established patterns:
   - Clear console output with colors
   - Exit code 1 on failure
   - Summary statistics
5. Add to this README

### Tool Template

```typescript
#!/usr/bin/env bun
/**
 * Tool Name
 *
 * Description of what the tool does.
 *
 * Usage: bun run tools/category/tool_name.ts [options]
 */

async function main() {
  console.log("Tool Name")
  console.log("═".repeat(60))

  // Implementation

  console.log("\x1b[32m✓ Done\x1b[0m")
}

main().catch(console.error)
```

## CI Integration

These tools are designed to run in CI. Key exit codes:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | Check failed (lint, naming, exports, etc.) |

### GitHub Actions Example

```yaml
- name: Check naming conventions
  run: bun tools/check_source/check_naming.ts

- name: Check exports
  run: bun tools/check_source/check_exports.ts

- name: Pre-build check
  run: bun tools/utils/build/build_check.ts
```

## References

- [Blender Tools](https://github.com/blender/blender/tree/main/tools)
- [Blender Source Structure](https://github.com/blender/blender/tree/main/source/blender)
- [CADHY Architecture](.agents/context/ARCHITECTURE.md)
