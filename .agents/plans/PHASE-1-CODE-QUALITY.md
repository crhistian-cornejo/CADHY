# Phase 1: Code Quality & Performance Optimization

> **Duration**: 2 weeks
> **Target**: v0.2.0-alpha
> **Focus**: Fix critical bugs, optimize performance, production standards

---

## Overview

This phase focuses on establishing production-grade code quality before adding new features. We address critical bugs, performance bottlenecks, and implement industry-standard patterns.

---

## Sprint 1A: Rust Critical Fixes (Week 1, Days 1-3)

### Objective

Eliminate all critical `unwrap()` calls that can cause runtime panics.

### Critical Files

#### 1. `crates/cadhy-hydraulics/src/saint_venant.rs`

**Issues:**
- Lines 605, 857, 875, 893, 1038, 1634: `.last().unwrap()` / `.first().unwrap()`

**Fix Pattern:**
```rust
// ❌ Before
let last_section = sections.last().unwrap();

// ✅ After
let last_section = sections.last()
    .ok_or(HydraulicError::Calculation("No sections in mesh".into()))?;
```

**Action Items:**
- [ ] Line 605: `sections.last().unwrap()`
- [ ] Line 857: `self.mesh.last().unwrap()`
- [ ] Line 875: `self.mesh.first().unwrap()`
- [ ] Line 893: `self.mesh.last().unwrap()`
- [ ] Line 1038: `sections.last().unwrap()`
- [ ] Line 1634: `self.mesh.last().unwrap()` and `.first().unwrap()`

#### 2. `crates/cadhy-hydraulics/src/corridor.rs`

**Issues:**
- Lines 2449-2450: `.as_mut().unwrap()` on Options

**Fix Pattern:**
```rust
// ❌ Before
let normals = result.normals.as_mut().unwrap();

// ✅ After
let normals = result.normals.as_mut()
    .ok_or(HydraulicError::Calculation("Normals not initialized".into()))?;
```

**Action Items:**
- [ ] Line 2449: `result.normals.as_mut().unwrap()`
- [ ] Line 2450: `result.stations.as_mut().unwrap()`

#### 3. `crates/cadhy-hydraulics/src/characteristic_curves.rs`

**Issues:**
- Line 810: `depths.unwrap()`

**Fix:**
```rust
// ❌ Before
let (y_sub, y_super) = depths.unwrap();

// ✅ After
let (y_sub, y_super) = depths
    .ok_or(HydraulicError::Calculation("Failed to compute depths".into()))?;
```

**Action Items:**
- [ ] Line 810: `depths.unwrap()`

#### 4. `crates/cadhy-hydraulics/src/gvf_analysis.rs`

**Issues:**
- Lines 1996-1997: `.first().expect()` / `.last().expect()`

**Fix:**
```rust
// ❌ Before (in loop - assumes profile has at least 2 elements)
profile.first().expect("Profile has at least 2 elements")

// ✅ After (validate before loop)
if profile.len() < 2 {
    return Err(HydraulicError::Calculation(
        "Profile must have at least 2 elements".into()
    ));
}
// Then use unwrap in loop (safe now)
```

**Action Items:**
- [ ] Validate profile length before loops
- [ ] Replace expect() with safe access

### Performance Optimizations

#### 1. Use `Vec::with_capacity()` in tight loops

**File**: `crates/cadhy-hydraulics/src/corridor.rs`

**Issue**: 54 instances of `Vec::new()` in geometry generation

**Fix Pattern:**
```rust
// ❌ Before
let mut vertices = Vec::new();
for i in 0..num_points {
    vertices.push(calculate_vertex(i));
}

// ✅ After
let mut vertices = Vec::with_capacity(num_points);
for i in 0..num_points {
    vertices.push(calculate_vertex(i));
}
```

**Action Items:**
- [ ] Identify loops with known iteration count
- [ ] Pre-allocate vectors with capacity
- [ ] Benchmark improvements

#### 2. Replace `&'static str` for constant errors

**File**: `crates/cadhy-cad/src/primitives.rs`

**Issue**: 17 instances of `.to_string()` for constant error messages

**Fix:**
```rust
// In error.rs, change String to &'static str
#[derive(Error, Debug)]
pub enum OcctError {
    #[error("Invalid parameters: {0}")]
    InvalidParams(&'static str),
    // ...
}

// In primitives.rs
// ❌ Before
return Err(OcctError::InvalidParams(
    "Box dimensions must be positive".to_string(),
));

// ✅ After
return Err(OcctError::InvalidParams(
    "Box dimensions must be positive",
));
```

**Action Items:**
- [ ] Update error enum variants to use `&'static str`
- [ ] Update all error sites
- [ ] Keep `String` only for dynamic errors

#### 3. Safe numeric conversions

**File**: `crates/cadhy-hydraulics/src/corridor.rs`

**Issue**: Line 2445: `(value).floor() as usize` can truncate

**Fix:**
```rust
// ❌ Before
let num_rows = (input.length / input.baffle_spacing).floor() as usize;

// ✅ After
fn safe_f64_to_usize(value: f64) -> Result<usize, HydraulicError> {
    if !value.is_finite() || value < 0.0 {
        return Err(HydraulicError::InvalidParams("Value must be finite and non-negative".into()));
    }
    if value > usize::MAX as f64 {
        return Err(HydraulicError::InvalidParams("Value exceeds usize::MAX".into()));
    }
    Ok(value as usize)
}

let num_rows = safe_f64_to_usize((input.length / input.baffle_spacing).floor())?;
```

**Action Items:**
- [ ] Create `safe_f64_to_usize` helper
- [ ] Replace all unsafe casts
- [ ] Add tests

#### 4. Replace `partial_cmp().unwrap_or()` with `total_cmp()`

**File**: `crates/cadhy-hydraulics/src/corridor.rs`

**Issue**: Lines 83-85

**Fix:**
```rust
// ❌ Before
self.sections.sort_by(|a, b| {
    a.station.partial_cmp(&b.station).unwrap_or(std::cmp::Ordering::Equal)
});

// ✅ After
self.sections.sort_by(|a, b| a.station.total_cmp(&b.station));
```

**Action Items:**
- [ ] Replace all `partial_cmp().unwrap_or()`
- [ ] Verify no NaN values expected

### Testing

**Action Items:**
- [ ] Run `cargo clippy --workspace` (must be 0 warnings)
- [ ] Run `cargo test --workspace` (all pass)
- [ ] Run `cargo bench` (baseline for performance)
- [ ] Manual test: Create channel with 100 sections (no crash)
- [ ] Manual test: Run GVF analysis with edge cases

---

## Sprint 1B: TypeScript Performance (Week 1, Days 4-7)

### Objective

Optimize React components for production-grade performance.

### 1. Conditional Logger

**File**: `packages/shared/logger.ts` (NEW)

```typescript
/**
 * Conditional logger that outputs in development, silent in production
 */
const isDev = import.meta.env.DEV

export const logger = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // Always log errors
  info: isDev ? console.info.bind(console) : () => {},
  debug: isDev ? console.debug.bind(console) : () => {},
  group: isDev ? console.group.bind(console) : () => {},
  groupEnd: isDev ? console.groupEnd.bind(console) : () => {},
}

/**
 * Performance marker (only in dev)
 */
export const perf = {
  mark: isDev ? performance.mark.bind(performance) : () => {},
  measure: isDev ? performance.measure.bind(performance) : () => {},
}
```

**Action Items:**
- [ ] Create `packages/shared/logger.ts`
- [ ] Export from `packages/shared/index.ts`
- [ ] Replace all `console.log` with `logger.log` in:
  - `apps/desktop/src/hooks/useAIChat.ts` (34 occurrences)
  - `apps/desktop/src/stores/chat-store.ts` (30 occurrences)
  - `apps/desktop/src/hooks/useCAD.ts` (26 occurrences)
  - `apps/desktop/src/components/modeller/viewport/SceneContent.tsx` (6 occurrences)
  - All other files (total 187 occurrences)

### 2. React.memo for List Components

#### Component: `LayerItem`

**File**: `apps/desktop/src/components/scene/LayersPanel.tsx`

**Current** (lines 147-291):
```typescript
function LayerItem({ layer, isActive, onSelect, ... }: LayerItemProps) {
  // component logic
}
```

**Fixed**:
```typescript
const LayerItem = React.memo(function LayerItem({
  layer,
  isActive,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
}: LayerItemProps) {
  // Use useCallback for event handlers
  const handleClick = useCallback(() => {
    onSelect(layer.id)
  }, [layer.id, onSelect])

  const handleVisibilityToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleVisibility(layer.id)
  }, [layer.id, onToggleVisibility])

  // ... rest of component
})
```

**Action Items:**
- [ ] Wrap with `React.memo`
- [ ] Add `useCallback` to all event handlers
- [ ] Test: Toggle 1000 layers, should be < 100ms

#### Component: `SceneObjectItem`

**File**: `apps/desktop/src/components/scene/ScenePanel.tsx`

**Lines**: 85-226

**Action Items:**
- [ ] Wrap with `React.memo`
- [ ] Add `useCallback` for handlers
- [ ] Memoize computed values (e.g., icon selection)

#### Component: `VectorInput`

**File**: `apps/desktop/src/components/properties/PropertiesPanel.tsx`

**Lines**: 150-195

**Action Items:**
- [ ] Wrap with `React.memo`
- [ ] Optimize value change handlers with `useCallback`

#### Component: `PropertyRow`

**Lines**: 130-137

**Action Items:**
- [ ] Wrap with `React.memo` (very simple component)

#### Component: `Section`

**Lines**: 94-119

**Action Items:**
- [ ] Wrap with `React.memo`

### 3. Fix `any` Types

**File**: `apps/desktop/src/components/modeller/viewport/SceneContent.tsx`

**Lines**: 85-86, 362

```typescript
// ❌ Before
import { useRef } from 'react'
const transformControlsRef = useRef<any>(null)
const orbitControlsRef = useRef<any>(null)

// ✅ After
import { useRef } from 'react'
import type { OrbitControls } from 'three-stdlib'
import type { TransformControls } from '@react-three/drei'

const transformControlsRef = useRef<TransformControls>(null)
const orbitControlsRef = useRef<OrbitControls>(null)
```

**Action Items:**
- [ ] Import correct types from `three-stdlib` and `@react-three/drei`
- [ ] Fix all three refs
- [ ] Run `bun typecheck` (0 errors)

### 4. Optimize Filters with useMemo

**File**: `apps/desktop/src/components/scene/LayersPanel.tsx`

**Lines**: 370-372

```typescript
// ❌ Before
const filteredLayers = layers.filter((layer) =>
  layer.name.toLowerCase().includes(searchQuery.toLowerCase())
)

// ✅ After
const filteredLayers = useMemo(() => {
  const query = searchQuery.toLowerCase()
  return layers.filter((layer) =>
    layer.name.toLowerCase().includes(query)
  )
}, [layers, searchQuery])
```

**Action Items:**
- [ ] Wrap all filter operations in `useMemo`
- [ ] Wrap all sort operations in `useMemo`
- [ ] Profile with React DevTools (should see fewer renders)

### 5. Optimize Zustand Batch Actions

**File**: `apps/desktop/src/stores/modeller/layers-slice.ts`

**Current** (inefficient):
```typescript
// In LayersPanel.tsx
const handleShowAll = () => {
  layers.forEach((layer) => {
    if (!layer.visible) {
      toggleLayerVisibility(layer.id) // Multiple set() calls!
    }
  })
}
```

**Fixed**:
```typescript
// In layers-slice.ts
setAllLayersVisibility: (visible: boolean) => {
  set((state) => ({
    layers: state.layers.map(layer => ({ ...layer, visible }))
  }), false, 'setAllLayersVisibility')
},

// In LayersPanel.tsx
const handleShowAll = () => {
  setAllLayersVisibility(true)
}
```

**Action Items:**
- [ ] Add `setAllLayersVisibility` action
- [ ] Add `setAllLayersLocked` action
- [ ] Update UI to use batch actions
- [ ] Test with 1000 layers (should be instant)

### Testing

**Action Items:**
- [ ] Run `bun typecheck` (0 errors)
- [ ] Run `bun lint` (0 errors)
- [ ] Profile with React DevTools Profiler
  - [ ] Scene with 1000 objects: select one → should re-render only affected
  - [ ] Toggle layer visibility → should not re-render other layers
- [ ] Performance budget:
  - [ ] 60 FPS viewport with 10k polygons
  - [ ] < 100ms for user interactions
  - [ ] < 16ms for renders

---

## Sprint 2: Virtualization (Week 2, Days 1-3)

### Objective

Implement virtual scrolling for large lists using `@tanstack/react-virtual`.

### 1. Install Dependencies

```bash
cd apps/desktop
bun add @tanstack/react-virtual
```

### 2. Create Virtualization Hook

**File**: `apps/desktop/src/hooks/useVirtualList.ts` (NEW)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function useVirtualList<T>(items: T[], estimateSize: number = 50) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5, // Render 5 extra items above/below viewport
  })

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  }
}
```

**Action Items:**
- [ ] Create hook
- [ ] Add JSDoc comments
- [ ] Export from `apps/desktop/src/hooks/index.ts`

### 3. Virtualize ScenePanel

**File**: `apps/desktop/src/components/scene/ScenePanel.tsx`

**Current** (lines 450-480):
```typescript
<div className="flex flex-col gap-1 p-2">
  {filteredObjects.map((obj) => (
    <SceneObjectItem key={obj.id} object={obj} {...handlers} />
  ))}
</div>
```

**Fixed**:
```typescript
import { useVirtualList } from '@/hooks/useVirtualList'

function ScenePanel() {
  // ... existing code

  const { parentRef, virtualItems, totalSize } = useVirtualList(
    filteredObjects,
    50 // estimated item height
  )

  return (
    // ... header

    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const object = filteredObjects[virtualItem.index]
          return (
            <div
              key={object.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SceneObjectItem object={object} {...handlers} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Action Items:**
- [ ] Implement virtualization
- [ ] Test with 10,000 objects
- [ ] Verify scroll performance (should be smooth)
- [ ] Adjust `estimateSize` if needed

### 4. Virtualize LayersPanel

**File**: `apps/desktop/src/components/scene/LayersPanel.tsx`

**Similar implementation to ScenePanel**

**Action Items:**
- [ ] Implement virtualization for layers list
- [ ] Test with 1,000 layers
- [ ] Verify keyboard navigation still works

### Testing

**Action Items:**
- [ ] Create test project with 10,000 objects
- [ ] Scroll performance: 60 FPS
- [ ] Memory usage: No leaks
- [ ] Keyboard navigation: Arrow keys work
- [ ] Selection: Click on items works

---

## Sprint 3: Production Standards (Week 2, Days 4-7)

### Objective

Add error boundaries, monitoring, and production infrastructure.

### 1. Error Boundary

**File**: `apps/desktop/src/components/ErrorBoundary.tsx` (NEW)

```typescript
import * as React from 'react'
import { logger } from '@cadhy/shared/logger'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-destructive bg-destructive/10 p-6">
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Action Items:**
- [ ] Create ErrorBoundary component
- [ ] Wrap main App with ErrorBoundary
- [ ] Wrap each major panel with ErrorBoundary
- [ ] Test: Throw error in component, verify UI

### 2. Performance Monitoring

**File**: `apps/desktop/src/lib/monitoring.ts` (NEW)

```typescript
import { logger } from '@cadhy/shared/logger'

export interface PerformanceMark {
  name: string
  startTime: number
  duration?: number
}

class PerformanceMonitor {
  private marks = new Map<string, number>()

  start(name: string) {
    this.marks.set(name, performance.now())
    logger.debug(`[Perf] Start: ${name}`)
  }

  end(name: string): number | undefined {
    const startTime = this.marks.get(name)
    if (!startTime) {
      logger.warn(`[Perf] No start mark for: ${name}`)
      return undefined
    }

    const duration = performance.now() - startTime
    this.marks.delete(name)

    logger.debug(`[Perf] End: ${name} (${duration.toFixed(2)}ms)`)

    // Warn if exceeds budget
    if (duration > 100) {
      logger.warn(`[Perf] Slow operation: ${name} (${duration.toFixed(2)}ms)`)
    }

    return duration
  }

  measure(name: string, fn: () => void): number {
    this.start(name)
    fn()
    return this.end(name) || 0
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name)
    try {
      return await fn()
    } finally {
      this.end(name)
    }
  }
}

export const perf = new PerformanceMonitor()
```

**Usage**:
```typescript
import { perf } from '@/lib/monitoring'

// Sync
perf.start('create-channel')
const channel = await createChannel(params)
perf.end('create-channel')

// Async
const result = await perf.measureAsync('load-project', () =>
  loadProject(path)
)
```

**Action Items:**
- [ ] Create monitoring utility
- [ ] Add performance marks to critical operations:
  - [ ] Load project
  - [ ] Create CAD primitives
  - [ ] Boolean operations
  - [ ] Mesh generation
  - [ ] IFC import (when implemented)
- [ ] Set performance budgets
- [ ] Log slow operations

### 3. Quality Checklist

**File**: `.agents/standards/QUALITY-CHECKLIST.md` (NEW)

Create comprehensive checklist for pre-commit, pre-PR, pre-release.

**Action Items:**
- [ ] Create quality checklist document
- [ ] Add to CI/CD pipeline
- [ ] Update CONTRIBUTING.md

### Testing

**Action Items:**
- [ ] Test error boundary: Throw error in component
- [ ] Test performance monitoring: Verify logs
- [ ] Run full test suite: `bun test`
- [ ] Run Rust tests: `cargo test --workspace`
- [ ] Manual smoke test: All major features work

---

## Quality Gates

### Before Merging to Main

- [ ] 0 `cargo clippy` warnings
- [ ] 0 TypeScript errors
- [ ] 0 Biome lint errors
- [ ] All tests pass (Rust + TypeScript)
- [ ] No `unwrap()` in production Rust code
- [ ] No `console.log` in production TypeScript
- [ ] No `any` types (except justified)
- [ ] Performance budgets met
- [ ] Error boundaries in place
- [ ] CHANGELOG updated

### Performance Budgets

- [ ] Viewport: 60 FPS with 10k polygons
- [ ] User interactions: < 100ms
- [ ] Load project: < 2 seconds
- [ ] CAD primitives: < 500ms
- [ ] List virtualization: Smooth scroll with 10k items

---

## Deliverables

### Week 1
- [ ] All critical `unwrap()` fixed
- [ ] Performance optimizations applied
- [ ] Conditional logger implemented
- [ ] React.memo added to key components
- [ ] Types fixed (no `any`)
- [ ] Filters optimized with useMemo
- [ ] Batch actions in Zustand

### Week 2
- [ ] Virtualization implemented (Scene, Layers)
- [ ] Error boundaries deployed
- [ ] Performance monitoring active
- [ ] Quality checklist created
- [ ] All quality gates passed
- [ ] Documentation updated
- [ ] Ready for Phase 2 (IFC)

---

## Success Metrics

- [ ] 0 production crashes in 100 operations
- [ ] 70%+ test coverage
- [ ] Performance: 60 FPS viewport
- [ ] Memory: No leaks in 1-hour session
- [ ] Code quality: A grade on all linters
- [ ] Ready to implement IFC import

---

**Next Phase**: Phase 2 - IFC Import Foundation
