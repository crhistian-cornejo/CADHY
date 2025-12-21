# REFACTOR MAJOR: Adopción de Patrones OpenCode

> **Fecha:** 2024-12-20
> **Estado:** PLANIFICADO
> **Prioridad:** ALTA
> **Estimación:** 4 fases

## Resumen Ejecutivo

Este documento detalla el plan de refactor major para adoptar las mejores prácticas identificadas en el proyecto OpenCode. El objetivo es llevar CADHY a production-grade con arquitectura robusta para AI agents, configuración, secrets y persistencia.

---

## Tabla de Contenidos

1. [Análisis de OpenCode](#1-análisis-de-opencode)
2. [Fase 1: Fundamentos](#fase-1-fundamentos)
3. [Fase 2: Sistema de Agentes](#fase-2-sistema-de-agentes)
4. [Fase 3: MCP Integration](#fase-3-mcp-integration)
5. [Fase 4: Production Ready](#fase-4-production-ready)
6. [Archivos a Modificar](#archivos-a-modificar)
7. [Breaking Changes](#breaking-changes)

---

## 1. Análisis de OpenCode

### 1.1 Estructura del Proyecto OpenCode

```
opencode/
├── .opencode/           # Configuración local
│   ├── opencode.jsonc   # Config principal
│   └── agent/           # Definiciones de agentes
├── packages/
│   ├── opencode/        # CLI principal
│   │   └── src/
│   │       ├── auth/    # Manejo de secrets
│   │       ├── agent/   # Sistema de agentes
│   │       ├── config/  # Configuración jerárquica
│   │       ├── mcp/     # Model Context Protocol
│   │       ├── session/ # Persistencia de sesiones
│   │       ├── tool/    # Registry de herramientas
│   │       └── util/    # Logging, errors, etc.
│   ├── ui/              # Componentes UI
│   └── extensions/      # Extensiones (Zed, VSCode)
├── infra/               # Infraestructura (SST)
└── .github/             # CI/CD workflows
```

### 1.2 Patrones Clave Identificados

| Patrón | Descripción | Beneficio |
|--------|-------------|-----------|
| Auth Namespace | Manejo seguro de API keys con permisos 0o600 | Seguridad |
| Config Hierarchy | Global → Proyecto → ENV → CLI | Flexibilidad |
| Agent.Info Schema | Agentes configurables via JSONC | Extensibilidad |
| Tool.define() | Registry de herramientas con Zod | Type-safety |
| NamedError | Errores tipados por dominio | Debugging |
| Instance.state() | Estado singleton con lazy init | Performance |
| MCP Client | Integración con servicios externos | Interoperabilidad |

---

## Fase 1: Fundamentos

**Objetivo:** Establecer la base arquitectónica

### 1.1 Sistema de Configuración

**Crear:** `packages/shared/src/config/`

```typescript
// config/index.ts
export namespace Config {
  // Jerarquía de configuración
  // 1. ~/.cadhy/config.jsonc (global)
  // 2. .cadhy/config.jsonc (proyecto)
  // 3. ENV vars
  // 4. CLI args

  export const Info = z.object({
    // Proyecto
    project: z.object({
      defaultModel: z.string().default("claude-opus-4-5"),
      textureSystem: z.enum(["local", "generation"]).default("local"),
      autoSave: z.boolean().default(true),
      autoSaveInterval: z.number().default(30000),
    }).optional(),

    // Proveedores AI
    provider: z.record(z.string(), z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      headers: z.record(z.string()).optional(),
    })).optional(),

    // Agentes
    agent: z.record(z.string(), Agent.Info).optional(),

    // MCP Servers
    mcp: z.record(z.string(), MCP.ServerConfig).optional(),

    // Permisos globales
    permission: z.object({
      edit: Permission,
      bash: z.record(z.string(), Permission),
      webfetch: Permission.optional(),
    }).optional(),

    // Keybindings personalizados
    keybinds: z.record(z.string(), z.string()).optional(),
  })

  export type Info = z.infer<typeof Info>

  // Funciones
  export async function get(): Promise<Info>
  export async function global(): Promise<Partial<Info>>
  export async function project(): Promise<Partial<Info>>
  export function merge(...configs: Partial<Info>[]): Info
}
```

**Archivos de configuración:**

```jsonc
// ~/.cadhy/config.jsonc (global)
{
  "$schema": "https://cadhy.app/schemas/config.json",
  "provider": {
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}"
    },
    "openai": {
      "apiKey": "${OPENAI_API_KEY}"
    }
  }
}
```

```jsonc
// .cadhy/config.jsonc (proyecto)
{
  "project": {
    "textureSystem": "local",
    "autoSave": true
  },
  "agent": {
    "modeller": {
      "model": "claude-opus-4-5",
      "permission": {
        "edit": "allow"
      }
    }
  }
}
```

### 1.2 Sistema de Autenticación

**Crear:** `packages/shared/src/auth/`

```typescript
// auth/index.ts
export namespace Auth {
  // Tipos de autenticación
  export const Oauth = z.object({
    type: z.literal("oauth"),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.number().optional(),
    clientId: z.string(),
  })

  export const Api = z.object({
    type: z.literal("api"),
    apiKey: z.string(),
  })

  export const Info = z.discriminatedUnion("type", [Oauth, Api])
  export type Info = z.infer<typeof Info>

  // Storage path
  const filepath = () => path.join(Global.Path.data, "auth.json")

  // Guardar con permisos seguros
  export async function set(provider: string, info: Info): Promise<void> {
    const file = Bun.file(filepath())
    const existing = await file.json().catch(() => ({}))

    existing[provider] = info
    await Bun.write(file, JSON.stringify(existing, null, 2))
    await fs.chmod(filepath(), 0o600) // Solo owner puede leer
  }

  // Obtener credenciales
  export async function get(provider: string): Promise<Info | undefined> {
    const file = Bun.file(filepath())
    const data = await file.json().catch(() => ({}))

    const result = Info.safeParse(data[provider])
    return result.success ? result.data : undefined
  }

  // Eliminar credenciales
  export async function remove(provider: string): Promise<void> {
    const file = Bun.file(filepath())
    const data = await file.json().catch(() => ({}))

    delete data[provider]
    await Bun.write(file, JSON.stringify(data, null, 2))
  }

  // Validar credenciales
  export async function validate(provider: string): Promise<boolean> {
    const info = await get(provider)
    if (!info) return false

    if (info.type === "oauth" && info.expiresAt) {
      return info.expiresAt > Date.now()
    }

    return true
  }
}
```

### 1.3 Sistema de Errores Tipados

**Crear:** `packages/shared/src/errors/`

```typescript
// errors/index.ts
import { z } from "zod"

export function NamedError<T extends z.ZodObject<any>>(
  name: string,
  schema: T
) {
  const ErrorClass = class extends Error {
    readonly name = name
    readonly data: z.infer<T>

    constructor(data: z.infer<T>) {
      super(data.message ?? name)
      this.data = data
    }

    static create(data: z.infer<T>) {
      return new ErrorClass(data)
    }

    static safeParse(error: unknown) {
      if (error instanceof ErrorClass) {
        return { success: true, data: error.data }
      }
      return { success: false, error }
    }
  }

  return ErrorClass
}

// Errores de dominio CADHY
export const ModelNotFoundError = NamedError(
  "ModelNotFoundError",
  z.object({
    modelId: z.string(),
    message: z.string().optional(),
  })
)

export const TextureGenerationError = NamedError(
  "TextureGenerationError",
  z.object({
    prompt: z.string(),
    provider: z.string(),
    message: z.string(),
  })
)

export const ProjectNotFoundError = NamedError(
  "ProjectNotFoundError",
  z.object({
    path: z.string(),
    message: z.string().optional(),
  })
)

export const SessionBusyError = NamedError(
  "SessionBusyError",
  z.object({
    sessionId: z.string(),
    message: z.string().optional(),
  })
)

export const MCPConnectionError = NamedError(
  "MCPConnectionError",
  z.object({
    serverName: z.string(),
    reason: z.string(),
  })
)
```

### 1.4 Sistema de Logging

**Mejorar:** `packages/shared/src/logger.ts`

```typescript
// logger.ts
export namespace Log {
  export interface Logger {
    debug(message: string, extra?: Record<string, unknown>): void
    info(message: string, extra?: Record<string, unknown>): void
    warn(message: string, extra?: Record<string, unknown>): void
    error(message: string, extra?: Record<string, unknown>): void

    // Crear sub-logger con tags
    tag(key: string, value: string): Logger

    // Timer para medir duración
    time(message: string): {
      stop(): void
      [Symbol.dispose](): void
    }
  }

  // Log file path
  let logPath: string | null = null

  export async function init(options: {
    dev?: boolean
    print?: boolean
  } = {}): Promise<void> {
    if (options.print) return

    const date = new Date().toISOString().split("T")[0]
    logPath = path.join(
      Global.Path.log,
      options.dev ? "dev.log" : `${date}.log`
    )

    // Auto-cleanup: mantener solo 7 días
    await cleanupOldLogs()
  }

  export function create(options: {
    service: string
    tags?: Record<string, string>
  }): Logger {
    const tags = { service: options.service, ...options.tags }

    const log = (level: string, message: string, extra?: Record<string, unknown>) => {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        ...tags,
        message,
        ...extra,
      }

      // Console output (dev)
      if (process.env.NODE_ENV === "development") {
        console[level as "info"](JSON.stringify(entry))
      }

      // File output (prod)
      if (logPath) {
        appendFileSync(logPath, JSON.stringify(entry) + "\n")
      }
    }

    return {
      debug: (msg, extra) => log("debug", msg, extra),
      info: (msg, extra) => log("info", msg, extra),
      warn: (msg, extra) => log("warn", msg, extra),
      error: (msg, extra) => log("error", msg, extra),

      tag: (key, value) => create({
        service: options.service,
        tags: { ...tags, [key]: value }
      }),

      time: (message) => {
        const start = performance.now()
        return {
          stop: () => {
            const duration = performance.now() - start
            log("info", message, { duration_ms: duration.toFixed(2) })
          },
          [Symbol.dispose]: function() { this.stop() }
        }
      }
    }
  }
}
```

---

## Fase 2: Sistema de Agentes

**Objetivo:** Implementar arquitectura de agentes configurable

### 2.1 Agent Schema

**Crear:** `packages/ai/src/agent/`

```typescript
// agent/schema.ts
export namespace Agent {
  export const Permission = z.enum(["allow", "deny", "ask"])

  export const Info = z.object({
    // Identidad
    name: z.string(),
    description: z.string().optional(),

    // Modo de operación
    mode: z.enum(["primary", "subagent", "background"]).default("primary"),
    hidden: z.boolean().default(false),

    // Modelo
    model: z.object({
      providerId: z.string(),
      modelId: z.string(),
    }).or(z.string()), // "provider/model" shorthand

    // Parámetros LLM
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().optional(),
    maxSteps: z.number().positive().default(50),

    // Permisos
    permission: z.object({
      edit: Permission.default("allow"),
      bash: z.record(z.string(), Permission).default({}),
      webfetch: Permission.optional(),
      external: Permission.optional(),
    }).optional(),

    // Herramientas habilitadas
    tools: z.record(z.string(), z.boolean()).default({ "*": true }),

    // System prompt adicional
    prompt: z.string().optional(),

    // Context window
    contextWindow: z.number().optional(),
  })

  export type Info = z.infer<typeof Info>

  // Registry de agentes
  const agents: Map<string, Info> = new Map()

  export async function register(name: string, info: Info): Promise<void> {
    agents.set(name, info)
  }

  export async function get(name: string): Promise<Info | undefined> {
    // 1. Check in-memory registry
    if (agents.has(name)) return agents.get(name)

    // 2. Check config file
    const config = await Config.get()
    if (config.agent?.[name]) {
      return Info.parse(config.agent[name])
    }

    // 3. Check .cadhy/agent/{name}.md
    const agentFile = path.join(".cadhy", "agent", `${name}.md`)
    if (await Bun.file(agentFile).exists()) {
      return parseAgentMarkdown(agentFile)
    }

    return undefined
  }
}
```

### 2.2 Tool Registry

**Crear:** `packages/ai/src/tool/`

```typescript
// tool/index.ts
export namespace Tool {
  export interface Context {
    sessionId: string
    messageId: string
    agent: string
    abort: AbortSignal

    // Report progress
    metadata(input: { title?: string; progress?: number }): void
  }

  export interface Result<M = unknown> {
    title: string
    output: string
    metadata?: M
    attachments?: Array<{
      type: "image" | "file"
      data: string
      mimeType: string
    }>
  }

  export interface Definition<
    Params extends z.ZodType = z.ZodType,
    Meta = unknown
  > {
    id: string
    description: string
    parameters: Params
    execute(args: z.infer<Params>, ctx: Context): Promise<Result<Meta>>
  }

  // Registry
  const tools: Map<string, Definition> = new Map()

  export function define<P extends z.ZodType, M = unknown>(
    id: string,
    init: () => Promise<Omit<Definition<P, M>, "id">>
  ): Definition<P, M> {
    // Lazy initialization
    let cached: Definition<P, M> | null = null

    const definition: Definition<P, M> = {
      id,
      get description() {
        if (!cached) throw new Error("Tool not initialized")
        return cached.description
      },
      get parameters() {
        if (!cached) throw new Error("Tool not initialized")
        return cached.parameters
      },
      async execute(args, ctx) {
        if (!cached) cached = { id, ...(await init()) }

        // Validate parameters
        const parsed = cached.parameters.safeParse(args)
        if (!parsed.success) {
          return {
            title: "Validation Error",
            output: formatZodError(parsed.error),
          }
        }

        // Execute with abort handling
        if (ctx.abort.aborted) {
          return { title: "Cancelled", output: "Operation was cancelled" }
        }

        return cached.execute(parsed.data, ctx)
      },
    }

    tools.set(id, definition as Definition)
    return definition
  }

  export function get(id: string): Definition | undefined {
    return tools.get(id)
  }

  export function list(): Definition[] {
    return Array.from(tools.values())
  }
}
```

### 2.3 Herramientas CADHY

```typescript
// tools/measurement.ts
export const MeasurementTool = Tool.define(
  "measurement",
  async () => ({
    description: "Measure distances, areas, and volumes in the 3D scene",
    parameters: z.object({
      type: z.enum(["distance", "area", "volume"]),
      objectIds: z.array(z.string()).optional(),
      points: z.array(z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      })).optional(),
    }),
    async execute(args, ctx) {
      ctx.metadata({ title: "Measuring..." })

      const service = getMeasurementService()
      const result = await service.measure(args)

      return {
        title: "Measurement Complete",
        output: `${args.type}: ${result.value} ${result.unit}`,
        metadata: { value: result.value, unit: result.unit },
      }
    }
  })
)

// tools/texture-generation.ts
export const TextureGenerationTool = Tool.define(
  "texture-generation",
  async () => ({
    description: "Generate PBR textures using AI based on a description",
    parameters: z.object({
      prompt: z.string().describe("Description of the texture to generate"),
      style: z.enum(["realistic", "stylized", "technical"]).default("realistic"),
      resolution: z.enum(["512", "1024", "2048"]).default("1024"),
    }),
    async execute(args, ctx) {
      ctx.metadata({ title: "Generating texture..." })

      const service = getTextureService()
      const texture = await service.generate(args.prompt, {
        style: args.style,
        resolution: parseInt(args.resolution),
        abort: ctx.abort,
      })

      return {
        title: "Texture Generated",
        output: `Created texture: ${texture.name}`,
        metadata: { textureId: texture.id },
        attachments: [{
          type: "image",
          data: texture.preview,
          mimeType: "image/png",
        }],
      }
    }
  })
)

// tools/scene-analysis.ts
export const SceneAnalysisTool = Tool.define(
  "scene-analysis",
  async () => ({
    description: "Analyze the current 3D scene and provide insights",
    parameters: z.object({
      focus: z.enum(["geometry", "materials", "lighting", "performance", "all"]),
    }),
    async execute(args, ctx) {
      ctx.metadata({ title: "Analyzing scene..." })

      const scene = useModellerStore.getState()
      const analysis = analyzeScene(scene, args.focus)

      return {
        title: "Scene Analysis",
        output: formatAnalysis(analysis),
        metadata: analysis,
      }
    }
  })
)
```

### 2.4 Session Management

**Crear:** `packages/ai/src/session/`

```typescript
// session/index.ts
export namespace Session {
  export const Info = z.object({
    id: z.string(),
    projectId: z.string(),
    agentName: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    messageCount: z.number(),
    summary: z.string().optional(),
  })

  export type Info = z.infer<typeof Info>

  // Control de concurrencia
  const busy: Map<string, AbortController> = new Map()

  export class BusyError extends Error {
    constructor(sessionId: string) {
      super(`Session ${sessionId} is busy`)
    }
  }

  export function assertNotBusy(sessionId: string): void {
    if (busy.has(sessionId)) {
      throw new BusyError(sessionId)
    }
  }

  export function markBusy(sessionId: string): AbortController {
    assertNotBusy(sessionId)
    const controller = new AbortController()
    busy.set(sessionId, controller)
    return controller
  }

  export function markIdle(sessionId: string): void {
    busy.delete(sessionId)
  }

  export function cancel(sessionId: string): boolean {
    const controller = busy.get(sessionId)
    if (controller) {
      controller.abort()
      busy.delete(sessionId)
      return true
    }
    return false
  }
}

// session/storage.ts
export namespace SessionStorage {
  const basePath = () => path.join(Global.Path.data, "sessions")

  export async function save(
    projectId: string,
    sessionId: string,
    data: SessionData
  ): Promise<void> {
    const dir = path.join(basePath(), projectId)
    await fs.mkdir(dir, { recursive: true })

    const file = path.join(dir, `${sessionId}.json`)
    await Bun.write(file, JSON.stringify(data, null, 2))
  }

  export async function load(
    projectId: string,
    sessionId: string
  ): Promise<SessionData | null> {
    const file = path.join(basePath(), projectId, `${sessionId}.json`)
    return Bun.file(file).json().catch(() => null)
  }

  export async function list(projectId: string): Promise<Session.Info[]> {
    const dir = path.join(basePath(), projectId)
    const files = await glob.scan({ cwd: dir, pattern: "*.json" })

    const sessions: Session.Info[] = []
    for await (const file of files) {
      const data = await Bun.file(path.join(dir, file)).json()
      sessions.push(Session.Info.parse(data.info))
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  // Migraciones
  const MIGRATIONS: Array<(dir: string) => Promise<void>> = [
    // v1: Initial format
    async () => {},
    // v2: Add summary field
    async (dir) => {
      // Migrate existing sessions
    },
  ]

  export async function migrate(): Promise<void> {
    const versionFile = path.join(basePath(), ".version")
    const currentVersion = await Bun.file(versionFile).text().catch(() => "0")

    for (let i = parseInt(currentVersion); i < MIGRATIONS.length; i++) {
      await MIGRATIONS[i](basePath())
    }

    await Bun.write(versionFile, String(MIGRATIONS.length))
  }
}
```

---

## Fase 3: MCP Integration

**Objetivo:** Integrar Model Context Protocol para extensibilidad

### 3.1 MCP Client

**Crear:** `packages/ai/src/mcp/`

```typescript
// mcp/index.ts
export namespace MCP {
  export const ServerConfig = z.object({
    type: z.enum(["stdio", "sse", "http"]),
    command: z.array(z.string()).optional(),
    url: z.string().optional(),
    env: z.record(z.string()).optional(),
    enabled: z.boolean().default(true),
  })

  export const Status = z.discriminatedUnion("status", [
    z.object({ status: z.literal("connected") }),
    z.object({ status: z.literal("disabled") }),
    z.object({ status: z.literal("failed"), error: z.string() }),
    z.object({ status: z.literal("needs_auth") }),
  ])

  export type ServerConfig = z.infer<typeof ServerConfig>
  export type Status = z.infer<typeof Status>

  // State
  const clients: Map<string, MCPClient> = new Map()
  const statuses: Map<string, Status> = new Map()

  export async function init(): Promise<void> {
    const config = await Config.get()
    if (!config.mcp) return

    await Promise.all(
      Object.entries(config.mcp).map(async ([name, serverConfig]) => {
        if (!serverConfig.enabled) {
          statuses.set(name, { status: "disabled" })
          return
        }

        try {
          const client = await connect(name, serverConfig)
          clients.set(name, client)
          statuses.set(name, { status: "connected" })
        } catch (error) {
          statuses.set(name, {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      })
    )
  }

  export function getStatus(name: string): Status {
    return statuses.get(name) ?? { status: "disabled" }
  }

  export function getClient(name: string): MCPClient | undefined {
    return clients.get(name)
  }

  // List all tools from all connected MCP servers
  export async function listTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = []

    for (const [name, client] of clients) {
      const tools = await client.listTools()
      allTools.push(...tools.map(t => ({ ...t, server: name })))
    }

    return allTools
  }

  // Execute tool on specific MCP server
  export async function executeTool(
    server: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = clients.get(server)
    if (!client) {
      throw MCPConnectionError.create({
        serverName: server,
        reason: "Server not connected",
      })
    }

    return client.callTool(toolName, args)
  }
}
```

### 3.2 Blender MCP Server (Ejemplo)

```python
# scripts/mcp/blender_server.py
"""
MCP Server for Blender integration.
Exposes Blender operations as MCP tools.
"""

import json
import sys
from typing import Any

# MCP Protocol
def send_response(id: str, result: Any):
    response = {"jsonrpc": "2.0", "id": id, "result": result}
    print(json.dumps(response), flush=True)

def send_error(id: str, code: int, message: str):
    response = {"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}}
    print(json.dumps(response), flush=True)

# Tools
TOOLS = {
    "blender/import-model": {
        "description": "Import a 3D model into Blender",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the model file"},
                "format": {"type": "string", "enum": ["obj", "fbx", "gltf", "stl"]},
            },
            "required": ["path"]
        }
    },
    "blender/export-model": {
        "description": "Export the current scene or selection",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "format": {"type": "string", "enum": ["obj", "fbx", "gltf", "stl"]},
                "selection_only": {"type": "boolean", "default": False}
            },
            "required": ["path"]
        }
    },
    "blender/apply-material": {
        "description": "Apply a PBR material to an object",
        "parameters": {
            "type": "object",
            "properties": {
                "object_name": {"type": "string"},
                "material": {
                    "type": "object",
                    "properties": {
                        "base_color": {"type": "string"},
                        "metallic": {"type": "number"},
                        "roughness": {"type": "number"},
                        "normal_map": {"type": "string"},
                    }
                }
            },
            "required": ["object_name", "material"]
        }
    }
}

def handle_tools_list(id: str):
    tools = [{"name": name, **info} for name, info in TOOLS.items()]
    send_response(id, {"tools": tools})

def handle_tool_call(id: str, name: str, arguments: dict):
    try:
        if name == "blender/import-model":
            # Blender import logic
            result = {"success": True, "objects_imported": 1}
        elif name == "blender/export-model":
            # Blender export logic
            result = {"success": True, "path": arguments["path"]}
        elif name == "blender/apply-material":
            # Material application logic
            result = {"success": True}
        else:
            send_error(id, -32601, f"Unknown tool: {name}")
            return

        send_response(id, {"content": [{"type": "text", "text": json.dumps(result)}]})
    except Exception as e:
        send_error(id, -32000, str(e))

# Main loop
def main():
    for line in sys.stdin:
        try:
            request = json.loads(line)
            method = request.get("method")
            id = request.get("id")
            params = request.get("params", {})

            if method == "tools/list":
                handle_tools_list(id)
            elif method == "tools/call":
                handle_tool_call(id, params.get("name"), params.get("arguments", {}))
            else:
                send_error(id, -32601, f"Unknown method: {method}")
        except json.JSONDecodeError:
            pass

if __name__ == "__main__":
    main()
```

---

## Fase 4: Production Ready

**Objetivo:** CI/CD, testing, documentación

### 4.1 GitHub Actions Workflow

**Crear:** `.github/workflows/build.yml`

```yaml
name: Build & Release

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun lint
      - run: bun typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test

  build-desktop:
    needs: test
    strategy:
      matrix:
        include:
          - os: macos-14
            target: aarch64-apple-darwin
            name: macos-arm64
          - os: macos-13
            target: x86_64-apple-darwin
            name: macos-x64
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            name: linux-x64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            name: windows-x64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Linux)
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev

      - run: bun install
      - run: bun run build:desktop

      - uses: actions/upload-artifact@v4
        with:
          name: cadhy-${{ matrix.name }}
          path: |
            apps/desktop/src-tauri/target/release/bundle/
            !**/*.d

  release:
    if: startsWith(github.ref, 'refs/tags/')
    needs: build-desktop
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            cadhy-*/*
          generate_release_notes: true
```

### 4.2 Test Coverage

```typescript
// packages/shared/src/__tests__/config.test.ts
import { test, expect, beforeEach } from "bun:test"
import { Config } from "../config"
import { tmpdir } from "./fixtures"

beforeEach(async () => {
  // Reset config state
})

test("loads default config when no files exist", async () => {
  await using tmp = await tmpdir()

  const config = await Config.get()

  expect(config.project?.textureSystem).toBe("local")
  expect(config.project?.autoSave).toBe(true)
})

test("merges global and project configs", async () => {
  await using tmp = await tmpdir({
    files: {
      ".cadhy/config.jsonc": JSON.stringify({
        project: { textureSystem: "generation" }
      })
    }
  })

  const config = await Config.get()

  expect(config.project?.textureSystem).toBe("generation")
})

test("validates config with zod schema", async () => {
  await using tmp = await tmpdir({
    files: {
      ".cadhy/config.jsonc": JSON.stringify({
        project: { textureSystem: "invalid" }
      })
    }
  })

  await expect(Config.get()).rejects.toThrow()
})
```

---

## Archivos a Modificar

### Nuevos Archivos

```
packages/shared/src/
├── auth/
│   └── index.ts           # Auth namespace
├── config/
│   └── index.ts           # Config system
├── errors/
│   └── index.ts           # NamedError pattern
└── logger.ts              # Enhanced logging

packages/ai/src/
├── agent/
│   ├── index.ts           # Agent registry
│   └── schema.ts          # Agent.Info schema
├── mcp/
│   ├── index.ts           # MCP client
│   └── auth.ts            # MCP OAuth
├── session/
│   ├── index.ts           # Session management
│   └── storage.ts         # Persistence
└── tool/
    ├── index.ts           # Tool registry
    └── tools/             # Built-in tools
        ├── measurement.ts
        ├── texture.ts
        └── scene.ts

.cadhy/
├── config.jsonc           # Project config template
└── agent/
    ├── modeller.md        # Default modeller agent
    └── analyst.md         # Analysis agent

.github/workflows/
├── build.yml              # CI/CD pipeline
└── release.yml            # Release workflow

scripts/mcp/
└── blender_server.py      # Blender MCP server
```

### Archivos a Refactorizar

| Archivo | Cambio |
|---------|--------|
| `packages/ai/src/providers/` | Usar Provider namespace pattern |
| `apps/desktop/src/services/ai-service.ts` | Integrar Tool registry |
| `apps/desktop/src/stores/chat-store.ts` | Usar Session namespace |
| `apps/desktop/src/services/chat-persistence.ts` | Migrar a SessionStorage |
| `apps/desktop/src/hooks/useAIChat.ts` | Usar Agent.Info |

---

## Breaking Changes

### API Changes

1. **Config API**
   - Antes: `import.meta.env.VITE_*`
   - Después: `Config.get().provider.anthropic.apiKey`

2. **Session API**
   - Antes: `chatPersistence.saveSession()`
   - Después: `SessionStorage.save(projectId, sessionId, data)`

3. **Tool API**
   - Antes: `ai.tools.measure()`
   - Después: `Tool.get("measurement")?.execute(args, ctx)`

### Migration Guide

```typescript
// Antes
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

// Después
const config = await Config.get()
const auth = await Auth.get("anthropic")
const apiKey = auth?.type === "api" ? auth.apiKey : config.provider?.anthropic?.apiKey
```

---

## Timeline Estimado

| Fase | Componentes | Dependencias |
|------|-------------|--------------|
| 1 | Config, Auth, Errors, Logger | Ninguna |
| 2 | Agent, Tool, Session | Fase 1 |
| 3 | MCP Client, Blender Server | Fase 2 |
| 4 | CI/CD, Tests, Docs | Fase 1-3 |

---

## Checklist Pre-Implementación

- [ ] Backup de código actual
- [ ] Crear branch `refactor/opencode-patterns`
- [ ] Documentar API actual para migración
- [ ] Definir feature flags para rollout gradual
- [ ] Preparar tests de regresión

---

## Referencias

- [OpenCode Repository](https://github.com/sst/opencode)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [AI SDK Documentation](https://sdk.vercel.ai/)
- [Zod Documentation](https://zod.dev/)
