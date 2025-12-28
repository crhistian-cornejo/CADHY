# Sistema de Iconos: Estrategia Chilli3D → CADHY

**Fecha:** 2025-12-21
**Autor:** Claude Sonnet 4.5
**Status:** 📋 Design Document
**Referencia:** Chilli3D v0.6.1 Icon System

---

## 📊 Análisis del Sistema de Iconos de Chilli3D

### Arquitectura General

Chilli3D usa un sistema de **SVG Symbol Icon Font** altamente optimizado:

- **Formato:** JavaScript file con SVG sprites embedded
- **Tamaño:** ~2.86 MB (69,711 líneas de código)
- **Total de iconos:** 119 iconos únicos
- **Carga:** Lazy-loaded via `fetch()` al iniciar app
- **Renderizado:** `<use xlink:href="#icon-name">` (eficiente, sin duplicación)

---

## 🏗️ Componentes del Sistema

### 1. Icon Font File

**Archivo:** `chili3d/public/iconfont.js`

**Estructura:**
```javascript
window._iconfont_svg_string_3585225 = '<svg>' +
  '<symbol id="icon-box" viewBox="0 0 1024 1024">' +
    '<path d="M512 128L128 320v384l384 192 384-192V320z" fill="#8a8a8a"/>' +
  '</symbol>' +
  '<symbol id="icon-cylinder" viewBox="0 0 1024 1024">' +
    '<path d="..." fill="#8a8a8a"/>' +
  '</symbol>' +
  // ... 117 more icons
'</svg>';

// Auto-inject into DOM
(function() {
  var div = document.createElement('div');
  div.innerHTML = window._iconfont_svg_string_3585225;
  div.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
  document.body.insertBefore(div, document.body.firstChild);
})();
```

**Ventajas:**
- ✅ Todos los iconos en un solo archivo (una sola request HTTP)
- ✅ SVG symbols permiten reutilización sin duplicación
- ✅ Los iconos son vectoriales (escalables sin pérdida)
- ✅ Fácil de actualizar (regenerar el archivo)

**Desventajas:**
- ❌ Archivo grande (~3MB)
- ❌ Todos los iconos se cargan aunque no se usen todos
- ❌ No hay tree-shaking

---

### 2. SVG Helper Functions

**Archivo:** `packages/chili-controls/src/controls.ts`

```typescript
export function svg(props: HTMLProps<HTMLElement> & { icon: string }) {
    const ns = "http://www.w3.org/2000/svg";

    // Create <use> element that references the symbol
    const child = document.createElementNS(ns, "use");
    child.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        `#${props.icon}`
    );

    // Create <svg> container
    const svg = document.createElementNS(ns, "svg");
    svg.append(child);

    // Apply classes and attributes
    if (props.className) {
        svg.setAttribute("class", props.className);
    }
    if (props.onclick) {
        svg.onclick = props.onclick;
    }

    return svg;
}

export function setSVGIcon(svg: SVGSVGElement, newIcon: string) {
    const child = svg.firstChild as SVGUseElement;
    child?.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        `#${newIcon}`
    );
}
```

**Uso:**
```typescript
// Crear icono
const icon = svg({ icon: "icon-box", className: "tool-icon" });
document.body.appendChild(icon);

// Cambiar icono dinámicamente
setSVGIcon(icon, "icon-cylinder");
```

---

### 3. Carga e Inicialización

**Archivo:** `packages/chili-ui/src/mainWindow.ts`

```typescript
export class MainWindow {
    constructor(
        readonly tabs: RibbonTab[],
        readonly iconFont: string,
        dom?: HTMLElement
    ) {
        this.fetchIconFont();
        // ... rest of initialization
    }

    protected async fetchIconFont() {
        const response = await fetch(this.iconFont);  // "iconfont.js"
        const text = await response.text();
        new Function(text)();  // Execute to inject SVG symbols
    }
}
```

**Flujo:**
1. App inicia
2. `MainWindow` se crea
3. `fetchIconFont()` descarga `iconfont.js`
4. Script se ejecuta, inyecta `<svg>` con symbols en DOM
5. Componentes pueden referenciar icons via `#icon-name`

---

### 4. Integración en UI Components

#### Ribbon Buttons

**Archivo:** `packages/chili-ui/src/ribbon/ribbonButton.ts`

```typescript
export class RibbonButton extends HTMLElement {
    constructor(
        display: I18nKeys,
        icon: string,
        size: ButtonSize,
        onClick: () => void
    ) {
        super();

        const image = svg({ icon });
        image.classList.add(
            size === ButtonSize.large ? style.icon : style.smallIcon
        );

        // ... rest of component
    }
}
```

#### Tree Items

**Archivo:** `packages/chili-ui/src/project/tree/treeItem.ts`

```typescript
export class TreeItem extends HTMLElement {
    private visibleIcon: SVGSVGElement;

    constructor(node: INode) {
        super();
        this.visibleIcon = svg({
            icon: this.getVisibleIcon(),
            onclick: this.toggleVisible
        });
    }

    private getVisibleIcon() {
        return this.node.visible ? "icon-eye" : "icon-eye-slash";
    }

    private toggleVisible = () => {
        this.node.visible = !this.node.visible;
        setSVGIcon(this.visibleIcon, this.getVisibleIcon());
    };
}
```

---

### 5. Styling

**CSS:** `packages/chili-ui/src/ribbon/ribbonButton.module.css`

```css
.icon {
    width: 30px;
    height: 30px;
    margin-bottom: 4px;
}

.smallIcon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    flex-shrink: 0;
}

svg {
    fill: currentColor;  /* Inherit text color */
    transition: fill 0.2s;
}

svg:hover {
    fill: var(--primary-color);
}
```

---

## 🎨 Inventario de Iconos de Chilli3D (119 total)

### Primitivas (15)
- `icon-box`, `icon-sphere`, `icon-cone`, `icon-cylinder`
- `icon-pyramid`, `icon-prism`, `icon-torus`
- `icon-plane`, `icon-wedge`

### Curvas 2D (12)
- `icon-arc`, `icon-circle`, `icon-ellipse`
- `icon-line`, `icon-polyline`, `icon-polygon`
- `icon-bezier`, `icon-spline`, `icon-rect`

### Modificadores (18)
- `icon-fillet`, `icon-chamfer`, `icon-offset`
- `icon-revolve`, `icon-extrude`, `icon-sweep`, `icon-loft`
- `icon-shell`, `icon-thickSolid`, `icon-draft`
- `icon-mirror`, `icon-array`, `icon-pattern`

### Boolean Operations (3)
- `icon-booleanFuse` (union)
- `icon-booleanCut` (difference)
- `icon-booleanCommon` (intersection)

### Tools (15)
- `icon-trim`, `icon-split`, `icon-break`
- `icon-section`, `icon-measure`, `icon-distance`
- `icon-angle`, `icon-area`, `icon-volume`

### Selection (8)
- `icon-select`, `icon-subShape`, `icon-group`
- `icon-isolate`, `icon-hide`, `icon-show`
- `icon-eye`, `icon-eye-slash`

### Conversions (6)
- `icon-toFace`, `icon-toWire`, `icon-toShell`
- `icon-toSolid`, `icon-toPoly`, `icon-toCompound`

### Navigation & View (12)
- `icon-zoomin`, `icon-zoomout`, `icon-zoomfit`
- `icon-rotate`, `icon-pan`, `icon-orbit`
- `icon-top`, `icon-front`, `icon-right`, `icon-iso`

### Edit (8)
- `icon-undo`, `icon-redo`
- `icon-copy`, `icon-paste`, `icon-delete`
- `icon-duplicate`, `icon-transform`

### UI General (22)
- `icon-save`, `icon-open`, `icon-export`, `icon-import`
- `icon-cog`, `icon-settings`, `icon-search`
- `icon-home`, `icon-github`, `icon-chili`
- `icon-times`, `icon-confirm`, `icon-cancel`
- `icon-angle-down`, `icon-angle-right`, `icon-angle-up`, `icon-angle-left`
- `icon-plus`, `icon-minus`, `icon-edit`, `icon-trash`

---

## 🚀 Implementación para CADHY

### Opción A: Sistema Chilli3D (SVG Icon Font)

**Pros:**
- ✅ Un solo archivo, una request HTTP
- ✅ Sistema probado y funcional
- ✅ Fácil de actualizar (regenerar archivo)
- ✅ Soporta iconos custom

**Cons:**
- ❌ Archivo grande (~3MB)
- ❌ No tree-shaking
- ❌ Carga todos los iconos aunque no se usen

**Cuándo usar:** Si necesitas muchos iconos custom y prefieres simplicidad.

---

### Opción B: Lucide React (Estado Actual de CADHY)

**Pros:**
- ✅ Tree-shaking (solo iconos usados)
- ✅ React components (fácil de usar)
- ✅ 1000+ iconos disponibles
- ✅ Mantenido activamente

**Cons:**
- ❌ No soporta iconos custom fácilmente
- ❌ Bundle puede crecer si usas muchos iconos

**Cuándo usar:** Si usas iconos estándar y quieres tree-shaking.

---

### Opción C: Híbrido (Recomendado para CADHY)

**Estrategia:**
1. **Lucide React** para iconos UI generales (save, open, settings, etc.)
2. **SVG Icon Font custom** para iconos CAD específicos (primitivas, operaciones)

**Implementación:**

#### Paso 1: Crear SVG Icon Font custom

**Archivo:** `apps/desktop/public/cad-icons.js`

```javascript
window._cadhy_cad_icons = '<svg xmlns="http://www.w3.org/2000/svg">' +
  // Hydraulic-specific icons
  '<symbol id="icon-channel" viewBox="0 0 24 24">' +
    '<path d="M2 4h20v16H2V4z" stroke="currentColor" fill="none" stroke-width="2"/>' +
    '<path d="M2 20h20" stroke="currentColor" stroke-width="2"/>' +
  '</symbol>' +

  '<symbol id="icon-chute" viewBox="0 0 24 24">' +
    '<path d="M4 4h16l-4 16H8L4 4z" stroke="currentColor" fill="none" stroke-width="2"/>' +
  '</symbol>' +

  '<symbol id="icon-transition" viewBox="0 0 24 24">' +
    '<path d="M4 4h8v16H4V4z M12 4h8v16h-8z" stroke="currentColor" fill="none" stroke-width="2"/>' +
  '</symbol>' +

  // CAD operations
  '<symbol id="icon-sweep" viewBox="0 0 24 24">' +
    '<path d="M4 12c0-4 3-8 8-8s8 4 8 8-3 8-8 8" stroke="currentColor" fill="none" stroke-width="2"/>' +
    '<circle cx="12" cy="4" r="2" fill="currentColor"/>' +
  '</symbol>' +

  '<symbol id="icon-loft" viewBox="0 0 24 24">' +
    '<ellipse cx="12" cy="6" rx="8" ry="2" stroke="currentColor" fill="none" stroke-width="2"/>' +
    '<ellipse cx="12" cy="18" rx="6" ry="2" stroke="currentColor" fill="none" stroke-width="2"/>' +
    '<path d="M4 6v12 M20 6v12" stroke="currentColor" stroke-width="2"/>' +
  '</symbol>' +

  '<symbol id="icon-helix" viewBox="0 0 24 24">' +
    '<path d="M12 2c-3 0-5 2-5 5v10c0 3 2 5 5 5s5-2 5-5V7c0-3-2-5-5-5z" ' +
          'stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="2,2"/>' +
  '</symbol>' +

'</svg>';

(function() {
  const div = document.createElement('div');
  div.innerHTML = window._cadhy_cad_icons;
  div.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
  document.body.insertBefore(div, document.body.firstChild);
})();
```

#### Paso 2: React Component Wrapper

**Archivo:** `apps/desktop/src/components/ui/cad-icon.tsx`

```typescript
import { cn } from '@/lib/utils';

interface CadIconProps {
  name: string;
  className?: string;
  size?: number | string;
  onClick?: () => void;
}

export function CadIcon({ name, className, size = 24, onClick }: CadIconProps) {
  return (
    <svg
      className={cn('inline-block', className)}
      width={size}
      height={size}
      onClick={onClick}
      style={{ fill: 'currentColor' }}
    >
      <use xlinkHref={`#icon-${name}`} />
    </svg>
  );
}

// Usage:
// <CadIcon name="channel" size={24} />
// <CadIcon name="sweep" className="text-blue-500" />
```

#### Paso 3: Cargar iconos en App

**Archivo:** `apps/desktop/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Load CAD icons
async function loadCadIcons() {
  try {
    const response = await fetch('/cad-icons.js');
    const script = await response.text();
    new Function(script)();
  } catch (error) {
    console.error('Failed to load CAD icons:', error);
  }
}

loadCadIcons().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

#### Paso 4: Uso híbrido

```typescript
import { Save, Settings, ChevronDown } from 'lucide-react';
import { CadIcon } from '@/components/ui/cad-icon';

export function Toolbar() {
  return (
    <div className="toolbar">
      {/* Lucide para UI general */}
      <Button>
        <Save size={16} />
        Save
      </Button>

      <Button>
        <Settings size={16} />
        Settings
      </Button>

      {/* CAD icons custom para operaciones */}
      <Button>
        <CadIcon name="channel" size={16} />
        Create Channel
      </Button>

      <Button>
        <CadIcon name="sweep" size={16} />
        Sweep
      </Button>

      <Button>
        <CadIcon name="loft" size={16} />
        Loft
      </Button>
    </div>
  );
}
```

---

## 🎨 Creación de Iconos Custom

### Herramientas Recomendadas

1. **Figma** (recomendado)
   - Diseña iconos en 24x24 grid
   - Exporta como SVG
   - Simplifica paths

2. **Inkscape** (free, open-source)
   - Alternativa a Illustrator
   - Buenas herramientas de simplificación
   - Export optimizado

3. **SVGOMG** (https://jakearchibald.github.io/svgomg/)
   - Optimiza SVGs exportados
   - Reduce tamaño de archivo
   - Limpia código innecesario

### Workflow

```
Figma/Inkscape → Export SVG → SVGOMG → Extract <path> → Add to cad-icons.js
```

**Ejemplo:**

**1. Diseñar en Figma:**
- Canvas: 24x24px
- Stroke: 2px
- Grid snap: enabled
- Export: SVG

**2. Exportar y optimizar:**
```xml
<!-- Figma export (sin optimizar) -->
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <rect x="2" y="4" width="20" height="16" stroke="black" stroke-width="2"/>
  <line x1="2" y1="20" x2="22" y2="20" stroke="black" stroke-width="2"/>
</svg>

<!-- SVGOMG optimizado -->
<path d="M2 4h20v16H2V4z M2 20h20" stroke="currentColor" fill="none" stroke-width="2"/>
```

**3. Agregar a cad-icons.js:**
```javascript
'<symbol id="icon-my-new-icon" viewBox="0 0 24 24">' +
  '<path d="M2 4h20v16H2V4z M2 20h20" stroke="currentColor" fill="none" stroke-width="2"/>' +
'</symbol>' +
```

---

## 📊 Bundle Size Comparison

| Estrategia | Bundle Size | Pros | Cons |
|------------|-------------|------|------|
| **Lucide React (all)** | ~500KB | Tree-shaking, components | No custom icons |
| **Lucide React (tree-shaked)** | ~50-100KB | Pequeño, componentes | No custom icons |
| **Chilli3D SVG Font** | ~3MB | Todos los iconos, custom | Grande, no tree-shaking |
| **CADHY Híbrido** | ~100-150KB | Best of both, custom | Doble sistema |

**Recomendación:** Usar **sistema híbrido** para CADHY.

---

## 🔧 Implementación Paso a Paso

### Semana 1: Setup Básico

**Día 1-2:**
- [ ] Crear `apps/desktop/public/cad-icons.js`
- [ ] Diseñar 10 iconos básicos (channel, chute, transition, sweep, loft, helix, fillet, chamfer, shell, offset)
- [ ] Crear componente `CadIcon.tsx`

**Día 3-4:**
- [ ] Integrar carga de iconos en `main.tsx`
- [ ] Migrar 5 componentes a usar `CadIcon`
- [ ] Testing

**Día 5:**
- [ ] Documentación
- [ ] Code review

### Semana 2: Expansión

**Día 1-3:**
- [ ] Diseñar 20 iconos adicionales
- [ ] Migrar todos los CAD operations a `CadIcon`
- [ ] Actualizar toolbars y panels

**Día 4-5:**
- [ ] Crear icon picker component (para debugging)
- [ ] Performance testing
- [ ] Bundle size analysis

---

## 📝 Convenciones de Nombres

### Prefijos por Categoría

- **Primitivas:** `icon-box`, `icon-cylinder`, `icon-sphere`
- **Hydraulic:** `icon-channel`, `icon-chute`, `icon-transition`
- **Operaciones:** `icon-sweep`, `icon-loft`, `icon-extrude`
- **Modificadores:** `icon-fillet`, `icon-chamfer`, `icon-offset`
- **Boolean:** `icon-union`, `icon-difference`, `icon-intersection`
- **Tools:** `icon-measure-distance`, `icon-measure-angle`
- **View:** `icon-view-top`, `icon-view-front`, `icon-view-iso`

### Formato

```
icon-{category}-{name}
icon-{name}  (si categoría es obvia)
```

**Buenos:**
- `icon-channel-rectangular`
- `icon-sweep`
- `icon-measure-distance`

**Malos:**
- `icon-rect-channel` (categoría al final)
- `sweep-icon` (prefijo incorrecto)
- `icon_sweep` (guión bajo en vez de guión)

---

## 🎯 Checklist de Implementación

### Preparación
- [ ] Decidir estrategia (Opción A, B, o C)
- [ ] Revisar iconos necesarios
- [ ] Crear inventario de iconos a diseñar

### Diseño
- [ ] Diseñar iconos en Figma/Inkscape (24x24 grid)
- [ ] Exportar como SVG
- [ ] Optimizar con SVGOMG
- [ ] Validar contraste y legibilidad

### Desarrollo
- [ ] Crear `cad-icons.js`
- [ ] Implementar componente `CadIcon`
- [ ] Integrar carga de iconos
- [ ] Migrar componentes existentes

### Testing
- [ ] Verificar rendering en diferentes tamaños
- [ ] Probar con diferentes temas (light/dark)
- [ ] Medir bundle size
- [ ] Performance testing

### Documentación
- [ ] Documentar sistema de iconos
- [ ] Crear guía de uso
- [ ] Listar todos los iconos disponibles
- [ ] Workflow para agregar nuevos iconos

---

## 📚 Referencias

- **Chilli3D Icon System:** `chili3d/public/iconfont.js`, `packages/chili-controls/src/controls.ts`
- **SVG Symbols:** https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol
- **SVGOMG:** https://jakearchibald.github.io/svgomg/
- **Lucide Icons:** https://lucide.dev/
- **Figma:** https://www.figma.com/

---

**Status:** 📋 Design Document
**Recomendación:** Implementar **Opción C (Híbrido)** para CADHY
**Última actualización:** 2025-12-21
