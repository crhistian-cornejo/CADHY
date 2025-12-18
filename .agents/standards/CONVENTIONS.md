# CADHY - Code Conventions

> **Convenciones de código que TODO agente debe seguir**

---

## 1. TypeScript

### 1.1 Imports Order

```typescript
// 1. React/Framework
import * as React from "react"
import { useState, useEffect } from "react"

// 2. External packages
import { motion } from "motion/react"
import { invoke } from "@tauri-apps/api/core"

// 3. Internal packages (@cadhy/*)
import { Button, Card } from "@cadhy/ui"
import type { MeshData } from "@cadhy/types"

// 4. Local imports (relative)
import { useCadStore } from "@/stores/cad-store"
import { cn } from "@/lib/utils"

// 5. Types (last)
import type { ComponentProps } from "./types"
```

### 1.2 Component Structure

```typescript
// 1. Imports
import * as React from "react"

// 2. Types/Interfaces
interface MyComponentProps {
  title: string
  onAction?: () => void
  className?: string
  children?: React.ReactNode
}

// 3. Constants (if any)
const DEFAULT_TITLE = "Untitled"

// 4. Component
export function MyComponent({
  title,
  onAction,
  className,
  children,
}: MyComponentProps) {
  // 4a. Hooks (state, refs, context)
  const [isOpen, setIsOpen] = useState(false)
  const store = useCadStore()

  // 4b. Derived state / Memos
  const displayTitle = title || DEFAULT_TITLE

  // 4c. Callbacks
  const handleClick = React.useCallback(() => {
    setIsOpen(true)
    onAction?.()
  }, [onAction])

  // 4d. Effects (minimize these)
  // ...

  // 4e. Render
  return (
    <div data-slot="my-component" className={cn("base-styles", className)}>
      {children}
    </div>
  )
}

// 5. Sub-components (if colocated)
function MyComponentHeader() { ... }
```

### 1.3 Type Definitions

```typescript
// Prefer interfaces for objects
interface User {
  id: string
  name: string
  email: string
}

// Use type for unions, intersections, primitives
type Status = "idle" | "loading" | "error" | "success"
type Callback = () => void
type WithClassName<T> = T & { className?: string }

// Export types separately when needed
export type { User, Status }
```

### 1.4 Naming

```typescript
// Components: PascalCase
function AppSidebar() {}
function ViewerPanel() {}

// Hooks: camelCase starting with "use"
function useTheme() {}
function useViewer() {}

// Event handlers: handle + Event
const handleClick = () => {}
const handleSubmit = () => {}
const handleKeyDown = () => {}

// Boolean variables: is/has/can/should prefix
const isLoading = true
const hasError = false
const canSubmit = true

// Constants: SCREAMING_SNAKE_CASE
const MAX_OBJECTS = 1000
const DEFAULT_ZOOM = 1.5
```

---

## 2. React Patterns

### 2.1 Props Spreading

```typescript
// DO: Spread rest props to root element
function Button({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cn("btn", className)} {...props}>
      {children}
    </button>
  )
}

// DON'T: Spread unknown props to nested elements
function Card({ className, ...props }: CardProps) {
  return (
    <div className={className}>
      <div {...props} /> {/* BAD - props leak to wrong element */}
    </div>
  )
}
```

### 2.2 Compound Components

```typescript
// Use compound pattern for complex components
function Card({ children, className }: CardProps) {
  return <div data-slot="card" className={cn("card", className)}>{children}</div>
}

function CardHeader({ children, className }: CardHeaderProps) {
  return <div data-slot="card-header" className={cn("card-header", className)}>{children}</div>
}

function CardContent({ children, className }: CardContentProps) {
  return <div data-slot="card-content" className={cn("card-content", className)}>{children}</div>
}

// Attach sub-components
Card.Header = CardHeader
Card.Content = CardContent

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Content>Content</Card.Content>
</Card>
```

### 2.3 Render Props / Children Functions

```typescript
// Use for flexible rendering
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}
```

---

## 3. Zustand Stores

### 3.1 Store Definition

```typescript
import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface CadState {
  // State
  objects: CadObject[]
  selectedIds: string[]

  // Actions
  addObject: (obj: CadObject) => void
  removeObject: (id: string) => void
  setSelection: (ids: string[]) => void
  clearSelection: () => void
}

export const useCadStore = create<CadState>()(
  devtools(
    (set, get) => ({
      // Initial state
      objects: [],
      selectedIds: [],

      // Actions
      addObject: (obj) =>
        set(
          (state) => ({ objects: [...state.objects, obj] }),
          false,
          "addObject"
        ),

      removeObject: (id) =>
        set(
          (state) => ({
            objects: state.objects.filter((o) => o.id !== id),
            selectedIds: state.selectedIds.filter((sid) => sid !== id),
          }),
          false,
          "removeObject"
        ),

      setSelection: (ids) =>
        set({ selectedIds: ids }, false, "setSelection"),

      clearSelection: () =>
        set({ selectedIds: [] }, false, "clearSelection"),
    }),
    { name: "cad-store" }
  )
)
```

### 3.2 Selectors

```typescript
// Define selectors outside store for reuse
export const selectObjects = (state: CadState) => state.objects
export const selectSelectedObjects = (state: CadState) =>
  state.objects.filter((o) => state.selectedIds.includes(o.id))

// Use with shallow compare for arrays/objects
import { useShallow } from "zustand/react/shallow"

function MyComponent() {
  const objects = useCadStore(useShallow(selectObjects))
  const selected = useCadStore(useShallow(selectSelectedObjects))
}
```

---

## 4. Tailwind CSS

### 4.1 Class Order

```tsx
// Order: Layout → Spacing → Sizing → Typography → Colors → Effects → States
<div
  className={cn(
    // Layout
    "flex flex-col items-center justify-center",
    // Spacing
    "gap-4 p-4 m-2",
    // Sizing
    "w-full h-64 min-h-screen",
    // Typography
    "text-sm font-medium",
    // Colors
    "bg-background text-foreground",
    // Borders
    "border border-border rounded-lg",
    // Effects
    "shadow-sm",
    // Transitions
    "transition-colors duration-200",
    // States
    "hover:bg-muted focus:ring-2",
    // Custom className prop last
    className
  )}
/>
```

### 4.2 Responsive

```tsx
// Mobile-first approach
<div className="flex flex-col md:flex-row lg:gap-8" />

// Use container queries when appropriate
<div className="@container">
  <div className="@md:flex-row" />
</div>
```

### 4.3 Dark Mode

```tsx
// Use semantic color tokens (they auto-switch)
<div className="bg-background text-foreground" />  // DO
<div className="bg-white text-black dark:bg-black dark:text-white" />  // DON'T
```

---

## 5. Motion Animations

### 5.1 Basic Usage

```typescript
import { motion } from "motion/react"

// Animate presence
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.div>
```

### 5.2 Animation Presets

```typescript
// Define reusable presets
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Usage
<motion.div {...slideUp} transition={{ duration: 0.2 }}>
```

### 5.3 Layout Animations

```typescript
// Use layoutId for shared element transitions
<motion.div layoutId={`card-${id}`}>
  <Card />
</motion.div>

// Use layout prop for size changes
<motion.div layout>
  {isExpanded && <ExpandedContent />}
</motion.div>
```

---

## 6. Rust

### 6.1 Error Handling

```rust
// Use thiserror for library errors
#[derive(thiserror::Error, Debug)]
pub enum CadError {
    #[error("Invalid parameter: {0}")]
    InvalidParam(String),

    #[error("Shape not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// Use anyhow for application code
use anyhow::{Context, Result};

fn process() -> Result<()> {
    let file = std::fs::read("config.json")
        .context("Failed to read config file")?;
    Ok(())
}
```

### 6.2 Tauri Commands

```rust
// Always use async for potentially long operations
#[tauri::command]
async fn create_shape(
    params: ShapeParams,
    state: tauri::State<'_, AppState>,
) -> Result<MeshData, String> {
    state.engine
        .create_shape(params)
        .await
        .map_err(|e| e.to_string())
}

// Group related commands in modules
mod commands {
    pub mod cad;
    pub mod hydraulics;
    pub mod project;
}
```

### 6.3 Naming

```rust
// Types: PascalCase
struct MeshData { }
enum ShapeType { }

// Functions/methods: snake_case
fn calculate_area() { }
impl Shape {
    fn get_volume(&self) { }
}

// Constants: SCREAMING_SNAKE_CASE
const MAX_VERTICES: usize = 100_000;

// Modules: snake_case
mod shape_operations;
```

---

## 7. Git Conventions

### 7.1 Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Rules:**
- **Subject line**: Max 50 characters, imperative mood ("add" not "added")
- **Body**: Max 72 chars/line, explain WHAT and WHY (not HOW)
- **Footer**: References to issues, breaking changes

### 7.2 Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature for the user | `feat(modeller): add channel creation tool` |
| `fix` | Bug fix for the user | `fix(viewer): correct camera reset behavior` |
| `docs` | Documentation only | `docs(readme): update installation steps` |
| `style` | Formatting, no code change | `style(ui): fix button padding` |
| `refactor` | Code change, no feature/fix | `refactor(stores): split into slices` |
| `perf` | Performance improvement | `perf(mesh): optimize vertex buffer` |
| `test` | Adding/fixing tests | `test(hydraulics): add manning tests` |
| `build` | Build system, dependencies | `build(deps): update tauri to v2.1` |
| `ci` | CI/CD configuration | `ci(github): add rust caching` |
| `chore` | Other changes (no src/test) | `chore: update .gitignore` |
| `revert` | Revert a previous commit | `revert: feat(cad): add cylinder` |

### 7.3 Scopes

**Frontend (TypeScript):**
- `ui` - UI components (@cadhy/ui)
- `viewer` - 3D viewer (@cadhy/viewer)
- `types` - Type definitions (@cadhy/types)
- `ai` - AI integration (@cadhy/ai)
- `modeller` - Modeller view/components
- `sidebar` - Sidebar components
- `panels` - Panel components
- `stores` - Zustand stores
- `hooks` - Custom hooks
- `i18n` - Internationalization

**Backend (Rust):**
- `core` - cadhy-core crate
- `cad` - cadhy-cad crate
- `hydraulics` - cadhy-hydraulics crate
- `mesh` - cadhy-mesh crate
- `export` - cadhy-export crate
- `project` - cadhy-project crate
- `tauri` - Tauri commands/app

**General:**
- `deps` - Dependencies
- `config` - Configuration files
- `workspace` - Monorepo workspace

### 7.4 Good vs Bad Examples

```bash
# ✅ GOOD - Clear, specific, imperative
feat(modeller): add zoom-to-object functionality
fix(hydraulics): correct manning coefficient calculation
refactor(stores): extract selection logic to separate slice
docs(api): document channel creation endpoint
perf(viewer): reduce draw calls by batching meshes

# ❌ BAD - Vague, past tense, too long
feat: added stuff
fix: fixed bug
update code
WIP
misc changes
feat(modeller): implemented the new zoom to object feature that allows users to focus camera on selected objects in the scene panel
```

### 7.5 Commit Body Examples

```bash
# Simple commit (no body needed)
fix(viewer): correct grid alignment on zoom

# Complex commit (with body)
feat(hydraulics): add trapezoidal channel support

Add support for trapezoidal cross-sections in channel analysis.
This includes:
- New TrapezoidalSection struct
- Updated area/perimeter calculations
- Modified mesh generation for sloped walls

Closes #42

# Breaking change
feat(api)!: rename mesh generation endpoint

BREAKING CHANGE: `generate_mesh` renamed to `create_mesh`.
Update all frontend calls accordingly.
```

### 7.6 Branch Naming

```bash
# Format: <type>/<scope>-<description>

# Features
feat/modeller-zoom-to-object
feat/hydraulics-circular-channels

# Fixes
fix/viewer-camera-reset
fix/mesh-memory-leak

# Other
refactor/stores-split-slices
docs/readme-installation
chore/deps-update-tauri
```

### 7.7 Git Workflow

```bash
# 1. Create branch from main
git checkout main
git pull origin main
git checkout -b feat/modeller-new-feature

# 2. Make changes with atomic commits
git add <files>
git commit -m "feat(modeller): add base component"
git commit -m "feat(modeller): implement main logic"
git commit -m "test(modeller): add unit tests"

# 3. Keep branch updated
git fetch origin main
git rebase origin/main

# 4. Push and create PR
git push -u origin feat/modeller-new-feature
```

### 7.8 Pre-commit Checks

The pre-commit hook runs automatically:
```bash
# What runs on commit:
bunx lint-staged

# lint-staged checks:
# - Biome lint + format for TS/JS files
# - cargo fmt for Rust files (if configured)
```

### 7.9 PR Guidelines

**Title**: Same format as commits
```
feat(modeller): add zoom-to-object functionality
```

**Description template**:
```markdown
## Summary
Brief description of what this PR does.

## Changes
- Added X component
- Modified Y behavior
- Fixed Z bug

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] No TypeScript errors

## Screenshots (if UI changes)
[Add screenshots here]

## Related Issues
Closes #123
```

---

## 8. File Organization

### 8.1 Index Files

```typescript
// components/ui/index.ts - Re-export all components
export { Button } from "./button"
export { Card, CardHeader, CardContent } from "./card"
export { Input } from "./input"

// Don't use barrel files for large packages (tree-shaking issues)
```

### 8.2 Colocated Files

```
components/
└── ViewerPanel/
    ├── index.ts              # Re-export
    ├── ViewerPanel.tsx       # Main component
    ├── ViewerControls.tsx    # Sub-component
    ├── ViewerToolbar.tsx     # Sub-component
    ├── use-viewer.ts         # Local hook
    └── types.ts              # Local types
```

---

## 9. Comments

### 9.1 When to Comment

```typescript
// DO: Explain WHY, not WHAT
// We need to debounce this because the CAD engine
// can't handle rapid parameter updates
const debouncedUpdate = useDebouncedCallback(updateShape, 100)

// DON'T: State the obvious
// Set the width to 10
setWidth(10)
```

### 9.2 TODO Format

```typescript
// TODO: Implement undo/redo for boolean operations
// TODO(john): Review this algorithm for edge cases
// FIXME: Memory leak when switching projects
// HACK: Workaround for Three.js dispose issue
```
