# AI Assistant Quick Start - CADHY

> **5-Minute Guide** for AI coding assistants to get up to speed.

## Step 1: Read This First (30 seconds)

**What is CADHY?**

- Desktop CAD + Hydraulics engineering application
- Parametric 3D modeling with OpenCASCADE
- Hydraulic channel design and analysis
- AI-powered design assistance

**Tech Stack**:

- Rust 2024 + OpenCASCADE (geometry kernel)
- React 19 + TypeScript 5.9 + Tailwind v4
- Tauri v2 (desktop)
- Three.js (3D viewer)
- Bun (package manager)

## Step 2: Required Reading (2 minutes)

**Read in this order:**

1. **`rules/CORE-RULES.md`** (1 min) <- START HERE
   - Core principles
   - What never to do
   - What always to do

2. **`context/ARCHITECTURE.md`** (1 min)
   - Monorepo structure
   - Data flow
   - Crate dependencies

3. **`context/VERSION.md`** (30 sec)
   - Current version and stage
   - Version scheme

## Step 3: Task-Specific Guides (as needed)

**Choose based on your task:**

| Task                   | Read This                      | Time  |
| ---------------------- | ------------------------------ | ----- |
| Rust code              | `standards/CONVENTIONS.md`     | 2 min |
| TypeScript/React       | `standards/CONVENTIONS.md`     | 2 min |
| UI components          | `standards/SHADCN-V2.md`       | 2 min |
| Git commit             | `standards/CONVENTIONS.md`     | 1 min |
| General patterns       | `standards/BEST-PRACTICES.md`  | 3 min |

## Quick Reference

### Monorepo Structure

```
CADHY/
├── apps/desktop/       # Tauri app (@cadhy/desktop)
├── packages/           # TypeScript (Bun)
│   ├── ui/            # @cadhy/ui
│   ├── viewer/        # @cadhy/viewer
│   ├── types/         # @cadhy/types
│   └── ai/            # @cadhy/ai
└── crates/            # Rust (Cargo)
    ├── cadhy-core/
    ├── cadhy-cad/
    ├── cadhy-hydraulics/
    ├── cadhy-mesh/
    ├── cadhy-export/
    └── cadhy-project/
```

### Import Patterns

**TypeScript**:

```typescript
// Workspace packages
import { Button } from '@cadhy/ui';
import { MeshData } from '@cadhy/types';

// Local (within app/package)
import { useCadStore } from '@/stores/cad-store';
import { cn } from '@/lib/utils';
```

**Rust**:

```rust
// Workspace crates
use cadhy_core::geometry::Vec3;
use cadhy_cad::primitives::create_box;

// Local
use crate::commands::cad;
```

### Code Style Cheat Sheet

| Language   | DO                           | DON'T                      |
| ---------- | ---------------------------- | -------------------------- |
| TypeScript | `unknown` + type guards      | `any` type                 |
| TypeScript | `@cadhy/*` imports           | Relative `../../packages/` |
| TypeScript | Icons from `@cadhy/ui`       | Direct lucide/hugeicons    |
| TypeScript | Tailwind classes             | Inline styles              |
| Rust       | `Result<T, E>` + `?`         | `unwrap()`                 |
| Rust       | Doc comments `///`           | Undocumented public APIs   |
| Rust       | `thiserror` for lib errors   | Bare `panic!()`            |
| Both       | Descriptive names            | Abbreviations              |

### Git Commits

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(cad): add boolean union operation
fix(hydraulics): correct manning coefficient
docs(readme): update installation steps
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`  
**Scopes**: `ui`, `viewer`, `types`, `ai`, `core`, `cad`, `hydraulics`, `mesh`, `export`, `desktop`

## Top 10 Things to Never Do

1. Use `any` type in TypeScript
2. Use `unwrap()` in Rust production code
3. Import icons directly (use `@cadhy/ui` registry)
4. Use CSS Modules or inline styles
5. Break monorepo dependency rules
6. Mix unrelated changes in one commit
7. Commit without formatting (rustfmt, biome)
8. Write vague commit messages
9. Skip reading documentation
10. Guess when uncertain (ask instead!)

## Pre-Commit Checklist

```bash
# Run before EVERY commit
bun lint:fix && bun lint && bun typecheck

# If Rust changes
cd crates && cargo fmt && cargo clippy && cargo test
```

- [ ] Code follows existing patterns
- [ ] Imports ordered correctly
- [ ] No `any` types (TS) or `unwrap()` (Rust)
- [ ] Formatted with biome/rustfmt
- [ ] Tests pass (if applicable)
- [ ] Commit message follows convention

## Common Commands

```bash
# Install all dependencies
bun install

# Dev mode (desktop app)
bun dev

# Build everything
bun build

# Lint and format
bun lint:fix && bun lint
bun typecheck

# Rust (in crates/ dir)
cargo build --workspace
cargo test --workspace
cargo fmt && cargo clippy
```

## Need Help?

1. Check `rules/CORE-RULES.md` for general guidance
2. Check task-specific guidelines
3. Search `standards/` for detailed examples
4. **Ask the developer** if still unclear

---

**Remember**: Quality over speed. Write code you'd be proud to show other developers.

**Last Updated**: December 2025  
**Version**: 0.1.0
