# CADHY Project Memories

## Base UI Button Bug (December 2024)

### Problem
Base UI's `Button` component from `@base-ui/react/button` **always overrides `type` prop to `"button"`**.

**Root Cause**: In `useButton.js` hook (line 79-81):
```javascript
const type = isNativeButton ? 'button' : undefined;
return mergeProps({
  type,  // Forces type="button"
  ...
});
```

Since `isNativeButton` defaults to `true`, any `<Button type="submit">` becomes `type="button"`, breaking form submissions.

### Solution
Created custom native Button component in `packages/ui/src/components/button.tsx`:
- Uses native `<button>` element instead of Base UI's ButtonPrimitive
- Respects `type` prop correctly (`submit`, `button`, `reset`)
- Supports `render` prop for composition (links, triggers)
- Uses `React.forwardRef` for ref forwarding
- Maintains exact same CVA styling variants

### Files Modified
- `packages/ui/src/components/button.tsx` - Rewritten to use native button
- `packages/ui/src/components/pagination.tsx` - Removed `nativeButton={false}` prop

---

## Chat Store Session Initialization Bug (December 2024)

### Problem
AI Chat panel wasn't sending messages - clicking send button or pressing Enter did nothing.

**Root Cause**: In `useAIChat.ts` (line 347):
```javascript
if (!messageContent || isLoading || !currentSessionId) return;
```

`currentSessionId` was `null` because `loadSessions()` was only called when project changed (via `useProjectStore.subscribe`). If no project was open, sessions were never initialized.

### Solution
Added `useEffect` in `AIChatPanel.tsx` to initialize sessions on mount:
```tsx
useEffect(() => {
  if (!currentSessionId) {
    loadSessions()
  }
}, [currentSessionId, loadSessions])
```

This ensures a session exists even without an open project (creates in-memory session).

### Files Modified
- `apps/desktop/src/components/ai/AIChatPanel.tsx` - Added session initialization on mount

---

## TooltipTrigger asChild Wrapper (December 2024)

### Context
Base UI 1.0 uses `render` prop instead of Radix's `asChild` pattern.

### Solution
Created wrapper in `packages/ui/src/components/tooltip.tsx` that accepts `asChild` prop and internally converts to `render`:
```tsx
function TooltipTrigger({ asChild, children, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return (
      <TooltipPrimitive.Trigger 
        render={children}
        {...props} 
      />
    )
  }
  // ... fallback to normal children
}
```

Same pattern applied to: `DialogTrigger`, `PopoverTrigger`, `SheetTrigger`, `AlertDialogTrigger`, `ContextMenuTrigger`, `CollapsibleTrigger`, `HoverCardTrigger`.

---

## Key Learnings

1. **Always verify root cause** - The submit button "not working" had TWO issues: Base UI's type override AND missing session initialization. Fixing only one wouldn't have solved it.

2. **Base UI quirks** - Base UI 1.0 has different patterns than Radix (render vs asChild). Watch out for their internal prop handling.

3. **Session/state initialization** - Components that depend on store state need to ensure that state is initialized, especially for optional dependencies like "current project".

---

## Viewport3D Modular Refactoring (December 2024)

### Problem
The original `Viewport3D.tsx` was a 1631-line monolithic component containing:
- Canvas setup and scene management
- Coordinate conversion utilities
- All mesh rendering components (ChannelMesh, TransitionMesh, SceneObjectMesh)
- Camera controls and helpers

This violated single responsibility principle and made maintenance difficult.

### Solution
Refactored into modular structure under `apps/desktop/src/components/modeller/viewport/`:

```
modeller/
├── Viewport3D.tsx           # Re-export only (8 lines, backward compatible)
└── viewport/
    ├── index.ts             # Barrel export
    ├── Viewport3D.tsx       # Canvas wrapper (~90 lines)
    ├── SceneContent.tsx     # Scene elements (~510 lines)
    ├── geometry-utils.ts    # Coordinate conversion (~313 lines)
    └── meshes/
        ├── index.ts         # Barrel export
        ├── ChannelMesh.tsx  # Channel rendering (~228 lines)
        ├── TransitionMesh.tsx # Transition rendering (~227 lines)
        └── SceneObjectMesh.tsx # Object router (~317 lines)
```

### Key Decisions
1. **Backward compatibility**: Original `Viewport3D.tsx` re-exports from new location
2. **Barrel exports**: Each folder has `index.ts` for clean imports
3. **Separation of concerns**: 
   - `geometry-utils.ts`: Pure functions for coordinate math
   - `meshes/`: Individual mesh components per object type
   - `SceneContent.tsx`: Scene composition and state management

### Files Created
- `apps/desktop/src/components/modeller/viewport/index.ts`
- `apps/desktop/src/components/modeller/viewport/Viewport3D.tsx`
- `apps/desktop/src/components/modeller/viewport/SceneContent.tsx`
- `apps/desktop/src/components/modeller/viewport/geometry-utils.ts`
- `apps/desktop/src/components/modeller/viewport/meshes/index.ts`
- `apps/desktop/src/components/modeller/viewport/meshes/ChannelMesh.tsx`
- `apps/desktop/src/components/modeller/viewport/meshes/TransitionMesh.tsx`
- `apps/desktop/src/components/modeller/viewport/meshes/SceneObjectMesh.tsx`

### Files Modified
- `apps/desktop/src/components/modeller/Viewport3D.tsx` - Now just re-exports

---

## Gemini OAuth Tauri Command (December 2024)

### Context
CADHY supports Gemini AI models via OAuth authentication. Users can authenticate with their Google account using the Gemini CLI, and CADHY reads those cached credentials.

### Implementation

**Rust Backend** (`apps/desktop/src-tauri/src/auth/gemini.rs`):
```rust
#[tauri::command]
pub fn auth_check_gemini_oauth() -> GeminiOAuthStatus {
    // Checks ~/.gemini/oauth_creds.json
    // Returns: hasCredentials, isValid, isExpired, expiresAt, error
}
```

**TypeScript Wrapper** (`packages/ai/src/providers/gemini-cli.ts`):
```typescript
// Uses dynamic import to avoid bundling @tauri-apps/api in non-Tauri contexts
export async function checkGeminiOAuthCredentials(): Promise<GeminiOAuthStatus> {
  try {
    const importFn = new Function('specifier', 'return import(specifier)')
    const tauriCore = await importFn('@tauri-apps/api/core')
    return await tauriCore.invoke('auth_check_gemini_oauth')
  } catch {
    // Fallback for non-Tauri environments (tests, web)
    return { hasCredentials: false, isValid: false, error: 'Not in Tauri context', ... }
  }
}
```

### Key Decisions
1. **Dynamic import pattern**: Uses `new Function()` to avoid static analysis bundling Tauri in web builds
2. **Graceful fallback**: Returns safe defaults when not in Tauri context
3. **Comprehensive status**: Returns detailed info (expiry, validity, path) not just boolean

### Testing Pattern
Since tests run outside Tauri, we test:
1. Module exports and type correctness
2. Fallback behavior in non-Tauri context
3. Helper functions with injected inputs

Tests in `packages/ai/src/__tests__/gemini-cli.test.ts` (26 tests).

### Files Created/Modified
- `apps/desktop/src-tauri/src/auth/gemini.rs` - Rust command
- `apps/desktop/src-tauri/src/auth/mod.rs` - Module export
- `packages/ai/src/providers/gemini-cli.ts` - TypeScript wrapper
- `packages/ai/src/__tests__/gemini-cli.test.ts` - Tests

---

## macOS Standalone Distribution - OCCT Dylib Bundling (December 2024)

### Problem
macOS release builds crashed on launch for users without Homebrew OCCT installed. Error:
```
dyld: Library not loaded: /opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib
  Referenced from: /Applications/CADHY.app/Contents/MacOS/CADHY
  Reason: image not found
```

**Root Cause**: Rust linker embeds absolute Homebrew paths during compile time. The binary expects OCCT libraries at `/opt/homebrew/opt/opencascade/lib/`, which doesn't exist on machines without Homebrew or OCCT.

### Solution
Bundle all 37 dylibs in the app's `Frameworks/` directory with relative paths.

**Files Created**:
1. `scripts/occt/copy-dylibs-macos.sh` - Copies dylibs from Homebrew to `frameworks/`
2. `scripts/occt/fix-dylib-paths-macos.sh` - Rewrites paths using `install_name_tool` and re-signs

**Files Modified**:
1. `apps/desktop/src-tauri/tauri.macos.conf.json` - Lists all 37 frameworks to bundle
2. `crates/cadhy-cad/build.rs` - Added rpath linker flag for runtime search path
3. `.github/workflows/release-app.yml` - Added CI steps for dylib handling
4. `.gitignore` - Ignore `frameworks/` directory

**37 Dylibs Bundled**:
- 33 OCCT libs: libTKernel, libTKMath, libTKG2d, libTKG3d, libTKGeomBase, libTKBRep, libTKGeomAlgo, libTKTopAlgo, libTKPrim, libTKBO, libTKFillet, libTKOffset, libTKFeat, libTKMesh, libTKShHealing, libTKHLR, libTKService, libTKV3d, libTKOpenGl, libTKXSBase, libTKSTEP, libTKSTEP209, libTKSTEPAttr, libTKSTEPBase, libTKIGES, libTKXCAF, libTKXDESTEP, libTKXDEIGES, libTKCAF, libTKLCAF, libTKCDF, libTKBinL, libTKBin
- 4 dependencies: libfreetype.6, libpng16.16, libtbb.12, libtbbmalloc.2

**Key Technical Details**:
```bash
# Path rewriting
install_name_tool -change \
  "/opt/homebrew/opt/opencascade/lib/libTKernel.7.9.dylib" \
  "@executable_path/../Frameworks/libTKernel.7.9.dylib" \
  "$APP_BINARY"

# Must re-sign after modification (invalidates code signature)
codesign --force --sign - "$DYLIB"
```

### Key Learnings
1. **Always test release builds on clean machines** - Dev machines have all dependencies installed
2. **install_name_tool requires re-signing** - Modifying Mach-O binaries invalidates signatures
3. **CI can use ad-hoc signing** - Use `-` as identity for unsigned apps in CI
4. **Use rpath for flexibility** - Adding `-Wl,-rpath,@executable_path/../Frameworks` helps runtime loader

---

## React Initialization Bugs - TDZ and Optional Chaining (December 2024)

### Problem 1: Temporal Dead Zone in OpenProjectDialog

`handleOpenProject` was used in `handleBrowse` before being declared, causing a reference error.

**Original Code (broken)**:
```typescript
const handleBrowse = async () => {
  // ... file selection ...
  await handleOpenProject(selected)  // ❌ handleOpenProject not defined yet!
}

const handleOpenProject = async (projectPath: string) => {
  // ...
}
```

**Fix**:
```typescript
const handleOpenProject = async (projectPath: string) => {
  // ... moved BEFORE handleBrowse
}

const handleBrowse = async () => {
  // ... now handleOpenProject is defined
  await handleOpenProject(selected)  // ✅ Works
}
```

**File**: `apps/desktop/src/components/project/OpenProjectDialog.tsx`

### Problem 2: Missing Optional Chaining in AIChatPanel

useEffect dependency array referenced `currentProject.name` without optional chaining, causing error when no project was open.

**Original Code (broken)**:
```typescript
useEffect(() => {
  // ...
}, [currentProject.name])  // ❌ Crashes if currentProject is undefined
```

**Fix**:
```typescript
useEffect(() => {
  // ...
}, [currentProject?.name])  // ✅ Safe
```

**File**: `apps/desktop/src/components/ai/AIChatPanel.tsx`

### Key Learnings
1. **Always use optional chaining** for potentially undefined objects in deps arrays
2. **Function declaration order matters** in the same scope for arrow functions
3. **Both issues only manifested in release builds** - development mode had different initialization order
