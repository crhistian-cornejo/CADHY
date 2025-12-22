# Desktop App Reorganization Plan

> Plan completo para reorganizar apps/desktop/src

## Fase 1: Limpieza de Carpetas Vacías

**Eliminar carpetas vacías:**
```bash
rm -rf apps/desktop/src/components/sidebar
rm -rf apps/desktop/src/components/tools
rm -rf apps/desktop/src/components/hydraulics
rm -rf apps/desktop/src/components/panels
rm -rf apps/desktop/src/components/viewer
```

## Fase 2: Consolidar Settings

**Antes:**
```
components/
├── settings/
│   ├── HotkeySettings.tsx
│   └── index.ts
└── layout/
    └── settings/
        ├── PrivacyTab.tsx
        ├── ProfileTab.tsx
        ├── AIProvidersTab.tsx
        └── ShortcutsTab.tsx
```

**Después:**
```
components/
└── layout/
    └── settings/
        ├── index.ts
        ├── PrivacyTab.tsx
        ├── ProfileTab.tsx
        ├── AIProvidersTab.tsx
        ├── ShortcutsTab.tsx
        └── HotkeySettings.tsx  (mover aquí)
```

**Acciones:**
- Mover `components/settings/HotkeySettings.tsx` → `components/layout/settings/`
- Eliminar `components/settings/`

## Fase 3: Reorganizar Modeller

**Antes:** 20+ archivos sueltos en `components/modeller/`

**Después:**
```
components/modeller/
├── index.ts
├── ModellerView.tsx         # Vista principal
│
├── panels/                   # Paneles laterales
│   ├── index.ts
│   ├── ToolsPanel.tsx
│   ├── LayersPanel.tsx
│   ├── MaterialsPanel.tsx
│   ├── NotificationsPanel.tsx
│   ├── CameraAnimationPanel.tsx
│   ├── DebugStatsPanel.tsx
│   ├── MeasurementToolsPanel.tsx
│   ├── PerformanceSettingsPanel.tsx
│   ├── SectionToolPanel.tsx
│   └── SnappingSettingsPanel.tsx
│
├── creators/                 # Creadores de objetos
│   ├── index.ts
│   ├── CreatePanel.tsx
│   ├── FloatingCreatePanel.tsx
│   ├── ChuteCreator.tsx
│   ├── TransitionCreator.tsx
│   └── BoxLoader.tsx
│
├── toolbars/                 # Barras de herramientas
│   ├── index.ts
│   ├── CADToolbar.tsx
│   ├── Menubar.tsx
│   ├── VerticalToolbar.tsx
│   ├── ViewportToolbar.tsx
│   ├── ViewportBottomToolbar.tsx
│   ├── MenuToolButton.tsx    (desde toolbar/)
│   ├── ToolButton.tsx        (desde toolbar/)
│   ├── ViewButton.tsx        (desde toolbar/)
│   └── use-container-width.ts
│
├── scene/                    # Gestión de escena
│   ├── index.ts
│   ├── ScenePanel.tsx
│   └── scene-utils.ts        (desde panels/)
│
├── camera/                   # Cámara y vistas
│   ├── index.ts
│   └── CameraViewsPopover.tsx
│
├── properties/               # Panel de propiedades (mantener estructura)
│   ├── index.ts
│   ├── PropertiesPanel.tsx   (ELIMINAR duplicado de modeller/)
│   ├── TextureMaterialPanel.tsx
│   ├── TextureMaterialPanelSimple.tsx
│   ├── panels/
│   ├── previews/
│   ├── sections/
│   ├── shared/
│   └── states/
│
├── transform/                # Transformaciones
│   ├── index.ts
│   └── FloatingTransformPanel.tsx
│
├── viewport/                 # Viewport 3D (mantener estructura)
│   ├── index.ts
│   ├── Viewport3D.tsx        (ELIMINAR duplicado de modeller/)
│   ├── ViewportOverlays.tsx
│   ├── ViewportSettingsPanel.tsx (mover aquí desde modeller/)
│   ├── SceneContent.tsx
│   ├── PostProcessing.tsx
│   ├── PlaybackControls.tsx
│   ├── SelectionBox.tsx
│   ├── SimpleSelectionBox.tsx
│   ├── RenderingToolbar.tsx
│   ├── geometry-utils.ts
│   ├── CommandProvider.tsx
│   ├── CommandContextBridge.tsx
│   ├── ActiveOperationRenderer.tsx
│   ├── CadIcons.tsx
│   └── meshes/
│
└── dialogs/                  # Diálogos
    ├── index.ts
    └── ActiveOperationDialog.tsx
```

## Fase 4: Nueva Estructura de Components

**Estructura final:**
```
components/
├── index.ts
├── ErrorBoundary.tsx        # Nivel raíz
│
├── __tests__/               # Tests de componentes
│
├── ai/                      # Panel de AI
│   ├── AIChatPanel.tsx
│   └── index.ts
│
├── command-palette/         # Paleta de comandos
│   ├── CommandPalette.tsx
│   └── index.ts
│
├── common/                  # Componentes comunes
│   ├── ErrorBoundary.tsx
│   ├── UpdateBadge.tsx
│   ├── UpdateDialog.tsx
│   └── index.ts
│
├── gallery/                 # Galería de proyectos
│   ├── GalleryView.tsx
│   └── index.ts
│
├── layout/                  # Layout principal
│   ├── index.ts
│   ├── AppLayout.tsx
│   ├── StatusBar.tsx
│   ├── WindowControls.tsx
│   ├── LogoDropdown.tsx
│   ├── WorkInProgress.tsx
│   ├── dialogs/             # Diálogos de layout
│   │   ├── index.ts
│   │   ├── AboutDialog.tsx
│   │   ├── HelpDialog.tsx
│   │   ├── SettingsDialog.tsx
│   │   ├── ProfileDialog.tsx
│   │   ├── PrivacySecurityDialog.tsx
│   │   ├── NotificationsDialog.tsx
│   │   ├── KeyboardShortcutsDialog.tsx
│   │   └── SetupInstructionsDialog.tsx
│   └── settings/            # Tabs de settings
│       ├── index.ts
│       ├── PrivacyTab.tsx
│       ├── ProfileTab.tsx
│       ├── AIProvidersTab.tsx
│       ├── ShortcutsTab.tsx
│       └── HotkeySettings.tsx (movido desde components/settings/)
│
├── modeller/                # Módulo de modelado (ver Fase 3)
│
├── onboarding/              # Onboarding
│   ├── OnboardingDialog.tsx
│   └── index.ts
│
├── project/                 # Proyectos
│   ├── index.ts
│   ├── ProjectsView.tsx
│   ├── ProjectCard.tsx
│   ├── AnimatedFolder.tsx
│   ├── NewProjectDialog.tsx
│   ├── OpenProjectDialog.tsx
│   ├── CreateFolderDialog.tsx
│   └── EditFolderDialog.tsx
│
└── results/                 # Resultados de análisis
    └── (futuro)
```

## Fase 5: Otras Carpetas

**commands/** - Nuevo patrón de comandos (mantener):
```
commands/
├── index.ts
├── box/
│   ├── index.ts
│   ├── BoxCommand.ts
│   └── BoxFactory.ts
└── point-picker/
    ├── index.ts
    └── PointPicker.ts
```

**lib/** - Utilidades compartidas (mantener):
```
lib/
└── icons/
    ├── index.ts
    ├── hugeicons.ts
    └── README.md
```

## Resumen de Acciones

### 1. Eliminar (5 carpetas vacías)
- [ ] `components/sidebar/`
- [ ] `components/tools/`
- [ ] `components/hydraulics/`
- [ ] `components/panels/`
- [ ] `components/viewer/`

### 2. Mover archivos

**Settings:**
- [ ] `components/settings/HotkeySettings.tsx` → `components/layout/settings/`
- [ ] Eliminar `components/settings/`

**Modeller - Crear carpetas:**
- [ ] `modeller/panels/` (para paneles ya existentes)
- [ ] `modeller/creators/`
- [ ] `modeller/toolbars/`
- [ ] `modeller/scene/`
- [ ] `modeller/camera/`
- [ ] `modeller/transform/`
- [ ] `modeller/dialogs/`

**Modeller - Mover archivos:**
- [ ] `modeller/ToolsPanel.tsx` → `modeller/panels/`
- [ ] `modeller/LayersPanel.tsx` → `modeller/panels/`
- [ ] `modeller/MaterialsPanel.tsx` → `modeller/panels/`
- [ ] `modeller/NotificationsPanel.tsx` → `modeller/panels/`
- [ ] `modeller/CameraAnimationPanel.tsx` → `modeller/panels/`
- [ ] `modeller/CreatePanel.tsx` → `modeller/creators/`
- [ ] `modeller/FloatingCreatePanel.tsx` → `modeller/creators/`
- [ ] `modeller/ChuteCreator.tsx` → `modeller/creators/`
- [ ] `modeller/TransitionCreator.tsx` → `modeller/creators/`
- [ ] `modeller/BoxLoader.tsx` → `modeller/creators/`
- [ ] `modeller/CADToolbar.tsx` → `modeller/toolbars/`
- [ ] `modeller/Menubar.tsx` → `modeller/toolbars/`
- [ ] `modeller/VerticalToolbar.tsx` → `modeller/toolbars/`
- [ ] `modeller/ViewportToolbar.tsx` → `modeller/toolbars/`
- [ ] `modeller/ViewportBottomToolbar.tsx` → `modeller/toolbars/`
- [ ] `modeller/toolbar/*` → `modeller/toolbars/`
- [ ] `modeller/ScenePanel.tsx` → `modeller/scene/`
- [ ] `modeller/panels/scene-utils.ts` → `modeller/scene/`
- [ ] `modeller/CameraViewsPopover.tsx` → `modeller/camera/`
- [ ] `modeller/FloatingTransformPanel.tsx` → `modeller/transform/`
- [ ] `modeller/ActiveOperationDialog.tsx` → `modeller/dialogs/`
- [ ] `modeller/ViewportSettingsPanel.tsx` → `modeller/viewport/`

**Layout - Crear carpeta:**
- [ ] `layout/dialogs/`

**Layout - Mover archivos:**
- [ ] `layout/AboutDialog.tsx` → `layout/dialogs/`
- [ ] `layout/HelpDialog.tsx` → `layout/dialogs/`
- [ ] `layout/SettingsDialog.tsx` → `layout/dialogs/`
- [ ] `layout/ProfileDialog.tsx` → `layout/dialogs/`
- [ ] `layout/PrivacySecurityDialog.tsx` → `layout/dialogs/`
- [ ] `layout/NotificationsDialog.tsx` → `layout/dialogs/`
- [ ] `layout/KeyboardShortcutsDialog.tsx` → `layout/dialogs/`
- [ ] `layout/SetupInstructionsDialog.tsx` → `layout/dialogs/`

### 3. Eliminar duplicados

- [ ] ELIMINAR `modeller/PropertiesPanel.tsx` (mantener `modeller/properties/PropertiesPanel.tsx`)
- [ ] ELIMINAR `modeller/Viewport3D.tsx` (mantener `modeller/viewport/Viewport3D.tsx`)

### 4. Actualizar imports

Después de mover archivos, actualizar todos los imports en:
- [ ] Componentes que importan desde modeller
- [ ] Componentes que importan desde layout
- [ ] Archivos index.ts afectados

### 5. Crear archivos index.ts

Para cada nueva carpeta:
- [ ] `modeller/panels/index.ts`
- [ ] `modeller/creators/index.ts`
- [ ] `modeller/toolbars/index.ts`
- [ ] `modeller/scene/index.ts`
- [ ] `modeller/camera/index.ts`
- [ ] `modeller/transform/index.ts`
- [ ] `modeller/dialogs/index.ts`
- [ ] `layout/dialogs/index.ts`

## Beneficios

1. **Organización clara**: Todo agrupado por función
2. **Fácil navegación**: Menos archivos sueltos
3. **Mejor mantenibilidad**: Estructura predecible
4. **Mejor imports**: Rutas más claras
5. **Elimina duplicados**: Sin archivos redundantes
6. **Limpia carpetas vacías**: Reduce ruido
