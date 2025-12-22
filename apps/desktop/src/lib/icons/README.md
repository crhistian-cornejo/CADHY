# Hugeicons - Sistema Centralizado de Iconos

Este directorio contiene el sistema centralizado de iconos de Hugeicons para CADHY.

## 📊 Estadísticas

- **Total de iconos**: 4,655 iconos
- **Categorías**: 23 categorías organizadas
- **Package**: `@hugeicons/core-free-icons@3.1.0`

## 🎯 Uso Básico

### Importar iconos individuales

```tsx
import { CubeIcon, Edit01Icon, Settings01Icon } from "@/lib/icons/hugeicons";

function MyComponent() {
  return (
    <div>
      <CubeIcon size={24} color="#4A90E2" />
      <Edit01Icon size={32} strokeWidth={2} />
      <Settings01Icon size={20} className="text-primary" />
    </div>
  );
}
```

### Usar categorías de iconos

```tsx
import { CAD3DIcons, UIControlsIcons, IconCategories } from "@/lib/icons/hugeicons";

// Obtener todos los iconos de CAD & 3D
const cadIcons = Object.keys(CAD3DIcons);
console.log(cadIcons); // ['ThreeDViewIcon', 'ThreeDMoveIcon', 'CubeIcon', ...]

// Iterar sobre categorías
for (const [category, icons] of Object.entries(IconCategories)) {
  console.log(`${category}: ${Object.keys(icons).length} icons`);
}
```

### Búsqueda de iconos

```tsx
import { searchIcons, getIconsByCategory } from "@/lib/icons/hugeicons";

// Buscar iconos por nombre
const cubeIcons = searchIcons("cube");
console.log(cubeIcons); // ['CubeIcon', 'IceCubeIcon', ...]

// Obtener iconos por categoría
const arrowIcons = getIconsByCategory("Arrows & Directions");
console.log(arrowIcons); // ['ArrowUp01Icon', 'ArrowDown01Icon', ...]
```

### Componente dinámico de icono

```tsx
import { useMemo } from "react";
import * as Icons from "@/lib/icons/hugeicons";
import type { IconName } from "@/lib/icons/hugeicons";

interface DynamicIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function DynamicIcon({ name, size = 24, color, strokeWidth, className }: DynamicIconProps) {
  const IconComponent = useMemo(() => {
    // @ts-expect-error - Dynamic import from IconName
    return Icons[name];
  }, [name]);

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} className={className} />;
}

// Uso
<DynamicIcon name="CubeIcon" size={32} color="#FF0000" />
```

## 📁 Categorías Disponibles

1. **AI & Technology** (118 iconos) - AI, robots, automatización
2. **Arrows & Directions** (177 iconos) - Flechas, navegación, direcciones
3. **Buildings & Places** (56 iconos) - Edificios, lugares, monumentos
4. **CAD & 3D** (287 iconos) - Herramientas CAD, formas 3D, diseño
5. **Charts & Analytics** (71 iconos) - Gráficos, análisis, métricas
6. **Commerce & Money** (211 iconos) - Comercio, pagos, monedas
7. **Communication** (234 iconos) - Chat, correo, llamadas
8. **Development & Code** (44 iconos) - Código, Git, desarrollo
9. **Education & Learning** (16 iconos) - Educación, aprendizaje
10. **Files & Folders** (194 iconos) - Archivos, carpetas, documentos
11. **Food & Drink** (33 iconos) - Comida, bebidas, restaurantes
12. **Health & Medical** (43 iconos) - Salud, medicina, hospital
13. **Media & Content** (113 iconos) - Imágenes, video, audio
14. **Objects & Things** (115 iconos) - Objetos cotidianos, herramientas
15. **Security & Privacy** (60 iconos) - Seguridad, privacidad, candados
16. **Social & Brands** (41 iconos) - Redes sociales, marcas
17. **Sports & Fitness** (28 iconos) - Deportes, ejercicio, fitness
18. **System & Status** (57 iconos) - Estados del sistema, notificaciones
19. **Time & Calendar** (66 iconos) - Tiempo, calendario, fechas
20. **Transport & Travel** (91 iconos) - Transporte, viajes, vehículos
21. **UI & Controls** (144 iconos) - Controles UI, botones, inputs
22. **Users & People** (90 iconos) - Usuarios, personas, perfiles
23. **Weather & Nature** (103 iconos) - Clima, naturaleza, plantas

## 🔧 Props de Iconos

Todos los iconos de Hugeicons aceptan las siguientes props:

```tsx
interface HugeiconsProps extends SVGProps<SVGSVGElement> {
  size?: string | number;      // Tamaño del icono (default: 24)
  color?: string;               // Color del icono (default: currentColor)
  strokeWidth?: number;         // Grosor del trazo (default: 1.5)
  className?: string;           // Clase CSS
  onClick?: () => void;         // Event handlers...
  // ... todas las props de SVG
}
```

## 💡 Ejemplos Avanzados

### Icon Picker Component

```tsx
import { useState } from "react";
import { getAllIconNames, searchIcons } from "@/lib/icons/hugeicons";
import { DynamicIcon } from "./DynamicIcon";

export function IconPicker() {
  const [search, setSearch] = useState("");
  const icons = search ? searchIcons(search) : getAllIconNames();

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search icons..."
      />
      <div className="grid grid-cols-8 gap-2">
        {icons.slice(0, 100).map((iconName) => (
          <button
            key={iconName}
            className="p-2 hover:bg-gray-100 rounded"
            title={iconName}
          >
            <DynamicIcon name={iconName} size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Themed Icon System

```tsx
import { CubeIcon, Edit01Icon } from "@/lib/icons/hugeicons";

const THEME = {
  colors: {
    primary: "#4A90E2",
    secondary: "#7B8794",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  sizes: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },
};

interface ThemedIconProps {
  icon: React.ComponentType<any>;
  variant?: keyof typeof THEME.colors;
  size?: keyof typeof THEME.sizes;
}

function ThemedIcon({ icon: Icon, variant = "primary", size = "md" }: ThemedIconProps) {
  return (
    <Icon
      size={THEME.sizes[size]}
      color={THEME.colors[variant]}
      strokeWidth={2}
    />
  );
}

// Uso
<ThemedIcon icon={CubeIcon} variant="primary" size="lg" />
```

## 📝 Notas

- Los iconos se re-exportan desde `@hugeicons/core-free-icons`
- Todos los iconos terminan con `Icon` (ej: `CubeIcon`, `Edit01Icon`)
- Usa TypeScript para autocompletado de nombres de iconos
- El archivo está generado automáticamente - NO editar manualmente

## 🔄 Regenerar el Archivo

Para regenerar el archivo de iconos:

```bash
# Desde la raíz del proyecto
grep -o "declare const .*Icon:" node_modules/.bun/@hugeicons+core-free-icons@3.1.0/node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts | \
  sed 's/declare const //; s/:$//' | \
  sort > /tmp/hugeicons-list.txt

# Ejecutar el script de generación
node /tmp/generate-icons.js

# Copiar el archivo generado
cp /tmp/icons-generated.ts apps/desktop/src/lib/icons/hugeicons.ts
```

## 🔗 Referencias

- [Hugeicons Website](https://hugeicons.com)
- [Hugeicons React](https://www.npmjs.com/package/@hugeicons/react)
- [Hugeicons Core Free Icons](https://www.npmjs.com/package/@hugeicons/core-free-icons)
