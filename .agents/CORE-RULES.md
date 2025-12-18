# CADHY - Core Rules for AI Agents

> **Reglas fundamentales que TODO agente debe seguir**

---

## 1. Identidad del Proyecto

```yaml
name: CADHY
type: Desktop CAD + Hydraulics Suite
platform: Tauri v2 (macOS, Windows, Linux)
stack: React 19 + TypeScript 5.9 + Rust 2024
```

---

## 2. Sistema de Diseño (OBLIGATORIO)

### 2.1 Colores - OKLCH

**NUNCA uses hex o rgb. SIEMPRE usa las variables CSS definidas:**

```css
/* Usa estos tokens, NO valores hardcodeados */
--background, --foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--card, --card-foreground
--popover, --popover-foreground
```

### 2.2 Componentes UI

**Referencia obligatoria:** `/components.json`

```json
{
  "style": "base-vega",
  "iconLibrary": "hugeicons",
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  }
}
```

### 2.3 Iconos - Hugeicons SOLAMENTE

```typescript
// CORRECTO
import { HugeiconsIcon } from "@hugeicons/react"
import { Cube01Icon, PencilRuler01Icon } from "@hugeicons/core-free-icons"

<HugeiconsIcon icon={Cube01Icon} strokeWidth={2} />

// INCORRECTO - NUNCA usar
import { Box } from "lucide-react"  // NO
import { FaBox } from "react-icons" // NO
```

### 2.4 Variantes con CVA

```typescript
// Patrón estándar para todos los componentes
import { cva, type VariantProps } from "class-variance-authority"

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "", outline: "", ghost: "" },
    size: { sm: "h-8", default: "h-9", lg: "h-10" },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})
```

### 2.5 Data Slots

**Todos los componentes DEBEN tener `data-slot`:**

```tsx
<button data-slot="button" className={...}>
<div data-slot="card" className={...}>
```

---

## 3. Estructura de Archivos

### 3.1 Componentes

```
src/components/
├── layout/           # Layout principal (AppLayout, Titlebar, etc.)
├── sidebar/          # Sidebar y navegación
├── panels/           # Paneles de trabajo
├── viewer/           # Viewer 3D
├── tools/            # Herramientas CAD
├── hydraulics/       # UI de hidráulica
├── ai/               # Chat y AI
├── settings/         # Configuración
└── common/           # Componentes compartidos
```

### 3.2 Naming Conventions

```typescript
// Componentes: PascalCase
AppSidebar.tsx
ViewerPanel.tsx

// Hooks: camelCase con use-
use-theme.ts
use-viewer.ts

// Stores: kebab-case con -store
cad-store.ts
viewer-store.ts

// Types: PascalCase
interface MeshData {}
type ViewerState = {}
```

---

## 4. Patrones de Código

### 4.1 Componentes React

```typescript
// Patrón estándar
import { cn } from "@/lib/utils"

interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export function Component({ className, children }: ComponentProps) {
  return (
    <div data-slot="component" className={cn("base-styles", className)}>
      {children}
    </div>
  )
}
```

### 4.2 Zustand Stores

```typescript
// Patrón estándar
import { create } from "zustand"

interface StoreState {
  value: string
  setValue: (value: string) => void
}

export const useStore = create<StoreState>((set) => ({
  value: "",
  setValue: (value) => set({ value }),
}))
```

### 4.3 Tauri Commands

```typescript
// Frontend
import { invoke } from "@tauri-apps/api/core"

const result = await invoke<MeshData>("create_box", {
  width: 10,
  height: 20,
  depth: 30,
})

// Backend (Rust)
#[tauri::command]
async fn create_box(width: f32, height: f32, depth: f32) -> Result<MeshData, String> {
    // ...
}
```

---

## 5. Restricciones

### 5.1 NO hacer

- NO usar Lucide, FontAwesome, o cualquier otro icon library
- NO usar colores hex/rgb directos
- NO crear archivos fuera de la estructura definida
- NO usar `any` en TypeScript
- NO crear stores globales sin necesidad
- NO usar `useEffect` para lógica que puede ser derivada

### 5.2 SIEMPRE hacer

- SIEMPRE usar los componentes de `@/components/ui`
- SIEMPRE tipar las props de componentes
- SIEMPRE usar `cn()` para merge de clases
- SIEMPRE usar `data-slot` en componentes
- SIEMPRE usar Motion para animaciones
- SIEMPRE manejar loading/error states

---

## 6. Módulos de la App

```typescript
const MODULES = {
  cad: {
    id: "cad",
    label: "CAD Modeler",
    description: "3D parametric modeling",
  },
  hydraulics: {
    id: "hydraulics",
    label: "Hydraulics",
    description: "Channel design and analysis",
  },
  ai: {
    id: "ai",
    label: "AI Assistant",
    description: "AI-powered design help",
  },
  data: {
    id: "data",
    label: "Data & Results",
    description: "Tables, charts, exports",
  },
}
```

---

## 7. Comandos Útiles

```bash
# Desarrollo
bun dev              # Tauri dev
bun lint             # Biome lint
bun format           # Biome format

# Build
bun build            # Build release
bun tauri build      # Build instalador

# Rust
cargo build          # Build crates
cargo test           # Run tests
cargo clippy         # Lint
```

---

## 8. Documentación Relacionada

| Archivo | Contenido |
|---------|-----------|
| `.agents/ARCHITECTURE.md` | Arquitectura y estructura del proyecto |
| `.agents/CONVENTIONS.md` | Convenciones de código detalladas |
| `.agents/SHADCN-V2.md` | shadcn/ui v2 + Tailwind CSS v4 |
