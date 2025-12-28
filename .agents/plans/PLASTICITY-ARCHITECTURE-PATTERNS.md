# Plasticity Architecture Patterns for CADHY

> **Purpose**: Document architectural patterns extracted from Plasticity for adoption in CADHY
> **Date**: 2025-12-20
> **Status**: Reference Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Patterns](#2-core-patterns)
3. [MiniGizmos System](#3-minigizmos-system)
4. [MultiFactory Pattern](#4-multifactory-pattern)
5. [Object Picker System](#5-object-picker-system)
6. [Point Picker System](#6-point-picker-system)
7. [Dialog Integration](#7-dialog-integration)
8. [Supporting Systems](#8-supporting-systems)
9. [CADHY Adaptation Plan](#9-cadhy-adaptation-plan)

---

## 1. Executive Summary

Plasticity implements a sophisticated command system for CAD operations with:

- **State Machine Gizmos**: Visual manipulators with hover/drag/keyboard modes
- **Factory Pattern**: Geometry generation with preview/commit lifecycle
- **Composable Gizmos**: Mini-gizmos that combine into complex tools
- **Smart Picking**: Object and point selection with snap system
- **Modal Dialogs**: Parameter input integrated with live preview
- **Quasimode**: Temporary tool activation pattern

### Key Insights for CADHY

| Plasticity Component | CADHY Equivalent | Adaptation Notes |
|---------------------|------------------|------------------|
| c3d kernel calls | Tauri + Rust OpenCASCADE | IPC boundary |
| GeometryFactory | CommandFactory | Async via invoke() |
| AbstractGizmo | GizmoController | React + Three.js |
| ObjectPicker | SelectionManager | Zustand store |
| PointPicker | SnapPointPicker | React Three hooks |
| AbstractDialog | React Dialog | shadcn/ui dialogs |

---

## 2. Core Patterns

### 2.1 Executable Interface

Every interactive tool implements `Executable`:

```typescript
interface Executable<I, O> {
  execute(cb: (i: I) => O, ...args: any[]): CancellablePromise<O>;
}
```

This allows:
- Callback-based progress reporting
- Promise-based completion
- Cancellation support

### 2.2 CancellablePromise

Custom promise with explicit lifecycle:

```typescript
class CancellablePromise<T> extends Promise<T> {
  cancel(): void;   // Reject with CancelError
  finish(): void;   // Resolve immediately
  interrupt(): void; // Cancel but allow cleanup
  
  // Composition
  map<U>(fn: (t: T) => U): CancellablePromise<U>;
  rejectOnInterrupt(): CancellablePromise<T>;
}
```

**CADHY Adaptation**: Create `@cadhy/shared/cancellable-promise.ts`

### 2.3 Disposable Pattern

Resources implement cleanup:

```typescript
interface Disposable {
  dispose(): void;
}

class CompositeDisposable {
  add(...disposables: Disposable[]): void;
  dispose(): void; // Disposes all in reverse order
}
```

**CADHY Adaptation**: Use `AbortController` for modern approach, but keep Disposable for complex cleanup.

---

## 3. MiniGizmos System

### 3.1 Value State Machine

Tracks gizmo value with rollback support:

```typescript
class AbstractValueStateMachine<T> {
  private currentMagnitude: T;
  private originalMagnitude: T;
  
  get original(): T;
  set original(magnitude: T);  // Also sets current
  
  get current(): T;
  set current(magnitude: T);
  
  start(): void;    // Begin interaction
  push(): void;     // Commit current as new original
  revert(): void;   // current = original
  interrupt(): void; // Optionally revert on cancel
}

// Specializations
class MagnitudeStateMachine extends AbstractValueStateMachine<number> {
  min = Number.NEGATIVE_INFINITY;
  get current() { return Math.max(super.current, this.min); }
}

class VectorStateMachine extends AbstractValueStateMachine<THREE.Vector3> {}
class QuaternionStateMachine extends AbstractValueStateMachine<THREE.Quaternion> {}
```

### 3.2 Gizmo Hierarchy

```
AbstractGizmo<T>
├── CircularGizmo<T>          # Rotation, screen-space
│   └── AngleGizmo            # Angle input with keyboard
├── AbstractAxisGizmo         # Linear along axis
│   ├── LengthGizmo           # World-space length (no scale)
│   ├── DistanceGizmo         # Relative distance (scales with view)
│   └── AbstractAxialScaleGizmo # Scale-like behavior
└── PlanarGizmo<T>            # Movement in plane
```

### 3.3 Gizmo Anatomy

Each gizmo has:

```typescript
abstract class AbstractGizmo<T> extends THREE.Object3D {
  // Visual components
  protected readonly handle: THREE.Object3D;   // Visible geometry
  protected readonly picker: THREE.Object3D;   // Invisible hit area
  
  // Optional visual feedback during interaction
  readonly helper?: GizmoHelper<T>;
  
  // State
  protected stateMachine?: GizmoStateMachine;
  
  // Lifecycle
  onPointerEnter(intersect: Intersector): void;
  onPointerLeave(intersect: Intersector): void;
  onPointerDown(cb: (n: T) => void, intersect: Intersector, info: MovementInfo): void;
  onPointerMove(cb: (n: T) => void, intersect: Intersector, info: MovementInfo): T | undefined;
  onPointerUp(cb: (n: T) => void, intersect: Intersector, info: MovementInfo): void;
  onKeyPress(cb: (n: T) => void, text: KeyboardInterpreter): T;
  onInterrupt(cb: (n: T) => void): void;
}
```

### 3.4 Gizmo Helpers

Visual feedback during interaction:

```typescript
interface GizmoHelper<T> {
  onStart(viewport: Viewport, position: THREE.Vector2): void;
  onMove(position: THREE.Vector2, value: T): void;
  onKeyPress(value: T, text: KeyboardInterpreter): void;
  onEnd(): void;
  onInterrupt(): void;
}

// Implementations
class DashedLineMagnitudeHelper  // SVG dashed line from origin to cursor
class NumberHelper              // Floating number display
class AxisHelper                // Line showing constraint axis
class CompositeHelper<T>        // Combines multiple helpers
```

### 3.5 Input Modes

Gizmos support dual input:

```typescript
type InputMode = 'pointer' | 'keyboard';

// In gizmo:
protected mode: InputMode = 'pointer';

onPointerMove(cb, intersect, info) {
  if (this.mode !== 'pointer') return this.state.current;
  // ... pointer logic
}

onKeyPress(cb, text) {
  const value = TextCalculator.calculate(text.state);
  if (value === undefined) {
    this.mode = 'pointer';
    return this.state.current;
  }
  this.mode = 'keyboard';
  // ... apply keyboard value
}
```

---

## 4. MultiFactory Pattern

### 4.1 Base MultiFactory

Orchestrates multiple sub-factories:

```typescript
interface FactoryHelpers {
  get originalItem(): visual.Item | visual.Item[] | undefined;
}

type MultiplyableFactory = GeometryFactory & FactoryHelpers;

class MultiGeometryFactory<T extends MultiplyableFactory> extends GeometryFactory {
  factories: T[] = [];
  
  async calculate() {
    const results = await Promise.all(
      this.factories.map(f => f.calculateWithCache())
    );
    return results.flat();
  }
  
  async calculatePhantoms(): Promise<PhantomInfo[]> {
    const results = await Promise.all(
      this.factories.map(f => f.calculatePhantoms())
    );
    return results.flat();
  }
  
  protected get originalItem(): visual.Item[] {
    return this.factories
      .map(f => f.originalItem)
      .filter(Boolean)
      .flat();
  }
}
```

### 4.2 Delegation Decorators

Propagate property changes to sub-factories:

```typescript
// @delegate.default(value) - Sets property on all sub-factories
// @delegate.update - Recreates sub-factories when property changes

class MultiFilletFactory extends MultiGeometryFactory<FilletFactory> {
  @delegate.default(0.1)
  distance!: number;  // Changes propagate to all FilletFactory instances
  
  @delegate.update
  set edges(edges: visual.CurveEdge[]) {
    // Recreates this.factories based on edge grouping
  }
}
```

### 4.3 Property Derivation

Compute derived properties from sub-factories:

```typescript
// @derive(selector, reducer) - Aggregate from sub-factories

class MultiFilletFactory {
  @derive(f => f.solid, solids => solids[0])
  get solid(): visual.Solid { /* derived */ }
  
  @derive(f => f.maxDistance, Math.min)
  get maxDistance(): number { /* derived */ }
}
```

---

## 5. Object Picker System

### 5.1 ObjectPicker Class

Manages object selection during commands:

```typescript
class ObjectPicker implements Executable<SelectionDelta, HasSelection> {
  readonly selection: HasSelectedAndHovered;
  
  min = 1;  // Minimum selections required
  max = 1;  // Maximum selections allowed
  
  get mode(): SelectionModeSet;  // Face, Edge, Solid, Curve, etc.
  
  readonly raycasterParams = {
    Mesh: { threshold: 0 },
    Line: { threshold: 0.1 },
    Line2: { threshold: 15 },
    Points: { threshold: 10 }
  };
  
  execute(
    cb?: (delta: SelectionDelta) => void,
    min?: number,
    max?: number,
    mode?: SelectionMode
  ): CancellablePromise<HasSelection>;
  
  // Typed getters
  shift(mode: SelectionMode.Face, min?, max?): CancellablePromise<FaceSelection>;
  slice(mode: SelectionMode.Edge, min?, max?): CancellablePromise<EdgeSelection>;
  
  prohibit(prohibitions: Iterable<Selectable>): void;
  copy(selection: HasSelectedAndHovered, ...modes: SelectionMode[]): void;
}
```

### 5.2 Viewport Integration

ObjectPicker creates viewport selectors:

```typescript
class ObjectPickerViewportSelector extends AbstractViewportSelector {
  processClick(intersections: Intersection[], upEvent: MouseEvent): void;
  processDblClick(intersects: Intersection[], dblClickEvent: MouseEvent): void;
  processBoxSelect(selected: Set<Intersectable>, upEvent: MouseEvent): void;
  processHover(intersects: Intersection[], moveEvent?: MouseEvent): void;
  processBoxHover(selected: Set<Intersectable>, moveEvent: MouseEvent): void;
}
```

### 5.3 Selection Modes

```typescript
enum SelectionMode {
  Solid,
  Face,
  CurveEdge,
  Curve,
  Region,
  ControlPoint,
  Empty
}

// Typed collections
type FaceSelection = TypedSelection<visual.Face, SelectionMode.Face>;
type EdgeSelection = TypedSelection<visual.CurveEdge, SelectionMode.CurveEdge>;
type SolidSelection = TypedSelection<visual.Solid, SelectionMode.Solid>;
// etc.
```

---

## 6. Point Picker System

### 6.1 PointPicker Class

Picks 3D points with snapping:

```typescript
interface PointResult {
  point: THREE.Vector3;
  info: PointInfo;
}

interface PointInfo {
  constructionPlane: ConstructionPlane;
  snap: Snap;
  orientation: THREE.Quaternion;
  cameraPosition: THREE.Vector3;
  cameraOrientation: THREE.Quaternion;
  isOrthoMode: boolean;
  viewport: Viewport;
}

class PointPicker implements Executable<PointResult, PointResult> {
  execute(
    cb?: (pt: PointResult) => void,
    options?: PointPickerOptions
  ): CancellablePromise<PointResult>;
  
  // Constraints
  restrictToPlaneThroughPoint(pt: THREE.Vector3, snap?: Snap): void;
  restrictToPlane(plane: PlaneSnap): void;
  restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3): void;
  restrictToEdges(edges: visual.CurveEdge[]): void;
  
  // Snap configuration
  addAxesAt(pt: THREE.Vector3, orientation?: THREE.Quaternion): void;
  addSnap(...snaps: (PointSnap | RaycastableSnap)[]): void;
  clearAddedSnaps(): void;
  
  get straightSnaps(): SnapCollection;
  set facePreferenceMode(mode: PreferenceMode): void;
  
  undo(): void;  // Remove last picked point
}
```

### 6.2 Snap System

```typescript
abstract class Snap {
  readonly name?: string;
  readonly helper?: THREE.Object3D;
  abstract project(point: THREE.Vector3, snapToGrid?: boolean): SnapResult;
}

class PointSnap extends Snap {
  constructor(name?: string, position?: THREE.Vector3);
}

abstract class RaycastableSnap extends Snap {
  abstract intersect(raycaster: THREE.Raycaster): SnapResult[];
}

class PlaneSnap extends RaycastableSnap {
  readonly n: THREE.Vector3;  // Normal
  readonly p: THREE.Vector3;  // Point on plane
}

class PointAxisSnap extends RaycastableSnap {
  readonly commandName: string;  // Keyboard shortcut
}

interface SnapResult {
  snap: Snap;
  position: THREE.Vector3;
  cursorPosition: THREE.Vector3;
  cursorOrientation: THREE.Quaternion;
  orientation: THREE.Quaternion;
}
```

### 6.3 Snap Presentation

Visual feedback for snaps:

```typescript
class SnapPresentation {
  readonly helpers: THREE.Object3D[];
  readonly info?: SnapInfo;
  readonly names: readonly string[];
  readonly nearby: Helper[];
  
  static makeForPointPicker(...): { presentation, intersections, nearby };
  static makeForGizmo(...): { presentation, intersections, nearby };
}

class SnapPresenter {
  execute(): CompositeDisposable;  // Start presenting
  onPointerMove(viewport: Viewport, presentation: SnapPresentation): void;
  clear(): void;
}

class SnapIndicator {
  nearbyIndicatorFor(snap: PointSnap): Helper;
  snapIndicatorFor(result: SnapResult): Helper;
}
```

---

## 7. Dialog Integration

### 7.1 AbstractDialog

Base class for parameter dialogs:

```typescript
type DialogState<T> = 
  | { tag: 'none' }
  | { tag: 'executing', cb: (sv: T) => void, cancellable: CancellablePromise<void>, prompt: PromptState }
  | { tag: 'finished' };

abstract class AbstractDialog<T> extends HTMLElement implements Executable<T, void> {
  protected abstract readonly params: T;
  abstract get name(): string;
  abstract render(): void;
  
  // Lifecycle
  connectedCallback(): void;    // render()
  disconnectedCallback(): void;
  
  // Execution
  execute(cb: (sv: T) => void): CancellablePromise<void>;
  finish(): void;
  cancel(): void;
  
  // Event handling
  protected onChange = (e: Event) => {
    // Auto-extracts value from input elements
    // Updates params and calls cb
  };
  
  // Sub-prompts (e.g., point picking within dialog)
  prompt<T>(
    key: string,
    execute: () => CancellablePromise<T>,
    clear?: () => void
  ): () => CancellablePromise<T>;
}
```

### 7.2 Dialog Usage Pattern

```typescript
// In Command
const dialog = new ExtrudeDialog(this.editor.signals);
dialog.execute(params => {
  factory.distance1 = params.distance1;
  factory.distance2 = params.distance2;
  factory.update();
}).resource(this);

// Dialog can trigger sub-pickers
dialog.prompt('direction', 
  () => pointPicker.execute(pt => {
    factory.direction = pt.point.sub(factory.origin).normalize();
  })
);
```

---

## 8. Supporting Systems

### 8.1 Keyboard Interpreter

Modal keyboard input for gizmos:

```typescript
class KeyboardInterpreter {
  private _state = "";
  private caret = 0;
  
  get state(): string;
  interpret(event: KeyboardEvent): void;
}

class TextCalculator {
  static calculate(text: string): number | undefined;
}
```

Supports:
- Numeric input: `0-9`, `.`, `-`
- Editing: `Backspace`, `ArrowLeft`, `ArrowRight`
- Trailing minus: `10-` → `-10`

### 8.2 Quasimode

Temporary mode activation:

```typescript
class Quasimode<I> implements Executable<I, void> {
  constructor(
    name: string,
    editor: EditorLike,
    factory: GeometryFactory,
    executable: Executable<I, any>
  );
  
  execute(cb: (i: I) => any, ...args: any[]): CancellablePromise<void>;
}
```

Usage: Hold key → activate mode → release key → return to previous state

```typescript
// Example: Hold Alt to enter point-picking mode
const quasimode = new Quasimode('pick-direction', editor, factory, pointPicker);
quasimode.execute(pt => {
  factory.direction = pt.point.sub(factory.origin).normalize();
}).resource(this);
```

### 8.3 Movement Info

Rich information during gizmo interaction:

```typescript
interface MovementInfo {
  pointStart2d: THREE.Vector2;  // Mouse start in normalized device coords
  pointEnd2d: THREE.Vector2;    // Mouse current
  center2d: THREE.Vector2;      // Gizmo center projected
  angle: number;                // Angle from center
  event: MouseEvent;            // Original event
  viewport: Viewport;
}
```

---

## 9. CADHY Adaptation Plan

### 9.1 Architecture Mapping

```
CADHY Architecture
==================

packages/
├── command/                      # Command system
│   ├── Command.ts               # Base command
│   ├── CommandRegistry.ts       # Command registration
│   └── CancellablePromise.ts    # Promise utilities
│
├── factory/                      # Factory pattern
│   ├── GeometryFactory.ts       # Base factory
│   ├── MultiFactory.ts          # Multi-object operations
│   └── FactoryBuilder.ts        # Delegation decorators
│
├── gizmo/                        # Gizmo system
│   ├── AbstractGizmo.ts         # Base gizmo
│   ├── CompositeGizmo.ts        # Gizmo composition
│   ├── MiniGizmos.ts            # Reusable gizmos
│   │   ├── AngleGizmo
│   │   ├── DistanceGizmo
│   │   ├── LengthGizmo
│   │   └── PlanarGizmo
│   ├── GizmoStateMachine.ts     # State management
│   ├── GizmoHelpers.ts          # Visual feedback
│   └── GizmoMaterials.ts        # Shared materials
│
├── picker/                       # Selection systems
│   ├── ObjectPicker.ts          # Object selection
│   ├── PointPicker.ts           # Point picking
│   └── SelectionMode.ts         # Mode definitions
│
├── snap/                         # Snapping system
│   ├── Snap.ts                  # Base snap
│   ├── PointSnap.ts             # Point snaps
│   ├── PlaneSnap.ts             # Plane snaps
│   ├── AxisSnap.ts              # Axis snaps
│   ├── SnapManager.ts           # Snap orchestration
│   └── SnapPresenter.ts         # Visual feedback
│
└── dialog/                       # Dialog system
    ├── AbstractDialog.tsx       # Base dialog (React)
    └── DialogProvider.tsx       # Context provider
```

### 9.2 Key Differences from Plasticity

| Aspect | Plasticity | CADHY |
|--------|-----------|-------|
| UI Framework | Lit HTML | React 19 |
| State Management | Signals | Zustand |
| CAD Kernel | c3d (C++) | OpenCASCADE via Tauri |
| IPC | In-process | Tauri invoke() |
| Components | Web Components | React + shadcn/ui |
| 3D Rendering | Three.js direct | React Three Fiber |

### 9.3 React Adaptations

**Gizmo as React Component**:

```tsx
// packages/gizmo/DistanceGizmo.tsx
interface DistanceGizmoProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

export function DistanceGizmo({ position, direction, value, onChange, onCommit }: DistanceGizmoProps) {
  const gizmoRef = useRef<THREE.Group>(null);
  const [state] = useState(() => new MagnitudeStateMachine(value));
  
  const bind = useGesture({
    onDrag: ({ movement: [, y], event }) => {
      const newValue = state.original + y * 0.01;
      state.current = newValue;
      onChange(newValue);
    },
    onDragEnd: () => {
      state.push();
      onCommit(state.current);
    }
  });
  
  return (
    <group ref={gizmoRef} position={position}>
      <mesh {...bind()}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
      <Line points={[[0, 0, 0], [0, value, 0]]} />
    </group>
  );
}
```

**Command as Hook**:

```tsx
// apps/desktop/src/commands/useExtrudeCommand.ts
export function useExtrudeCommand() {
  const { selectedFaces } = useModellerStore();
  const factory = useMemo(() => new ExtrudeFactory(), []);
  
  const execute = useCallback(async () => {
    if (selectedFaces.length === 0) {
      const picker = new ObjectPicker({ mode: SelectionMode.Face });
      const selection = await picker.execute();
      factory.faces = selection.faces;
    } else {
      factory.faces = selectedFaces;
    }
    
    // Show gizmo and dialog
    const controller = new AbortController();
    
    return {
      factory,
      abort: () => controller.abort(),
      commit: async () => {
        const result = await invoke('extrude', factory.toParams());
        factory.commit(result);
      }
    };
  }, [selectedFaces]);
  
  return { execute };
}
```

### 9.4 Tauri Integration

**Factory with Tauri Backend**:

```typescript
// packages/factory/ExtrudeFactory.ts
export class ExtrudeFactory extends GeometryFactory {
  faces: string[] = [];  // Face IDs
  distance1 = 0;
  distance2 = 0;
  
  async calculate(): Promise<MeshData> {
    // Call Rust backend
    return invoke<MeshData>('cad_extrude_preview', {
      faceIds: this.faces,
      distance1: this.distance1,
      distance2: this.distance2,
    });
  }
  
  async commit(): Promise<void> {
    await invoke('cad_extrude_commit', {
      faceIds: this.faces,
      distance1: this.distance1,
      distance2: this.distance2,
    });
  }
}
```

**Rust Backend**:

```rust
// crates/cadhy-cad/src/commands/extrude.rs
#[tauri::command]
pub async fn cad_extrude_preview(
    face_ids: Vec<String>,
    distance1: f64,
    distance2: f64,
    state: tauri::State<'_, CadState>,
) -> Result<MeshData, String> {
    let engine = state.engine.lock().await;
    engine.extrude_preview(&face_ids, distance1, distance2)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cad_extrude_commit(
    face_ids: Vec<String>,
    distance1: f64,
    distance2: f64,
    state: tauri::State<'_, CadState>,
) -> Result<(), String> {
    let mut engine = state.engine.lock().await;
    engine.extrude_commit(&face_ids, distance1, distance2)
        .map_err(|e| e.to_string())
}
```

### 9.5 Implementation Phases

**Phase 1: Core Infrastructure** (Week 1-2)
- [ ] CancellablePromise implementation
- [ ] ValueStateMachine classes
- [ ] Base GeometryFactory with Tauri
- [ ] GizmoStateMachine

**Phase 2: Gizmo System** (Week 3-4)
- [ ] AbstractGizmo base class (React Three)
- [ ] DistanceGizmo, AngleGizmo, LengthGizmo
- [ ] CompositeGizmo
- [ ] GizmoHelpers (NumberHelper, AxisHelper)

**Phase 3: Picker System** (Week 5-6)
- [ ] ObjectPicker with Zustand
- [ ] PointPicker with snap system
- [ ] Basic snaps (Point, Plane, Grid)
- [ ] SnapPresenter visualization

**Phase 4: Command System** (Week 7-8)
- [ ] Command base class
- [ ] Extrude command (full implementation)
- [ ] Boolean commands
- [ ] Fillet/Chamfer commands

**Phase 5: Dialog Integration** (Week 9-10)
- [ ] AbstractDialog as React component
- [ ] Parameter binding with Zustand
- [ ] Prompt system for sub-pickers
- [ ] Keyboard input integration

---

## Appendix: File References

| Pattern | Plasticity File | Lines |
|---------|-----------------|-------|
| Command | `src/command/Command.ts` | ~50 |
| Factory | `src/command/GeometryFactory.ts` | ~300 |
| AbstractGizmo | `src/command/AbstractGizmo.ts` | ~400 |
| CompositeGizmo | `src/command/CompositeGizmo.ts` | ~150 |
| MiniGizmos | `src/command/MiniGizmos.ts` | 753 |
| MultiFactory | `src/command/MultiFactory.ts` | 51 |
| ObjectPicker | `src/command/ObjectPicker.ts` | 335 |
| PointPicker | `src/command/point-picker/PointPicker.ts` | 339 |
| AbstractDialog | `src/command/AbstractDialog.ts` | 136 |
| FactoryBuilder | `src/command/FactoryBuilder.ts` | ~150 |
| KeyboardInterpreter | `src/command/KeyboardInterpreter.ts` | 42 |
| SnapPresenter | `src/command/SnapPresenter.ts` | 159 |
| Quasimode | `src/command/Quasimode.ts` | 59 |

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
