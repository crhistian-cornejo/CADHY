# Evaluación: Sistema de Planos Automáticos

> **Fecha**: 2025-12-24
> **Objetivo**: Evaluar la dificultad de implementar un sistema de planos técnicos automáticos similar a Shapr3D

---

## 📊 Resumen Ejecutivo

**Dificultad General**: ⭐⭐⭐ (Media-Alta)
**Tiempo Estimado**: 6-8 semanas (1 desarrollador full-time)
**Complejidad Principal**: Renderizado 2D y sistema de acotado interactivo

### ✅ Lo que YA existe (Ventajas)

1. **Módulo de Proyección 2D** (`crates/cadhy-cad/src/projection.rs`)
   - ✅ HLR (Hidden Line Removal) funcional con OpenCASCADE
   - ✅ Múltiples tipos de vista: Top, Front, Right, Left, Isometric
   - ✅ Clasificación de líneas (visible, hidden, smooth, outline)
   - ✅ Función `project_shape()` lista para usar
   - ✅ Función `generate_standard_views()` para múltiples vistas

2. **Módulo de Dimensiones** (`crates/cadhy-cad/src/dimensions.rs`)
   - ✅ Tipos de dimensiones: Linear, Horizontal, Vertical, Angular, Radial, Diameter
   - ✅ Generación automática de dimensiones (`AutoDimensioner`)
   - ✅ Estructuras completas para extension lines, dimension lines, arrows
   - ✅ Formateo de valores y etiquetas

3. **Infraestructura Existente**
   - ✅ Sistema de comandos Tauri establecido
   - ✅ Sistema de selección de objetos funcional
   - ✅ Sistema de diálogos y paneles (Dialog, FloatingPanel)
   - ✅ Store management con Zustand
   - ✅ Sistema de notificaciones/toasts

---

## 🔴 Lo que FALTA (Desafíos)

### 1. Comandos Tauri para Proyecciones (Complejidad: ⭐⭐)

**Estado**: No existen comandos para generar proyecciones desde el frontend

**Necesario**:
```rust
// En src-tauri/src/commands/drawing.rs (nuevo archivo)
#[tauri::command]
pub fn cad_create_projection(
    shape_id: String,
    view_type: ProjectionType,
    scale: f64,
) -> Result<ProjectionResult, String>

#[tauri::command]
pub fn cad_generate_standard_views(
    shape_id: String,
    scale: f64,
) -> Result<Vec<ProjectionResult>, String>
```

**Esfuerzo**: 1-2 días
- Crear nuevo archivo de comandos
- Exponer funciones existentes de `projection.rs`
- Agregar al registro de comandos en `lib.rs`

---

### 2. Sistema de Gestión de Dibujos (Complejidad: ⭐⭐⭐)

**Estado**: No existe concepto de "Drawing" o "Sheet" en el sistema

**Necesario**:

#### Backend (Rust):
```rust
// En crates/cadhy-cad/src/drawing.rs (nuevo módulo)
pub struct Drawing {
    pub id: String,
    pub name: String,
    pub sheet_config: SheetConfig,
    pub views: Vec<DrawingView>,
    pub dimensions: DimensionSet,
}

pub struct SheetConfig {
    pub orientation: Orientation, // Vertical/Horizontal
    pub size: PaperSize, // ISO A3, A4, etc.
    pub scale: f64,
    pub projection_angle: ProjectionAngle, // First/Third angle
    pub units: String,
}
```

#### Frontend (TypeScript):
```typescript
// En stores/drawing-store.ts (nuevo store)
interface DrawingStore {
  drawings: Drawing[]
  activeDrawingId: string | null

  createDrawing: (shapeIds: string[], config: SheetConfig) => string
  addView: (drawingId: string, view: ProjectionType) => void
  updateSheetConfig: (drawingId: string, config: Partial<SheetConfig>) => void
}
```

**Esfuerzo**: 3-4 días
- Diseñar estructura de datos
- Implementar store de Zustand
- Persistencia en proyecto (.cadhy file)

---

### 3. Viewport 2D para Planos (Complejidad: ⭐⭐⭐⭐)

**Estado**: Solo existe viewport 3D (Three.js). No hay renderizador 2D

**Necesario**:

#### Opción A: Canvas 2D (Recomendado)
```typescript
// En packages/viewer/src/Viewport2D.tsx (nuevo componente)
export function Viewport2D({ drawing }: { drawing: Drawing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // Renderizar líneas de proyección
    drawing.views.forEach(view => {
      view.projection.lines.forEach(line => {
        ctx.strokeStyle = getLineColor(line.line_type)
        ctx.setLineDash(getDashArray(line.line_type))
        ctx.beginPath()
        ctx.moveTo(line.start.x, line.start.y)
        ctx.lineTo(line.end.x, line.end.y)
        ctx.stroke()
      })
    })

    // Renderizar dimensiones
    drawing.dimensions.dimensions.forEach(dim => {
      renderDimension(ctx, dim)
    })
  }, [drawing])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
```

#### Opción B: SVG (Alternativa)
- Más fácil para escalado y exportación
- Mejor para interactividad (selección de líneas)
- Requiere librería como `react-svg` o `@svgdotjs/svg.js`

**Esfuerzo**: 5-7 días
- Implementar renderizador Canvas o SVG
- Sistema de coordenadas y transformaciones
- Zoom y pan
- Grid y título de hoja

---

### 4. Diálogo de Configuración de Hoja (Complejidad: ⭐⭐)

**Estado**: Existen diálogos similares, pero no específico para planos

**Necesario**:
```typescript
// En components/modeller/dialogs/DrawingConfigDialog.tsx
export function DrawingConfigDialog({
  open,
  onClose,
  onConfirm,
}: DrawingConfigDialogProps) {
  const [config, setConfig] = useState<SheetConfig>({
    orientation: 'horizontal',
    size: 'A3',
    scale: 1.0,
    projectionAngle: 'first',
    units: 'm',
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="lg">
        {/* Orientación */}
        <div>
          <Label>Orientación</Label>
          <div className="flex gap-2">
            <Button variant={config.orientation === 'vertical' ? 'default' : 'outline'}>
              Vertical
            </Button>
            <Button variant={config.orientation === 'horizontal' ? 'default' : 'outline'}>
              Horizontal
            </Button>
          </div>
        </div>

        {/* Tamaño de hoja */}
        <Select value={config.size} onValueChange={...}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A3">ISO A3 (420 x 297 mm)</SelectItem>
            <SelectItem value="A4">ISO A4 (210 x 297 mm)</SelectItem>
            {/* ... */}
          </SelectContent>
        </Select>

        {/* Escala */}
        <InputNumber value={config.scale} onChange={...} />

        {/* Botones */}
        <DialogFooter>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(config)}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Esfuerzo**: 2-3 días
- Reutilizar componentes existentes (@cadhy/ui)
- Validación de valores
- Preview de configuración

---

### 5. Sistema de Vistas Automáticas (Complejidad: ⭐⭐)

**Estado**: La función `generate_standard_views()` existe, pero no está integrada

**Necesario**:

#### UI para agregar vistas:
```typescript
// En Viewport2D o panel lateral
<div className="grid grid-cols-3 gap-2">
  {availableViews.map(view => (
    <Button
      key={view}
      variant={drawing.views.includes(view) ? 'default' : 'outline'}
      onClick={() => addView(view)}
    >
      {viewLabels[view]}
    </Button>
  ))}
</div>
```

#### Backend:
- Ya existe `generate_standard_views()` en Rust
- Solo falta exponerlo como comando Tauri

**Esfuerzo**: 1-2 días
- UI de selección de vistas
- Integración con comando Tauri
- Actualización de viewport 2D

---

### 6. Sistema de Acotado Interactivo (Complejidad: ⭐⭐⭐⭐⭐)

**Estado**: Existe generación automática, pero NO selección interactiva de líneas

**Necesario**:

#### Detección de clics en líneas 2D:
```typescript
function handleCanvasClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Convertir coordenadas de pantalla a coordenadas de dibujo
  const worldPoint = screenToWorld(x, y)

  // Encontrar línea más cercana
  const nearestLine = findNearestLine(worldPoint, drawing.views[0].projection.lines)

  if (nearestLine && distance(worldPoint, nearestLine) < threshold) {
    // Iniciar modo de acotado
    startDimensioning(nearestLine)
  }
}
```

#### Modo de acotado:
```typescript
enum DimensioningMode {
  None,
  SelectingLine, // Esperando selección de línea
  SelectingPoint1, // Esperando primer punto
  SelectingPoint2, // Esperando segundo punto
  PlacingText, // Colocando texto de dimensión
}

function startDimensioning(line: Line2D) {
  setDimensioningMode('SelectingPoint1')
  // Mostrar tooltip: "Selecciona primera referencia"
}
```

#### Generación de dimensión:
- Ya existe `AutoDimensioner.create_horizontal_dimension()` en Rust
- Solo falta UI para seleccionar elementos y llamar a la función

**Esfuerzo**: 7-10 días
- Sistema de hit-testing en Canvas/SVG
- Estados de acotado
- UI de herramientas de acotado (barra lateral)
- Integración con módulo de dimensiones existente

---

### 7. Panel Lateral de Herramientas (Complejidad: ⭐⭐)

**Estado**: Existen paneles laterales, pero no específico para planos

**Necesario**:
```typescript
// En components/modeller/panels/DrawingToolsPanel.tsx
export function DrawingToolsPanel() {
  return (
    <div className="flex flex-col gap-2">
      {/* Categorías */}
      <Tabs defaultValue="dimensions">
        <TabsList>
          <TabsTrigger value="dimensions">Cotas</TabsTrigger>
          <TabsTrigger value="geometries">Geometrías</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions">
          <div className="space-y-1">
            <ToolButton icon={LineLengthIcon} label="Longitud de línea" />
            <ToolButton icon={DistanceIcon} label="Distancia punto a punto" />
            <ToolButton icon={AngleIcon} label="Ángulo" />
            <ToolButton icon={RadiusIcon} label="Radio" />
            <ToolButton icon={DiameterIcon} label="Diámetro" />
            {/* ... más herramientas */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Esfuerzo**: 2-3 días
- Reutilizar componentes existentes
- Iconos de herramientas
- Estados activos/inactivos

---

### 8. Exportación a PDF (Complejidad: ⭐⭐⭐)

**Estado**: No existe exportación de planos

**Necesario**:

#### Opción A: jsPDF (Frontend)
```typescript
import jsPDF from 'jspdf'

function exportDrawingToPDF(drawing: Drawing) {
  const pdf = new jsPDF({
    orientation: drawing.sheetConfig.orientation,
    unit: 'mm',
    format: drawing.sheetConfig.size,
  })

  // Renderizar vistas
  drawing.views.forEach(view => {
    renderProjectionToPDF(pdf, view.projection)
  })

  // Renderizar dimensiones
  drawing.dimensions.dimensions.forEach(dim => {
    renderDimensionToPDF(pdf, dim)
  })

  // Renderizar título
  renderTitleBlock(pdf, drawing)

  pdf.save(`${drawing.name}.pdf`)
}
```

#### Opción B: Backend Rust (Mejor calidad)
- Usar librería como `printpdf` o `pdf-writer`
- Mejor control sobre tipografía y líneas
- Requiere pasar datos de dibujo a Rust

**Esfuerzo**: 3-5 días
- Implementar renderizador PDF
- Manejar escalado y posicionamiento
- Bloque de título

---

## 📋 Plan de Implementación Sugerido

### Fase 1: Fundamentos (Semana 1-2)
1. ✅ Crear comandos Tauri para proyecciones
2. ✅ Crear estructura de datos de Drawing
3. ✅ Crear store de dibujos
4. ✅ Implementar viewport 2D básico (Canvas)

### Fase 2: UI y Configuración (Semana 3)
5. ✅ Diálogo de configuración de hoja
6. ✅ Botón "Crear dibujo" en toolbar
7. ✅ Sistema de selección de sólidos para dibujo
8. ✅ Panel de herramientas básico

### Fase 3: Vistas Automáticas (Semana 4)
9. ✅ Generación de vistas estándar
10. ✅ UI para agregar/quitar vistas
11. ✅ Layout automático de vistas en hoja

### Fase 4: Acotado Interactivo (Semana 5-6)
12. ✅ Sistema de hit-testing en viewport 2D
13. ✅ Modos de acotado (línea, punto, ángulo, etc.)
14. ✅ Panel de herramientas de acotado completo
15. ✅ Integración con AutoDimensioner

### Fase 5: Pulido y Exportación (Semana 7-8)
16. ✅ Exportación a PDF
17. ✅ Mejoras de UX (zoom, pan, grid)
18. ✅ Bloque de título automático
19. ✅ Persistencia en archivo .cadhy

---

## 🎯 Conclusión

### Factibilidad: ✅ ALTA

El proyecto tiene **excelentes fundamentos**:
- ✅ Módulo de proyección 2D completo y funcional
- ✅ Módulo de dimensiones con generación automática
- ✅ Infraestructura de UI y comandos establecida

### Desafíos Principales:

1. **Renderizado 2D** (Complejidad: ⭐⭐⭐⭐)
   - Requiere nuevo viewport diferente al 3D
   - Canvas o SVG con sistema de coordenadas propio
   - Hit-testing para selección interactiva

2. **Acotado Interactivo** (Complejidad: ⭐⭐⭐⭐⭐)
   - Sistema de estados complejo
   - Detección precisa de clics en líneas
   - Integración con módulo existente

3. **Gestión de Estado** (Complejidad: ⭐⭐⭐)
   - Nuevo store para dibujos
   - Sincronización entre vista 3D y 2D
   - Persistencia en proyecto

### Recomendación:

**SÍ es factible**, pero requiere:
- **6-8 semanas** de desarrollo dedicado
- Enfoque incremental (empezar con vistas básicas, luego acotado)
- Priorizar Canvas 2D sobre SVG (más simple inicialmente)
- Reutilizar componentes UI existentes al máximo

### Próximos Pasos:

1. Crear issue/ticket para esta feature
2. Diseñar mockups de UI específicos
3. Implementar Fase 1 (fundamentos) como prueba de concepto
4. Iterar basado en feedback

---

**Última actualización**: 2025-12-24

