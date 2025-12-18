# GitHub Copilot Instructions - CADHY

## 📖 Required Reading (Session Start)

Before generating ANY code, read these files in order:

1. **`.agents/QUICKSTART.md`** - 5-minute overview (START HERE)
2. **`.agents/rules/CORE-RULES.md`** - Core principles
3. **`.agents/context/ARCHITECTURE.md`** - Understand what we're building
4. **`.agents/standards/CONVENTIONS.md`** - Coding conventions
5. **`.agents/standards/SHADCN-V2.md`** - shadcn/ui v2 + Tailwind CSS v4 guidelines

## 🎯 Project Summary

**CADHY** = Computational Analysis & Design for Hydraulics

- **Backend**: Rust + OpenCASCADE (geometry kernel)
- **Frontend**: React 19 + TypeScript 5.9 + Tailwind v4
- **Desktop**: Tauri v2
- **3D Viewer**: Three.js + React Three Fiber
- **State**: Zustand
- **Package Manager**: Bun 1.3.1 (TS) + Cargo (Rust)
- **Linter/Formatter**: Biome

## 📦 Monorepo Structure

```
CADHY/
├── apps/
│   └── desktop/              # Main Tauri app (@cadhy/desktop)
│       ├── src/              # React frontend
│       └── src-tauri/        # Rust backend
│
├── packages/                 # TypeScript workspace
│   ├── ui/                   # @cadhy/ui - Component library
│   ├── viewer/               # @cadhy/viewer - Three.js viewer
│   ├── types/                # @cadhy/types - Shared types
│   ├── ai/                   # @cadhy/ai - AI integration
│   └── config/               # @cadhy/config - Shared configs
│
├── crates/                   # Rust workspace
│   ├── cadhy-core/           # Core types and math
│   ├── cadhy-cad/            # OpenCASCADE CAD engine
│   ├── cadhy-hydraulics/     # Hydraulic solvers
│   ├── cadhy-mesh/           # Mesh generation
│   ├── cadhy-export/         # File export (STEP, STL)
│   └── cadhy-project/        # Project file format
│
└── scripts/                  # Build tools and scripts
```

## 🎨 Code Style Quick Reference

### TypeScript

```typescript
// ✅ Import order
import React from 'react';                    // 1. React
import { motion } from 'motion/react';        // 2. External
import { Button } from '@cadhy/ui';           // 3. Workspace (@cadhy/*)
import { useModellerStore } from '@/stores';  // 4. Local (@/)
import type { MeshData } from '@cadhy/types'; // 5. Types

// ✅ Component structure
interface Props { /* ... */ }
export function Component({ ... }: Props) {
  const [state, setState] = useState();       // Hooks first
  const derived = useMemo(() => ..., []);     // Derived state
  const handleClick = useCallback(() => ...); // Handlers
  useEffect(() => { ... }, []);               // Effects last
  return <div data-slot="component">...</div>; // JSX with data-slot
}

// ✅ NO any, use unknown + type guards
function process(data: unknown) { /* ... */ }

// ✅ Icons - Hugeicons ONLY
import { HugeiconsIcon } from '@hugeicons/react';
import { Cube01Icon } from '@hugeicons/core-free-icons';
<HugeiconsIcon icon={Cube01Icon} className="size-4" />
```

### Rust

```rust
// ✅ Import order
use std::collections::HashMap;        // 1. std
use serde::{Serialize, Deserialize};  // 2. External
use cadhy_core::Vec3;                 // 3. Workspace
use crate::engine::Engine;            // 4. Local

// ✅ Error handling (NO unwrap!)
pub fn get_node(&self, id: EntityId) -> Result<&Node> {
    self.nodes.get(&id)
        .ok_or_else(|| anyhow!("Node not found: {}", id))
}

// ✅ Use ? operator
pub fn execute(&mut self) -> Result<Mesh> {
    let sorted = self.topological_sort()?;
    let result = self.process(sorted)?;
    Ok(result)
}
```

## 🚫 Never Do

- ❌ Use `any` type in TypeScript
- ❌ Use `unwrap()` in Rust production code
- ❌ Import icons from lucide-react, react-icons, etc. (Hugeicons ONLY)
- ❌ Use CSS Modules or inline styles (Tailwind only)
- ❌ Use hex/rgb colors directly (use CSS variables)
- ❌ Create components without `data-slot` attribute
- ❌ Mix unrelated changes in one commit

## ✅ Always Do

- ✅ Read `.agents/` documentation before generating code
- ✅ Follow existing patterns in the codebase
- ✅ Use proper error handling (Result, try/catch)
- ✅ Type everything (TypeScript strict mode)
- ✅ Format code (biome format)
- ✅ Order imports correctly
- ✅ Use `cn()` for class merging
- ✅ Use `data-slot` on all components
- ✅ Use Motion (motion/react) for animations

## 📝 Git Conventions

### Commit Format

```
<type>(<scope>): <subject>
```

- **Subject**: Max 50 chars, imperative mood ("add" not "added")
- **Body** (optional): Explain WHAT and WHY, max 72 chars/line

### Types

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting only |
| `refactor` | Code restructure |
| `perf` | Performance |
| `test` | Tests |
| `build` | Build/deps |
| `ci` | CI/CD |
| `chore` | Other |

### Scopes

**Frontend**: `ui`, `viewer`, `types`, `ai`, `modeller`, `stores`, `hooks`, `i18n`
**Backend**: `core`, `cad`, `hydraulics`, `mesh`, `export`, `project`, `tauri`
**General**: `deps`, `config`, `workspace`

### Examples

```bash
# ✅ Good
feat(modeller): add zoom-to-object functionality
fix(hydraulics): correct manning calculation
refactor(stores): extract selection logic

# ❌ Bad
feat: added stuff
fix: fixed bug
WIP
```

### Branch Naming

```bash
feat/modeller-zoom-to-object
fix/viewer-camera-reset
refactor/stores-split-slices
```

## 🔧 Common Commands

```bash
# Install dependencies
bun install

# Dev mode (desktop app)
bun dev

# Build
bun build

# Lint & Format
bun lint
bun format

# Rust (in crates/ dir)
cargo build --workspace
cargo test
cargo fmt && cargo clippy
```

## 📚 Key Documentation

### Quick Start
- `.agents/QUICKSTART.md` - 5-minute overview
- `.agents/README.md` - Full navigation

### Rules
- `.agents/rules/CORE-RULES.md` - Prime directive & design system

### Context
- `.agents/context/ARCHITECTURE.md` - Project structure & data flow
- `.agents/context/VERSION.md` - Current version info
- `.agents/context/RELEASES.md` - Roadmap & release history
- `.agents/context/RELEASE-PROCESS.md` - How to release

### Standards
- `.agents/standards/CONVENTIONS.md` - Detailed coding conventions
- `.agents/standards/BEST-PRACTICES.md` - Pre-commit checklist
- `.agents/standards/SHADCN-V2.md` - shadcn/ui v2 + Tailwind v4

### Memories
- `.agents/memories/MEMORIES.md` - Known bugs & solutions

## 💡 When Uncertain

**Ask the developer** instead of guessing. It's better to clarify requirements than to implement the wrong solution.

---

**Project**: CADHY - Computational Analysis & Design for Hydraulics
**Last Updated**: December 2024
