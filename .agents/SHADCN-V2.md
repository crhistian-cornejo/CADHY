# CADHY - shadcn/ui v2 Guidelines

> **Reglas oficiales para shadcn/ui v2 con Tailwind CSS v4**

---

## 1. Configuracion (components.json)

El archivo `components.json` es **requerido al usar el CLI**.

### Inicializar

```bash
npx shadcn@latest init
```

### Configuracion Estandar (Tailwind CSS v4)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "hugeicons",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

### Reglas Criticas

| Propiedad | Regla | Nota |
|-----------|-------|------|
| `style` | Usar `"base-vega"` | Style personalizado de CADHY |
| `iconLibrary` | Usar `"hugeicons"` | NUNCA lucide u otros |
| `tailwind.config` | Dejar **vacio** `""` | Requerido para Tailwind CSS v4 |
| `tailwind.cssVariables` | Usar `true` | No se puede cambiar despues de init |
| `tailwind.baseColor` | No se puede cambiar despues de init | Opciones: `gray`, `neutral`, `slate`, `stone`, `zinc` |
| `rsc` | Usar `false` | Tauri no usa React Server Components |

---

## 2. CLI Commands

### Inicializar Proyecto

```bash
npx shadcn@latest init
```

**Opciones:**
- `-t, --template <template>` - Template: `next`, `next-monorepo`
- `-b, --base-color <color>` - Color base: `neutral`, `gray`, `zinc`, `stone`, `slate`
- `-y, --yes` - Saltar confirmacion
- `-f, --force` - Sobrescribir config existente
- `--src-dir` - Usar directorio src
- `--css-variables` - Usar CSS variables (default: true)
- `--no-base-style` - No instalar estilos base

### Agregar Componentes

```bash
npx shadcn@latest add [component]
```

**Ejemplos:**
```bash
# Un componente
npx shadcn@latest add button

# Multiples componentes
npx shadcn@latest add button card dialog

# Todos los componentes
npx shadcn@latest add -a

# Desde registry con namespace
npx shadcn@latest add @v0/dashboard
```

**Opciones:**
- `-y, --yes` - Saltar confirmacion
- `-o, --overwrite` - Sobrescribir archivos existentes
- `-a, --all` - Agregar todos los componentes
- `-p, --path <path>` - Ruta de instalacion personalizada
- `-s, --silent` - Sin output

### Ver Componentes (Antes de Instalar)

```bash
npx shadcn@latest view [items]
```

```bash
npx shadcn@latest view button card dialog
npx shadcn@latest view @acme/auth @v0/dashboard
```

### Buscar en Registries

```bash
npx shadcn@latest search [registry]
```

```bash
npx shadcn@latest search @shadcn -q "button"
npx shadcn@latest search @shadcn @v0 @acme
npx shadcn@latest list @acme  # Alias para search
```

### Build Registry

```bash
npx shadcn@latest build
```

Genera archivos JSON del registry desde `registry.json` a `public/r`.

---

## 3. Monorepo Configuration

### Estructura de Archivos

```
apps/
└── desktop/                       # Aplicacion Tauri
    ├── src/
    │   └── App.tsx
    ├── components/
    │   └── login-form.tsx         # Componentes especificos de app
    ├── components.json            # Config de app
    └── package.json

packages/
└── ui/                            # Paquete UI compartido (@cadhy/ui)
    ├── src/
    │   ├── components/
    │   │   └── button.tsx         # Componentes shadcn
    │   ├── hooks/
    │   ├── lib/
    │   │   └── utils.ts
    │   └── styles/
    │       └── globals.css
    ├── components.json            # Config de paquete UI
    └── package.json
```

### Config de App (apps/desktop/components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/global.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "hugeicons",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@cadhy/ui/lib/utils",
    "ui": "@cadhy/ui/components"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

### Config de Paquete UI (packages/ui/components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/global.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "hugeicons",
  "aliases": {
    "components": "@cadhy/ui/components",
    "utils": "@cadhy/ui/lib/utils",
    "hooks": "@cadhy/ui/hooks",
    "lib": "@cadhy/ui/lib",
    "ui": "@cadhy/ui/components"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

### Requisitos Monorepo

1. **Cada workspace necesita un `components.json`**
2. **Mismo `style`, `iconLibrary`, y `baseColor`** en todos los `components.json`
3. **Dejar `tailwind.config` vacio** para Tailwind CSS v4
4. **Aliases deben estar definidos correctamente** para resolucion de imports

### Agregar Componentes en Monorepo

Siempre ejecutar el CLI desde el directorio de la app:

```bash
cd apps/desktop
npx shadcn@latest add button
```

El CLI automaticamente:
- Instala componentes UI en `packages/ui`
- Instala blocks/pages en `apps/desktop/components`
- Maneja imports automaticamente

### Importando Componentes

```typescript
// Import desde @cadhy/ui
import { Button } from "@cadhy/ui/components/button"
import { cn } from "@cadhy/ui/lib/utils"
import { useTheme } from "@cadhy/ui/hooks/use-theme"
```

---

## 4. Namespaced Registries

### Configuracion

```json
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/{name}.json",
    "@internal": "https://internal.company.com/{name}.json"
  }
}
```

### Con Autenticacion (Registries Privados)

```json
{
  "registries": {
    "@private": {
      "url": "https://api.company.com/registry/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}",
        "X-API-Key": "${API_KEY}"
      },
      "params": {
        "version": "latest"
      }
    }
  }
}
```

Variables de entorno (`${VAR_NAME}`) se expanden automaticamente desde `.env.local`:

```bash
# .env.local
REGISTRY_TOKEN=your_token_here
API_KEY=your_api_key_here
```

### Instalando desde Registries

```bash
# Registry publico
npx shadcn@latest add @v0/dashboard

# Registry privado
npx shadcn@latest add @private/button

# Multiples fuentes
npx shadcn@latest add @acme/header @internal/auth-utils
```

---

## 5. MCP Server (Integracion AI)

El MCP Server de shadcn permite a asistentes AI buscar e instalar componentes.

### Setup para Claude Code

Agregar a `.mcp.json` en la raiz del proyecto:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

O ejecutar:
```bash
npx shadcn@latest mcp init --client claude
```

### Setup para Cursor

Agregar a `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

O ejecutar:
```bash
npx shadcn@latest mcp init --client cursor
```

### Setup para VS Code

Agregar a `.vscode/mcp.json`:

```json
{
  "servers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

O ejecutar:
```bash
npx shadcn@latest mcp init --client vscode
```

### Prompts de Ejemplo para AI

- "Show me all available components in the shadcn registry"
- "Add the button, dialog and card components to my project"
- "Create a contact form using components from the shadcn registry"
- "Install @acme/auth-form"

---

## 6. Best Practices

### DO

- Usar `"base-vega"` style (style personalizado de CADHY)
- Usar `"hugeicons"` como iconLibrary (NUNCA lucide u otros)
- Dejar `tailwind.config` vacio para Tailwind CSS v4
- Usar CSS variables para theming (`cssVariables: true`)
- Ejecutar CLI desde el directorio de la app en monorepos
- Mantener `style`, `baseColor`, y `iconLibrary` consistentes entre workspaces
- Usar aliases que coincidan con los paths de tsconfig

### DON'T

- NUNCA usar lucide, fontawesome, o cualquier otro icon library
- No cambiar `style`, `baseColor`, o `cssVariables` despues de inicializar
- No especificar ruta de `tailwind.config` con Tailwind CSS v4
- No mezclar estilos entre workspaces en un monorepo
- No copiar componentes manualmente sin usar el CLI (pierde tracking de updates)
- No commitear tokens de autenticacion (usar variables de entorno)

---

## 7. Troubleshooting

### Componente No Se Instala en la Ruta Correcta

1. Verificar `aliases.ui` en `components.json`
2. Verificar que paths de tsconfig coincidan con aliases
3. Ejecutar CLI desde el directorio correcto del workspace

### Errores de Import Despues de Instalacion

1. Verificar que config de aliases coincida con tsconfig
2. Verificar que el directorio destino exista
3. Ejecutar `bun install` para actualizar dependencias

### MCP Server No Funciona

1. Verificar configuracion de `.mcp.json`
2. Ejecutar `/mcp` en Claude Code para verificar status
3. Limpiar cache de npx: `npx clear-npx-cache`
4. Re-habilitar el MCP server en tu cliente

### Acceso Denegado al Registry

1. Verificar que variables de entorno esten configuradas
2. Verificar que URL del registry sea correcta
3. Probar con `npx shadcn@latest view @registry/component`

---

## 8. Quick Reference

| Tarea | Comando |
|-------|---------|
| Inicializar proyecto | `npx shadcn@latest init` |
| Agregar componente | `npx shadcn@latest add button` |
| Agregar todos | `npx shadcn@latest add -a` |
| Ver antes de instalar | `npx shadcn@latest view button` |
| Buscar en registry | `npx shadcn@latest search @shadcn -q "form"` |
| Listar items del registry | `npx shadcn@latest list @acme` |
| Build registry | `npx shadcn@latest build` |
| Setup MCP | `npx shadcn@latest mcp init --client claude` |

---

**Version**: shadcn/ui v2 (Latest)
**Style**: base-vega
**Icons**: hugeicons
**Tailwind CSS**: v4 Compatible
**Framework**: Tauri v2 + React 19
