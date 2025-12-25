# Sistema de Hotkeys Personalizables - CADHY

## Descripción General

CADHY incluye un sistema completo y avanzado de gestión de atajos de teclado (hotkeys) que permite a los usuarios personalizar completamente sus combinaciones de teclas.

## Características Principales

### ✨ Funcionalidades

1. **Captura Visual de Teclas**
   - Componente `KeyCaptureInput` que detecta combinaciones en tiempo real
   - Feedback visual durante la captura
   - Soporte para todas las teclas especiales (F1-F12, Numpad, flechas, etc.)

2. **Detección de Conflictos**
   - Verificación automática de conflictos antes de guardar
   - Advertencias visuales cuando hay conflictos
   - Prevención de sobrescritura accidental

3. **Sistema de Presets**
   - Guardar configuraciones personalizadas con nombres
   - Cargar presets guardados
   - Exportar/Importar configuraciones en JSON

4. **Validación Inteligente**
   - Validación de combinaciones válidas
   - Prevención de uso de atajos del sistema
   - Sugerencias para mejores prácticas

5. **Persistencia**
   - Guardado automático en localStorage
   - Sincronización con el registro global de hotkeys
   - Migración automática de versiones anteriores

## Arquitectura

### Componentes Principales

#### 1. `HotkeyRegistry` (`services/hotkey-registry.ts`)
Servicio centralizado que gestiona:
- Registro y desregistro de hotkeys
- Detección de conflictos
- Manejo de eventos de teclado
- Normalización de combinaciones

```typescript
import { hotkeyRegistry } from "@/services/hotkey-registry"

// Registrar un hotkey
hotkeyRegistry.register("my.hotkey", {
  name: "My Action",
  description: "Does something",
  category: "tools",
  defaultKeys: ["Ctrl+K"],
  enabled: true,
  action: () => {
    // Tu acción aquí
  }
})

// Rebindear un hotkey
hotkeyRegistry.rebind("my.hotkey", ["Ctrl+Shift+K"])
```

#### 2. `HotkeyStore` (`stores/hotkey-store.ts`)
Store de Zustand que persiste las configuraciones personalizadas:

```typescript
import { useHotkeyStore } from "@/stores/hotkey-store"

const { rebindHotkey, resetToDefault, exportBindings } = useHotkeyStore()

// Rebindear
rebindHotkey("my.hotkey", ["Ctrl+K"])

// Resetear
resetToDefault("my.hotkey")

// Exportar
const json = exportBindings()
```

#### 3. `useHotkey` Hook (`hooks/use-hotkey.ts`)
Hook de React para registrar hotkeys en componentes:

```typescript
import { useHotkey } from "@/hooks/use-hotkey"

function MyComponent() {
  useHotkey(
    {
      id: "my.action",
      name: "My Action",
      description: "Does something",
      category: "tools",
      keys: ["Ctrl+K"],
    },
    () => {
      // Tu acción aquí
    }
  )
}
```

#### 4. `KeyCaptureInput` Component (`components/common/KeyCaptureInput.tsx`)
Componente para capturar combinaciones de teclas:

```typescript
import { KeyCaptureInput } from "@/components/common"

<KeyCaptureInput
  value={currentKeys}
  onChange={(keys) => handleChange(keys)}
  excludeId="my.hotkey"
  placeholder="Press keys..."
/>
```

#### 5. `HotkeySettings` Component (`components/layout/settings/HotkeySettings.tsx`)
Interfaz completa de personalización con:
- Lista de todos los hotkeys organizados por categoría
- Edición inline con captura visual
- Sistema de presets
- Exportar/Importar

## Uso para Desarrolladores

### Registrar un Nuevo Hotkey

1. **Definir el hotkey por defecto** en `services/default-hotkeys.ts`:

```typescript
{
  id: "tools.myNewTool",
  name: "My New Tool",
  description: "Opens my new tool",
  keys: ["Ctrl+Shift+T"],
  context: "modeller", // opcional: "global" | "modeller" | "viewport" | "dialog"
}
```

2. **Registrar el hotkey** en tu componente:

```typescript
import { useHotkey } from "@/hooks/use-hotkey"

function MyComponent() {
  useHotkey(
    {
      id: "tools.myNewTool",
      name: "My New Tool",
      description: "Opens my new tool",
      category: "tools",
      keys: ["Ctrl+Shift+T"],
      context: "modeller",
    },
    useCallback(() => {
      // Tu lógica aquí
      openMyTool()
    }, [])
  )
}
```

3. **Asegurar que el handler global esté activo**:

```typescript
import { useGlobalHotkeyHandler } from "@/hooks/use-hotkey"

function MyView() {
  // Para hotkeys globales
  useGlobalHotkeyHandler()

  // O para hotkeys específicos de contexto
  useGlobalHotkeyHandler("modeller")
}
```

### Formato de Combinaciones de Teclas

Las combinaciones se definen como strings en formato: `Modifier+Key`

**Modificadores:**
- `Ctrl` o `Cmd` (se normaliza según plataforma)
- `Alt` o `Option` (se normaliza según plataforma)
- `Shift`

**Teclas especiales:**
- `Space`, `Enter`, `Tab`, `Escape`
- `Delete`, `Backspace`
- `Home`, `End`, `PageUp`, `PageDown`
- `F1` - `F12`
- `Numpad0` - `Numpad9`
- `Numpad+`, `Numpad-`, `Numpad*`, `Numpad/`, `Numpad.`, `NumpadEnter`
- `Up`, `Down`, `Left`, `Right`

**Ejemplos:**
```typescript
"Ctrl+S"              // Guardar
"Ctrl+Shift+S"        // Guardar como
"Cmd+K"               // macOS: Command+K
"Alt+F4"              // Cerrar (Windows)
"F11"                 // Pantalla completa
"Numpad1"             // Vista frontal
"Shift+1"             // Modo vértice
```

### Múltiples Combinaciones

Un hotkey puede tener múltiples combinaciones alternativas:

```typescript
{
  id: "edit.redo",
  keys: ["Ctrl+Y", "Ctrl+Shift+Z"], // Ambas funcionan
}
```

## Uso para Usuarios

### Personalizar Hotkeys

1. Abrir **Settings** (`Ctrl+,` o `Cmd+,`)
2. Ir a la pestaña **Shortcuts**
3. Click en **"Customize Keyboard Shortcuts"**
4. Click en cualquier hotkey para editarlo
5. Presionar la combinación deseada
6. El sistema detectará conflictos automáticamente

### Guardar Presets

1. Personalizar tus hotkeys
2. Escribir un nombre en el campo "Preset name..."
3. Click en el botón `+` para guardar
4. El preset se guardará y podrá cargarse después

### Exportar/Importar

- **Exportar**: Click en "Export" para descargar un archivo JSON
- **Importar**: Click en "Import" y selecciona un archivo JSON

El formato JSON es:
```json
{
  "file.save": ["Ctrl+S"],
  "edit.undo": ["Ctrl+Z"],
  ...
}
```

### Resetear

- **Reset individual**: Click en el ícono de refresh junto a un hotkey personalizado
- **Reset todos**: Click en "Reset All" en la barra de herramientas

## Validaciones y Restricciones

### Combinaciones No Permitidas

1. **Atajos del sistema**:
   - `Ctrl+Alt+Delete` (Windows)
   - `Alt+F4` (Windows)
   - `Cmd+Q` (macOS quit)
   - `F11` (Fullscreen - aunque está permitido para la app)

2. **Teclas simples sin modificador**:
   - Las teclas de una sola letra deben tener al menos un modificador
   - Excepción: Teclas de función (F1-F12)

3. **Solo modificadores**:
   - No se permiten combinaciones que solo contengan modificadores

## Mejores Prácticas

1. **Usar contextos apropiados**:
   - `global`: Disponible en toda la aplicación
   - `modeller`: Solo en el workspace de modelado
   - `viewport`: Solo en el viewport 3D
   - `dialog`: Solo cuando hay diálogos abiertos

2. **Nombres descriptivos**:
   - Usar IDs jerárquicos: `category.action`
   - Ejemplo: `tools.createBox`, `edit.undo`

3. **Documentar hotkeys**:
   - Incluir descripciones claras
   - Agrupar por categorías lógicas

4. **Probar en ambas plataformas**:
   - Verificar que funcionen en macOS y Windows/Linux
   - El sistema normaliza automáticamente `Cmd`/`Ctrl`

## Troubleshooting

### El hotkey no funciona

1. Verificar que el contexto sea correcto
2. Verificar que no haya conflictos
3. Verificar que el hotkey esté habilitado
4. Verificar que el handler global esté activo

### Conflictos no detectados

- El sistema detecta conflictos al editar
- Si hay conflictos, se muestra una advertencia
- Puedes resolver conflictos rebindeando el otro hotkey primero

### Presets no se guardan

- Verificar que localStorage esté habilitado
- Los presets se guardan en `cadhy-hotkey-presets`
- Verificar la consola por errores

## Archivos Relacionados

- `services/hotkey-registry.ts` - Registro centralizado
- `stores/hotkey-store.ts` - Store de Zustand
- `hooks/use-hotkey.ts` - Hooks de React
- `components/common/KeyCaptureInput.tsx` - Componente de captura
- `components/layout/settings/HotkeySettings.tsx` - UI de personalización
- `components/layout/settings/ShortcutsTab.tsx` - Vista rápida
- `services/default-hotkeys.ts` - Definiciones por defecto

