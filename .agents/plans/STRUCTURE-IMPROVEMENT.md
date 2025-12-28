# CADHY Desktop - Improved Structure

## Problem: Too Many Root Folders (16)

Current:
```
src/
├── __tests__/
├── app/
├── assets/
├── commands/
├── editors/
├── hooks/          ← Should be in lib/
├── i18n/
├── interface/
├── kernel/         ← Should be in core/
├── lib/
├── operators/
├── render/
├── services/       ← Should be in core/
├── stores/         ← Should be in core/
├── types/          ← Should be in core/
└── windowmanager/
```

## Solution: Hierarchical Grouping (9 Root Folders)

```
src/
├── app/                    # Entry point only
├── assets/                 # Static assets
├── i18n/                   # Translations
│
├── core/                   # 🆕 Core infrastructure
│   ├── kernel/             # KE_* - Data operations
│   ├── stores/             # ST_* - State management
│   │   └── slices/
│   ├── services/           # SV_* - Backend services
│   └── types/              # Type definitions
│
├── blender/                # 🆕 Blender-style modules
│   ├── editors/            # ED_* - Editor spaces
│   │   ├── space_view3d/
│   │   ├── space_properties/
│   │   ├── space_outliner/
│   │   ├── space_timeline/
│   │   ├── space_drawing/
│   │   ├── space_projects/
│   │   ├── space_results/
│   │   ├── space_gallery/
│   │   ├── space_ai/
│   │   └── space_cadras/
│   ├── operators/          # OP_* - Operations
│   │   ├── create/
│   │   ├── transform/
│   │   ├── context/
│   │   └── interactive/
│   ├── render/             # RE_* - Rendering
│   │   ├── meshes/
│   │   ├── cache/
│   │   └── pool/
│   ├── windowmanager/      # WM_* - Window management
│   ├── gpu/                # GPU_* - GPU abstraction (NEW)
│   └── modifiers/          # MOD_* - Modifiers (NEW)
│
├── interface/              # UI_* - UI components
│   ├── common/
│   ├── dialogs/
│   ├── settings/
│   ├── onboarding/
│   └── properties/
│
├── lib/                    # Shared utilities
│   ├── icons/              # IC_* - Icons
│   ├── utils/              # UT_* - Utilities
│   └── hooks/              # React hooks (moved here)
│
├── commands/               # Command system
│
└── __tests__/              # Tests
```

## Benefits

1. **Clearer hierarchy**: 9 root folders instead of 16
2. **Logical grouping**:
   - `core/` = infrastructure (kernel, stores, services, types)
   - `blender/` = Blender-style modules
   - `lib/` = shared utilities
3. **Scalable**: Easy to add new modules under blender/
4. **Import clarity**: `@/core/stores` vs `@/stores`

## Migration Steps

1. Create `core/` and move kernel, stores, services, types
2. Create `blender/` and move editors, operators, render, windowmanager
3. Move hooks/ under lib/
4. Update all imports
5. Update tsconfig paths

## Alternative: Simpler Grouping

If `blender/` folder seems odd:

```
src/
├── app/
├── assets/
├── i18n/
├── core/               # Infrastructure
│   ├── kernel/
│   ├── stores/
│   ├── services/
│   └── types/
├── editors/            # Keep at root
├── operators/          # Keep at root
├── render/             # Keep at root
├── windowmanager/      # Keep at root
├── interface/
├── lib/
│   ├── icons/
│   ├── utils/
│   └── hooks/
├── commands/
└── __tests__/
```

This gives 12 root folders (vs 16 current) - simpler migration.
