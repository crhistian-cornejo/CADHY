# Plan de Reorganización - apps/desktop

## Resumen Ejecutivo

Este documento propone una reorganización estructural de `apps/desktop/src` basada en:
1. Análisis de la estructura actual (210 archivos TS/TSX, 56,889 líneas)
2. Patrones exitosos de Plasticity CAD
3. Best practices de arquitectura frontend

## Objetivos

- ✅ Reducir componentes monolíticos (>500 líneas)
- ✅ Eliminar duplicación de código
- ✅ Mejorar navegabilidad y mantenibilidad
- ✅ Preparar para escalabilidad futura
- ✅ Aplicar patrones probados de Plasticity

## Hallazgos Clave

### ✅ Fortalezas Actuales

1. **Store con Slices** - Zustand bien organizado en modeller/
2. **Properties Panel** - Excelente estructura jerárquica
3. **Barrel Exports** - Buen uso de index.ts
4. **Services Especializados** - Responsabilidades claras

### 🔴 Problemas Críticos

1. **Componentes Monolíticos**
   - `CreatePanel.tsx`: 1,563 líneas
   - `ViewportToolbar.tsx`: 1,563 líneas
   - `Menubar.tsx`: 1,068 líneas
   - `useAIChat.ts`: 3,360 líneas

2. **Duplicación de Toolbars**
   - 4 toolbars diferentes con lógica similar
   - Código repetido entre componentes

3. **Carpetas Vacías**
   - `components/panels/` - vacío
   - `components/sidebar/` - vacío
   - `components/tools/` - vacío
   - `components/viewer/` - vacío

4. **Inconsistencia en Estructura**
   - Properties bien organizado vs Modeller desorganizado
   - Naming inconsistente (Panel suffix)

## Propuesta de Reorganización

### Fase 1: Limpieza Inmediata (1-2 horas)

#### 1.1 Eliminar Carpetas Vacías

```bash
rm -rf apps/desktop/src/components/panels
rm -rf apps/desktop/src/components/sidebar
rm -rf apps/desktop/src/components/tools
rm -rf apps/desktop/src/components/viewer
```

#### 1.2 Crear Estructura de Iconos (✅ COMPLETADO)

```
apps/desktop/src/lib/icons/
├── hugeicons.ts        # 4,655 iconos categorizados
├── index.ts            # Re-exports
└── README.md           # Documentación
```

### Fase 2: Refactorización de Componentes Monolíticos (4-6 horas)

#### 2.1 CreatePanel.tsx (1,563 → ~300 líneas)

**Estructura Propuesta:**

```
components/modeller/create-panel/
├── CreatePanel.tsx                 # Orquestador principal (~150 líneas)
├── sections/
│   ├── PrimitivesSection.tsx      # Cubos, esferas, cilindros
│   ├── HydraulicsSection.tsx      # Canales, chutes, transiciones
│   ├── ImportSection.tsx          # Importar modelos
│   └── RecentSection.tsx          # Acciones recientes
├── components/
│   ├── PrimitiveButton.tsx        # Botón para primitivas
│   ├── ParameterForm.tsx          # Form de parámetros
│   └── QuickCreateHint.tsx        # Tooltip de ayuda
└── index.ts
```

**Patrón de Plasticity aplicado:**
- Separación Command (UI) + Factory (Lógica)
- Cada sección es independiente
- Componentes reutilizables

#### 2.2 ViewportToolbar.tsx (1,563 → ~200 líneas)

**Estructura Propuesta:**

```
components/modeller/viewport-toolbar/
├── ViewportToolbar.tsx             # Orquestador (~100 líneas)
├── sections/
│   ├── TransformTools.tsx         # Move, rotate, scale
│   ├── ViewControls.tsx           # Camera, orbit, zoom
│   ├── DisplayModes.tsx           # Wireframe, shaded, etc
│   ├── SnapControls.tsx           # Snapping options
│   └── MeasurementTools.tsx       # Measurement
├── components/
│   ├── ToolButton.tsx             # Botón genérico
│   ├── MenuToolButton.tsx         # Botón con dropdown
│   └── ViewButton.tsx             # Botón de vista
└── index.ts
```

#### 2.3 Menubar.tsx (1,068 → ~300 líneas)

**Estructura Propuesta:**

```
components/modeller/menubar/
├── Menubar.tsx                     # Orquestador (~150 líneas)
├── menus/
│   ├── FileMenu.tsx               # File operations
│   ├── EditMenu.tsx               # Edit operations
│   ├── ViewMenu.tsx               # View options
│   ├── CreateMenu.tsx             # Create objects
│   ├── ModifyMenu.tsx             # Modify operations
│   └── HelpMenu.tsx               # Help & about
├── components/
│   ├── MenuDropdown.tsx           # Dropdown wrapper
│   ├── MenuItem.tsx               # Menu item
│   └── MenuSeparator.tsx          # Separator
└── index.ts
```

#### 2.4 useAIChat.ts (3,360 → ~600 líneas total)

**Estructura Propuesta:**

```
hooks/ai-chat/
├── useAIChat.ts                    # Main hook (~150 líneas)
├── useAIChatMessages.ts            # Message management (~200 líneas)
├── useAIChatTools.ts               # Tool execution (~200 líneas)
├── useAIChatCommands.ts            # Command handling (~150 líneas)
├── useAIChatPersistence.ts         # Save/load chat (~100 líneas)
└── index.ts
```

### Fase 3: Unificación de Toolbars (2-3 horas)

**Problema:**
- `ViewportToolbar.tsx` - 1,563 líneas
- `VerticalToolbar.tsx` - 406 líneas
- `ViewportBottomToolbar.tsx` - 293 líneas
- `CADToolbar.tsx` - 669 líneas

**Solución:**
Crear sistema unificado de toolbars reutilizables

```
components/modeller/toolbars/
├── index.ts
├── Toolbar.tsx                     # Componente base genérico
├── ToolbarSection.tsx              # Sección de toolbar
├── ToolButton.tsx                  # Botón unificado
├── presets/
│   ├── ViewportToolbar.tsx        # Configuración viewport
│   ├── VerticalToolbar.tsx        # Configuración vertical
│   ├── BottomToolbar.tsx          # Configuración bottom
│   └── CADToolbar.tsx             # Configuración CAD
└── tools/
    ├── TransformTools.tsx         # Herramientas de transformación
    ├── ViewTools.tsx              # Herramientas de vista
    ├── SnapTools.tsx              # Herramientas de snap
    └── MeasureTools.tsx           # Herramientas de medición
```

### Fase 4: Creators Refactorización (2-3 horas)

**Problema:**
- `ChuteCreator.tsx` - 875 líneas
- `TransitionCreator.tsx` - 742 líneas

**Solución:**

```
components/modeller/creators/
├── shared/
│   ├── CreatorDialog.tsx          # Dialog base
│   ├── ParameterInput.tsx         # Input genérico
│   ├── TypeSelector.tsx           # Selector de tipo
│   └── PreviewPane.tsx            # Preview panel
├── chute/
│   ├── ChuteCreator.tsx           # Orquestador (~150 líneas)
│   ├── ChuteTypeSelector.tsx      # Selector de tipo
│   ├── ChuteParameters.tsx        # Parámetros
│   └── ChutePreview.tsx           # Preview SVG
└── transition/
    ├── TransitionCreator.tsx      # Orquestador (~150 líneas)
    ├── TransitionTypeSelector.tsx # Selector de tipo
    ├── TransitionParameters.tsx   # Parámetros
    └── TransitionPreview.tsx      # Preview SVG
```

### Fase 5: Estructura Ideal a Largo Plazo (Futuro)

**Feature-Based Organization:**

```
apps/desktop/src/
├── features/                       # Features principales
│   ├── modeller/                  # Feature CAD Modeller
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── projects/                  # Feature Projects
│   ├── ai-chat/                   # Feature AI Chat
│   ├── gallery/                   # Feature Gallery
│   └── hydraulics/                # Feature Hydraulics
├── shared/                         # Shared code
│   ├── components/
│   │   ├── ui/                    # UI components
│   │   ├── common/                # Common components
│   │   └── layout/                # Layout components
│   ├── hooks/                     # Shared hooks
│   ├── utils/                     # Utilities
│   └── types/                     # Shared types
├── core/                           # Core infrastructure
│   ├── services/                  # Core services
│   ├── stores/                    # Global stores
│   └── i18n/                      # Internalization
└── lib/                            # External libs wrappers
    ├── icons/                     # Icons (✅ DONE)
    ├── three/                     # Three.js helpers
    └── tauri/                     # Tauri helpers
```

## Patrones de Plasticity a Adoptar

### 1. Command Pattern

```typescript
// Inspirado en Plasticity
abstract class Command {
  abstract execute(): Promise<void>;
  remember: boolean = true;  // Para UNDO
}

class ExtrudeCommand extends Command {
  async execute() {
    const factory = new ExtrudeFactory(this.params);
    await factory.commit();
  }
}
```

### 2. Factory Pattern

```typescript
// Inspirado en Plasticity
abstract class GeometryFactory {
  async calculate(): Promise<Geometry>;
  async update(): Promise<TemporaryObject[]>;
  async commit(): Promise<FinalObject>;
}
```

### 3. Gizmo System

```typescript
// Inspirado en Plasticity
abstract class AbstractGizmo<T> {
  handle: THREE.Group;
  picker: THREE.Group;

  abstract onPointerMove(info: PointerInfo): T | undefined;
  abstract onPointerDown(info: PointerInfo): void;
  abstract onPointerUp(info: PointerInfo): void;
}
```

## Plan de Implementación

### Sprint 1: Limpieza y Fundamentos (2-3 días)

- [x] Sistema de iconos centralizado
- [ ] Eliminar carpetas vacías
- [ ] Refactorizar CreatePanel
- [ ] Refactorizar ViewportToolbar

### Sprint 2: Unificación (2-3 días)

- [ ] Unificar sistema de toolbars
- [ ] Refactorizar Menubar
- [ ] Crear componentes compartidos de toolbar

### Sprint 3: Hooks y Creators (2-3 días)

- [ ] Dividir useAIChat hook
- [ ] Refactorizar ChuteCreator
- [ ] Refactorizar TransitionCreator

### Sprint 4: Patrones de Plasticity (3-4 días)

- [ ] Implementar Command pattern
- [ ] Implementar Factory pattern
- [ ] Implementar Gizmo system base

### Sprint 5: Feature-Based (Opcional, futuro)

- [ ] Migrar a feature-based organization
- [ ] Consolidar features
- [ ] Documentar arquitectura

## Métricas de Éxito

| Métrica | Actual | Objetivo | Medición |
|---------|--------|----------|----------|
| Archivos >500 líneas | 8 | 0 | Análisis estático |
| Carpetas vacías | 4 | 0 | `find` command |
| Profundidad máxima | 5 niveles | 4 niveles | Análisis de árbol |
| Componentes reutilizables | ~30% | >60% | Code review |
| Duplicación de código | Media | Baja | SonarQube/ESLint |

## Beneficios Esperados

### Corto Plazo (1-2 semanas)

- ✅ **Mantenibilidad** - Componentes más pequeños, más fáciles de entender
- ✅ **Navegabilidad** - Estructura clara y predecible
- ✅ **Testing** - Componentes pequeños más fáciles de testear
- ✅ **Performance** - Mejor code splitting

### Largo Plazo (1-3 meses)

- ✅ **Escalabilidad** - Feature-based organization
- ✅ **Colaboración** - Equipos pueden trabajar en features independientes
- ✅ **Onboarding** - Nuevos devs entienden estructura más rápido
- ✅ **Reutilización** - Patrones claros y componentes compartidos

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking changes | Alta | Alto | Tests comprehensivos pre-refactor |
| Time overrun | Media | Medio | Implementar por fases |
| Team resistance | Baja | Alto | Documentar beneficios, demos |
| Regression bugs | Media | Alto | Extensive QA, staged rollout |

## Conclusión

La reorganización propuesta:
- ✅ Elimina componentes monolíticos
- ✅ Reduce duplicación de código
- ✅ Mejora mantenibilidad
- ✅ Aplica patrones probados de Plasticity
- ✅ Prepara para escalabilidad futura

**Recomendación:** Implementar por fases, empezando con Sprint 1 (fundamentos) y evaluar resultados antes de continuar.

---

**Generado:** 2025-12-21
**Autor:** Claude Code
**Versión:** 1.0
