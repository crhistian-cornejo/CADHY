/**
 * useAIChat Hook - CADHY
 *
 * React hook for AI chat functionality with streaming support.
 * Handles message state, tool execution, and object creation.
 *
 * Uses chat-store as the single source of truth for messages.
 * The store handles persistence automatically.
 */

import type {
  AddStillingBasinResult,
  AlignObjectsResult,
  AnalysisResult,
  ArrayObjectsResult,
  BooleanIntersectResult,
  BooleanSubtractResult,
  // Boolean operations
  BooleanUnionResult,
  CadToolResult,
  ClearSceneResult,
  CopyObjectsResult,
  CreateChannelResult,
  CreateChuteResult,
  CreateTransitionResult,
  DeleteObjectResult,
  DistributeObjectsResult,
  DuplicateObjectResult,
  ExportSceneResult,
  FocusObjectsResult,
  GetObjectInfoResult,
  // Scene tools - Context
  GetSceneInfoResult,
  MeasureDistanceResult,
  ModifyChannelResult,
  ModifyShapeResult,
  MoveObjectResult,
  PolarArrayResult,
  RedoResult,
  RenameObjectResult,
  RotateObjectResult,
  ScaleObjectResult,
  SelectObjectsResult,
  SetCameraViewResult,
  SetLayerResult,
  SetLODResult,
  SetLockedResult,
  // GetHistoryInfoResult - not needed, handler reads directly from store
  // Scene tools - Manipulation
  SetMaterialResult,
  SetVisibilityResult,
  TransformObjectResult,
  // Scene tools - History & UX
  UndoResult,
} from "@cadhy/ai"
import {
  getAvailableModelsForProvider,
  getFilteredModels,
  type ModelGroup,
  type ProviderAvailability,
} from "@cadhy/ai"
import { logger } from "@cadhy/shared/logger"
import { useCallback, useEffect, useRef, useState } from "react"
import { useCAD } from "@/hooks/useCAD"
import {
  type ChatMessage,
  getApiKey,
  hasApiKey,
  type ModelConfig,
  streamChat,
  type ToolCallResult,
} from "@/services/ai-service"
import { exportObjects } from "@/services/export-service"
import {
  analyzeChannel,
  analyzeWaterProfile,
  type ChannelSectionType,
  calculateCriticalDepth,
  calculateNormalDepth,
  type FlowAnalysis,
  sectionToChannelParams,
} from "@/services/hydraulics-service"
import { useChatStore } from "@/stores/chat-store"
import {
  type ChannelObject,
  type ChuteObject,
  formatSceneContextForPrompt,
  type TransitionObject,
  useModellerStore,
} from "@/stores/modeller-store"
import { useSettingsStore } from "@/stores/settings-store"

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Keywords that indicate the user is asking about the 3D scene/viewer.
 * When detected, we activate the "analyzing scene" visual effect.
 * Includes both English and Spanish terms.
 */
const SCENE_KEYWORDS = [
  // English - viewer/scene related
  "viewer",
  "viewport",
  "scene",
  "3d",
  "canvas",
  "screen",
  // English - objects
  "model",
  "channel",
  "channels",
  "object",
  "objects",
  "geometry",
  "mesh",
  "shape",
  "transition",
  "transitions",
  "box",
  "cylinder",
  "sphere",
  "cone",
  "torus",
  "chute",
  "chutes",
  "basin",
  "stilling",
  // English - actions
  "what do you see",
  "what's in",
  "analyze",
  "look at",
  "show me",
  "describe",
  "how many",
  "list all",
  "what is",
  "tell me about",
  // English - modification actions
  "change",
  "modify",
  "update",
  "set",
  "make",
  "edit",
  "delete",
  "remove",
  "duplicate",
  "copy",
  // English - connection keywords (CRITICAL for AI to receive context)
  "connect",
  "connected",
  "connection",
  "upstream",
  "downstream",
  "link",
  "join",
  "after",
  "before",
  "following",
  "previous",
  "next",
  "chain",
  "sequence",
  // English - creation keywords (always need context)
  "create",
  "add",
  "new",
  "build",
  "design",
  "place",
  // Spanish - viewer/scene related
  "visor",
  "vista",
  "escena",
  "pantalla",
  "ventana",
  // Spanish - objects
  "modelo",
  "canal",
  "canales",
  "objeto",
  "objetos",
  "geometría",
  "malla",
  "forma",
  "transición",
  "transiciones",
  "caja",
  "cilindro",
  "esfera",
  "cono",
  "toro",
  "rápida",
  "rápidas",
  "cuenco",
  "disipador",
  // Spanish - actions
  "qué ves",
  "qué hay",
  "analiza",
  "mirá",
  "mostrame",
  "describí",
  "describe",
  "cuántos",
  "listá",
  "qué es",
  "contame",
  // Spanish - modification actions
  "cambia",
  "cambiale",
  "modifica",
  "actualiza",
  "ponele",
  "hacé",
  "edita",
  "elimina",
  "borra",
  "duplica",
  "copia",
  // Spanish - connection keywords (CRITICAL for AI to receive context)
  "conectar",
  "conectalo",
  "conectá",
  "conectado",
  "conexión",
  "aguas arriba",
  "aguas abajo",
  "unir",
  "unilo",
  "enlazar",
  "después",
  "antes",
  "siguiente",
  "anterior",
  "cadena",
  "secuencia",
  // Spanish - creation keywords (always need context)
  "creá",
  "crear",
  "agregá",
  "agregar",
  "nuevo",
  "nueva",
  "construir",
  "diseñar",
  "colocar",
] as const

/** Minimum time to show the analyzing effect (ms) */
const MIN_ANALYZING_DURATION = 1500

// =============================================================================
// TYPES
// =============================================================================

/** Extract provider from model ID (e.g., "anthropic/claude-sonnet-4.5" -> "anthropic") */
function getProviderFromModelId(modelId: string): string {
  const parts = modelId.split("/")
  return parts[0] || "openai"
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  toolCalls?: ToolCallInfo[]
  isStreaming?: boolean
  /** Model ID used for this message (for assistant messages) */
  modelId?: string
  /** Provider used for this message (e.g., "anthropic", "openai") */
  provider?: string
}

// Alias for backward compatibility
export type AIChatMessage = Message

export interface ToolCallInfo {
  name: string
  status: "pending" | "running" | "completed" | "failed"
  args?: Record<string, unknown>
  result?: string
}

export interface UseAIChatOptions {
  systemPrompt?: string
  onError?: (error: Error) => void
}

export interface UseAIChatReturn {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  sendMessage: (content?: string) => Promise<void>
  isLoading: boolean
  stop: () => void
  clear: () => void
  hasApiKey: boolean
  checkApiKey: () => Promise<boolean>
  modelId: string
  setModelId: (id: string) => void
  /** Grouped models for UI display with provider separators */
  modelGroups: ModelGroup[]
  /** Flat list of available models (for backward compatibility) */
  availableModels: ModelConfig[]
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  // -------------------------------------------------------------------------
  // Store State (Source of Truth)
  // -------------------------------------------------------------------------
  const messages = useChatStore((s) => s.currentMessages)
  const setMessages = useChatStore((s) => s.setCurrentMessages)
  const modelId = useChatStore((s) => s.selectedModelId)
  const setModelId = useChatStore((s) => s.setSelectedModelId)
  const saveSession = useChatStore((s) => s.saveCurrentSession)
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const setAnalyzingScene = useChatStore((s) => s.setAnalyzingScene)
  const addUsage = useChatStore((s) => s.addUsage)

  // AI Provider state from settings store
  const ai = useSettingsStore((s) => s.ai)

  // -------------------------------------------------------------------------
  // Computed: Available Models based on Provider Availability
  // -------------------------------------------------------------------------
  const providerAvailability: ProviderAvailability = {
    hasGeminiOAuth: ai.geminiOAuthStatus?.isValid ?? false,
    hasOllamaLocal: ai.ollamaLocalStatus?.available ?? false,
    ollamaModels: ai.ollamaLocalStatus?.models ?? [],
    hasBYOKKeys: ai.hasOpenAIKey || ai.hasAnthropicKey || ai.hasGoogleKey,
    hasOpenAIKey: ai.hasOpenAIKey,
    hasAnthropicKey: ai.hasAnthropicKey,
    hasGoogleKey: ai.hasGoogleKey,
    hasOllamaCloud: ai.hasOllamaCloudKey,
    activeProvider: ai.activeProvider,
  }

  const modelGroups = getAvailableModelsForProvider(providerAvailability)
  const availableModels = getFilteredModels(providerAvailability)

  // -------------------------------------------------------------------------
  // Local State (UI-only, not persisted)
  // -------------------------------------------------------------------------
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeyExists, setApiKeyExists] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messageIdCounter = useRef(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyzingStartTimeRef = useRef<number | null>(null)

  // Store functions for creating objects
  const addObject = useModellerStore((s) => s.addObject)
  const select = useModellerStore((s) => s.select)
  const getObjectById = useModellerStore((s) => s.getObjectById)
  const updateObject = useModellerStore((s) => s.updateObject)
  const deleteObject = useModellerStore((s) => s.deleteObject)
  const objects = useModellerStore((s) => s.objects)

  // CAD hooks for shape creation
  const {
    createBoxShape,
    createCylinderShape,
    createSphereShape,
    createConeShape,
    createTorusShape,
  } = useCAD()

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  // Generate unique message ID
  const generateId = useCallback(() => {
    messageIdCounter.current += 1
    return `msg-${Date.now()}-${messageIdCounter.current}`
  }, [])

  // Check if message contains scene-related keywords
  const containsSceneKeywords = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase()
    return SCENE_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()))
  }, [])

  // Stop analyzing scene effect with minimum duration
  const stopAnalyzingScene = useCallback(() => {
    if (analyzingStartTimeRef.current === null) return

    const elapsed = Date.now() - analyzingStartTimeRef.current
    const remaining = MIN_ANALYZING_DURATION - elapsed

    if (remaining > 0) {
      // Wait for minimum duration before stopping
      setTimeout(() => {
        setAnalyzingScene(false)
        analyzingStartTimeRef.current = null
      }, remaining)
    } else {
      setAnalyzingScene(false)
      analyzingStartTimeRef.current = null
    }
  }, [setAnalyzingScene])

  // Debounced save (avoid saving on every keystroke during streaming)
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSession()
    }, 1000)
  }, [saveSession])

  // Check for API key on mount
  useEffect(() => {
    hasApiKey().then(setApiKeyExists)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const checkApiKey = useCallback(async () => {
    const exists = await hasApiKey()
    setApiKeyExists(exists)
    return exists
  }, [])

  // -------------------------------------------------------------------------
  // Tool Result Handler
  // -------------------------------------------------------------------------

  const handleToolResult = useCallback(
    async (result: ToolCallResult): Promise<string> => {
      logger.log("[useAIChat] handleToolResult RAW INPUT:", JSON.stringify(result, null, 2))
      logger.log("[useAIChat] handleToolResult called:", {
        toolName: result.toolName,
        toolCallId: result.toolCallId,
        args: result.args,
        argsKeys: result.args ? Object.keys(result.args) : "NO ARGS",
        result: result.result,
        resultKeys:
          result.result && typeof result.result === "object"
            ? Object.keys(result.result as object)
            : "NO RESULT",
        resultType: typeof result.result,
      })

      // Map tool names to actions - needed for inference
      const toolNameToAction: Record<string, string> = {
        createBox: "createShape",
        createCylinder: "createShape",
        createSphere: "createShape",
        createCone: "createShape",
        createTorus: "createShape",
        modifyShape: "modifyShape",
        createRectangularChannel: "createChannel",
        createTrapezoidalChannel: "createChannel",
        createTriangularChannel: "createChannel",
        createChute: "createChute",
        addStillingBasin: "addStillingBasin",
        createTransition: "createTransition",
        analyzeNormalFlow: "analyzeNormalFlow",
        calculateDischargeDepth: "calculateNormalDepth",
        calculateCriticalDepth: "calculateCriticalDepth",
        analyzeGVF: "analyzeGVF",
        modifyChannel: "modifyChannel",
        deleteObject: "deleteObject",
        duplicateObject: "duplicateObject",
        exportScene: "exportScene",
        // Boolean operations
        booleanUnion: "booleanUnion",
        booleanSubtract: "booleanSubtract",
        booleanIntersect: "booleanIntersect",
        // Scene tools - Context
        getSceneInfo: "getSceneInfo",
        getObjectInfo: "getObjectInfo",
        measureDistance: "measureDistance",
        // Scene tools - History & UX
        undo: "undo",
        redo: "redo",
        clearScene: "clearScene",
        getHistoryInfo: "getHistoryInfo",
        // Scene tools - Manipulation
        setMaterial: "setMaterial",
        moveObject: "moveObject",
        rotateObject: "rotateObject",
        scaleObject: "scaleObject",
        transformObject: "transformObject",
        setVisibility: "setVisibility",
        setLocked: "setLocked",
        selectObjects: "selectObjects",
        renameObject: "renameObject",
        copyObjects: "copyObjects",
        focusObjects: "focusObjects",
        setCameraView: "setCameraView",
        alignObjects: "alignObjects",
        distributeObjects: "distributeObjects",
        arrayObjects: "arrayObjects",
        polarArray: "polarArray",
        setLayer: "setLayer",
        setLOD: "setLOD",
      }

      // Map tool names to shape types for CAD tools
      const toolNameToShapeType: Record<string, string> = {
        createBox: "box",
        createCylinder: "cylinder",
        createSphere: "sphere",
        createCone: "cone",
        createTorus: "torus",
      }

      // Build toolResult from available data
      // Priority: result.result > result.args > inferred from toolName
      let toolResult: Record<string, unknown>

      if (result.result && typeof result.result === "object") {
        // Best case: we have the actual tool result
        toolResult = result.result as Record<string, unknown>
        logger.log("[useAIChat] Using result.result:", toolResult)
      } else if (
        result.args &&
        typeof result.args === "object" &&
        Object.keys(result.args).length > 0
      ) {
        // Fallback: build result from args (this happens when SDK doesn't pass result properly)
        logger.log("[useAIChat] Building result from args:", result.args)
        const args = result.args as Record<string, unknown>
        const inferredAction = toolNameToAction[result.toolName]
        const shapeType = toolNameToShapeType[result.toolName]

        if (inferredAction === "createShape" && shapeType) {
          // For CAD shape creation, build the expected result structure
          toolResult = {
            action: inferredAction,
            shapeType,
            parameters: { ...args },
            name: args.name ?? shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
            position: args.position ?? { x: 0, y: 0, z: 0 },
          }
          // Remove name and position from parameters since they're top-level
          delete (toolResult.parameters as Record<string, unknown>).name
          delete (toolResult.parameters as Record<string, unknown>).position
        } else if (inferredAction === "modifyShape") {
          // For modifyShape, build the expected structure from args
          const { shapeId, ...updates } = args
          toolResult = {
            action: inferredAction,
            shapeId,
            updates,
          }
        } else if (inferredAction === "modifyChannel") {
          // For modifyChannel, build the expected structure from args
          const { channelId, ...updates } = args
          toolResult = {
            action: inferredAction,
            channelId,
            updates,
          }
        } else if (inferredAction === "setMaterial") {
          // For setMaterial, build the expected structure from args
          const { objectIds, color, opacity, metalness, roughness } = args
          // Normalize objectIds to array
          const ids = Array.isArray(objectIds) ? objectIds : [objectIds]
          toolResult = {
            action: inferredAction,
            objectIds: ids,
            material: { color, opacity, metalness, roughness },
          }
        } else if (inferredAction) {
          // For other tools, just add the action to the args
          toolResult = { ...args, action: inferredAction }
        } else {
          console.error("[useAIChat] Unknown tool, cannot build result:", result.toolName)
          return `Error: Unknown tool "${result.toolName}"`
        }
      } else {
        // Last resort: we have nothing useful - try to get a meaningful error
        console.error("[useAIChat] No result or args available for tool:", result.toolName, {
          result: result.result,
          args: result.args,
          toolCallId: result.toolCallId,
        })
        return `Error: Tool "${result.toolName}" returned no data.\n\nThe tool may have been called incorrectly.\nToolCallId: ${result.toolCallId}`
      }

      // Ensure action is set
      if (!toolResult.action) {
        const inferredAction = toolNameToAction[result.toolName]
        if (inferredAction) {
          toolResult.action = inferredAction
          logger.log("[useAIChat] Inferred action:", inferredAction)
        } else {
          console.error("[useAIChat] Could not determine action for tool:", result.toolName)
          return `Error: Could not determine action for tool "${result.toolName}"`
        }
      }

      const finalAction = toolResult.action as string
      logger.log("[useAIChat] Processing action:", finalAction)

      try {
        // Handle CAD shape creation
        if (finalAction === "createShape") {
          const cadResult = toolResult as unknown as CadToolResult

          switch (cadResult.shapeType) {
            case "box": {
              const id = await createBoxShape({
                width: cadResult.parameters.width,
                depth: cadResult.parameters.depth,
                height: cadResult.parameters.height,
                name: cadResult.name,
              })
              if (id) {
                select(id)
                return `Created ${cadResult.name}`
              }
              break
            }
            case "cylinder": {
              const id = await createCylinderShape({
                radius: cadResult.parameters.radius,
                height: cadResult.parameters.height,
                name: cadResult.name,
              })
              if (id) {
                select(id)
                return `Created ${cadResult.name}`
              }
              break
            }
            case "sphere": {
              const id = await createSphereShape({
                radius: cadResult.parameters.radius,
                name: cadResult.name,
              })
              if (id) {
                select(id)
                return `Created ${cadResult.name}`
              }
              break
            }
            case "cone": {
              const id = await createConeShape?.({
                baseRadius: cadResult.parameters.bottomRadius,
                topRadius: cadResult.parameters.topRadius,
                height: cadResult.parameters.height,
                name: cadResult.name,
              })
              if (id) {
                select(id)
                return `Created ${cadResult.name}`
              }
              break
            }
            case "torus": {
              const id = await createTorusShape?.({
                majorRadius: cadResult.parameters.majorRadius,
                minorRadius: cadResult.parameters.minorRadius,
                name: cadResult.name,
              })
              if (id) {
                select(id)
                return `Created ${cadResult.name}`
              }
              break
            }
          }
          return `Failed to create ${cadResult.shapeType}`
        }

        // Handle channel creation
        if (finalAction === "createChannel") {
          const channelResult = toolResult as unknown as CreateChannelResult & {
            upstreamChannelName?: string | null
          }
          const { connectElements } = useModellerStore.getState()
          const currentObjects = useModellerStore.getState().objects

          // Resolve upstream connection: prefer ID, fallback to name lookup
          let upstreamId = channelResult.upstreamChannelId
          if (!upstreamId && channelResult.upstreamChannelName) {
            const found = currentObjects.find(
              (o) => o.name.toLowerCase() === channelResult.upstreamChannelName?.toLowerCase()
            )
            if (found) {
              upstreamId = found.id
              logger.log(
                `[useAIChat] Resolved upstream by name: "${channelResult.upstreamChannelName}" → ${upstreamId}`
              )
            } else {
              logger.warn(
                `[useAIChat] Could not find upstream element by name: "${channelResult.upstreamChannelName}"`
              )
            }
          }

          // Build channel object - initially without connection (will be set by connectElements)
          const channelData: Omit<ChannelObject, "id" | "createdAt" | "updatedAt"> = {
            type: "channel",
            name: channelResult.name,
            layerId: "default",
            visible: true,
            locked: false,
            selected: false,
            section: channelResult.section as ChannelObject["section"],
            alignment: [],
            manningN: channelResult.manningN,
            slope: channelResult.slope,
            length: channelResult.length,
            thickness: channelResult.thickness,
            freeBoard: channelResult.freeBoard,
            startStation: 0,
            startElevation: 0,
            upstreamChannelId: null, // Will be set by connectElements
            downstreamChannelId: null,
            endStation: channelResult.length,
            endElevation: -(channelResult.length * channelResult.slope),
            material: {
              color: "#0ea5e9",
              opacity: 1,
              metalness: 0.1,
              roughness: 0.6,
            },
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            metadata: {},
          }

          const id = addObject(channelData)

          // If connecting to upstream, establish connection and propagate positions
          if (upstreamId) {
            connectElements(upstreamId, id)
          }

          select(id)
          return `Created ${channelResult.name} (ID: ${id})`
        }

        // Handle transition creation
        if (finalAction === "createTransition") {
          const transitionResult = toolResult as unknown as CreateTransitionResult & {
            upstreamChannelName?: string | null
            downstreamChannelName?: string | null
            dropHeight?: number
          }
          const { connectElements } = useModellerStore.getState()
          const currentObjects = useModellerStore.getState().objects

          // Resolve upstream connection: prefer ID, fallback to name lookup
          let upstreamId = transitionResult.upstreamChannelId
          if (!upstreamId && transitionResult.upstreamChannelName) {
            const found = currentObjects.find(
              (o) => o.name.toLowerCase() === transitionResult.upstreamChannelName?.toLowerCase()
            )
            if (found) {
              upstreamId = found.id
              logger.log(
                `[useAIChat] Resolved upstream by name: "${transitionResult.upstreamChannelName}" → ${upstreamId}`
              )
            } else {
              logger.warn(
                `[useAIChat] Could not find upstream element by name: "${transitionResult.upstreamChannelName}"`
              )
            }
          }

          // Resolve downstream connection: prefer ID, fallback to name lookup
          let downstreamId = transitionResult.downstreamChannelId
          if (!downstreamId && transitionResult.downstreamChannelName) {
            const found = currentObjects.find(
              (o) => o.name.toLowerCase() === transitionResult.downstreamChannelName?.toLowerCase()
            )
            if (found) {
              downstreamId = found.id
              logger.log(
                `[useAIChat] Resolved downstream by name: "${transitionResult.downstreamChannelName}" → ${downstreamId}`
              )
            } else {
              logger.warn(
                `[useAIChat] Could not find downstream element by name: "${transitionResult.downstreamChannelName}"`
              )
            }
          }

          // Calculate end elevation based on dropHeight if provided
          const dropHeight = transitionResult.dropHeight ?? 0

          const transitionData: Omit<TransitionObject, "id" | "createdAt" | "updatedAt"> = {
            type: "transition",
            name: transitionResult.name,
            layerId: "default",
            visible: true,
            locked: false,
            selected: false,
            transitionType: transitionResult.transitionType,
            length: transitionResult.length,
            inlet: transitionResult.inlet,
            outlet: transitionResult.outlet,
            startStation: 0,
            startElevation: 0,
            endStation: transitionResult.length,
            endElevation: -dropHeight, // Apply the drop height
            upstreamChannelId: null, // Will be set by connectElements
            downstreamChannelId: null, // Will be set by connectElements
            material: {
              color: "#8b5cf6",
              opacity: 1,
              metalness: 0.1,
              roughness: 0.6,
            },
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            metadata: {},
          }

          const id = addObject(transitionData)

          // Establish connections and propagate positions
          if (upstreamId) {
            connectElements(upstreamId, id)
          }
          if (downstreamId) {
            connectElements(id, downstreamId)
          }

          select(id)
          const dropInfo = dropHeight > 0 ? ` with ${dropHeight}m drop` : ""
          return `Created ${transitionResult.name}${dropInfo} (ID: ${id})`
        }

        // Handle chute creation
        if (finalAction === "createChute") {
          const chuteResult = toolResult as unknown as CreateChuteResult & {
            upstreamChannelName?: string | null
            downstreamChannelName?: string | null
          }
          const { connectElements } = useModellerStore.getState()
          const currentObjects = useModellerStore.getState().objects

          // Resolve upstream connection
          let upstreamId = chuteResult.upstreamChannelId
          if (!upstreamId && chuteResult.upstreamChannelName) {
            const found = currentObjects.find(
              (o) => o.name.toLowerCase() === chuteResult.upstreamChannelName?.toLowerCase()
            )
            if (found) {
              upstreamId = found.id
              logger.log(
                `[useAIChat] Resolved upstream by name: "${chuteResult.upstreamChannelName}" → ${upstreamId}`
              )
            } else {
              logger.warn(
                `[useAIChat] Could not find upstream element by name: "${chuteResult.upstreamChannelName}"`
              )
            }
          }

          // Resolve downstream connection
          let downstreamId = chuteResult.downstreamChannelId
          if (!downstreamId && chuteResult.downstreamChannelName) {
            const found = currentObjects.find(
              (o) => o.name.toLowerCase() === chuteResult.downstreamChannelName?.toLowerCase()
            )
            if (found) {
              downstreamId = found.id
              logger.log(
                `[useAIChat] Resolved downstream by name: "${chuteResult.downstreamChannelName}" → ${downstreamId}`
              )
            } else {
              logger.warn(
                `[useAIChat] Could not find downstream element by name: "${chuteResult.downstreamChannelName}"`
              )
            }
          }

          // Build chute object
          const chuteData: Omit<ChuteObject, "id" | "createdAt" | "updatedAt"> = {
            type: "chute",
            name: chuteResult.name,
            layerId: "default",
            visible: true,
            locked: false,
            selected: false,
            chuteType: chuteResult.chuteType,
            // Inlet section
            inletLength: chuteResult.inletLength ?? 1,
            inletSlope: chuteResult.inletSlope ?? 0,
            // Main chute
            length: chuteResult.length,
            drop: chuteResult.drop,
            width: chuteResult.width,
            depth: chuteResult.depth,
            sideSlope: chuteResult.sideSlope,
            thickness: chuteResult.thickness,
            manningN: chuteResult.manningN,
            slope: chuteResult.drop / chuteResult.length,
            // Positioning - will be updated by connectElements if connected
            startStation: 0,
            startElevation: 0,
            endStation: (chuteResult.inletLength ?? 1) + chuteResult.length,
            endElevation:
              -((chuteResult.inletLength ?? 1) * (chuteResult.inletSlope ?? 0)) - chuteResult.drop,
            // Connections
            upstreamChannelId: null,
            downstreamChannelId: null,
            // Type-specific params
            stepHeight: chuteResult.stepHeight,
            stepLength: chuteResult.stepLength,
            baffleSpacing: chuteResult.baffleSpacing,
            baffleHeight: chuteResult.baffleHeight,
            // Stilling basin - will be calculated if needed
            stillingBasin:
              chuteResult.stillingBasinType !== "none"
                ? {
                    type: chuteResult.stillingBasinType,
                    length: chuteResult.drop * 2, // Default estimate, should be calculated properly
                    depth: chuteResult.depth * 0.5,
                    floorThickness: 0.25,
                    chuteBlocks: null,
                    baffleBlocks: null,
                    endSill: null,
                    wingwallAngle: 0,
                  }
                : null,
            // Appearance
            material: {
              color: "#f59e0b", // Orange/amber for chutes
              opacity: 1,
              metalness: 0.1,
              roughness: 0.6,
            },
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            metadata: {},
          }

          const id = addObject(chuteData)

          // Establish connections and propagate positions
          if (upstreamId) {
            connectElements(upstreamId, id)
          }
          if (downstreamId) {
            connectElements(id, downstreamId)
          }

          select(id)
          const slopePercent = ((chuteResult.drop / chuteResult.length) * 100).toFixed(1)
          const basinInfo =
            chuteResult.stillingBasinType !== "none"
              ? ` with ${chuteResult.stillingBasinType.toUpperCase()} stilling basin`
              : ""
          return `Created ${chuteResult.name} (${chuteResult.chuteType} chute, ${slopePercent}% slope${basinInfo}) (ID: ${id})`
        }

        // Handle add stilling basin
        if (finalAction === "addStillingBasin") {
          const basinResult = toolResult as unknown as AddStillingBasinResult
          const currentObjects = useModellerStore.getState().objects
          const { updateObject, analyzeChute } = useModellerStore.getState()

          // Find the chute by ID or name
          let chute: ChuteObject | undefined
          if (basinResult.chuteId) {
            chute = currentObjects.find(
              (o) => o.id === basinResult.chuteId && o.type === "chute"
            ) as ChuteObject
          } else if (basinResult.chuteName) {
            chute = currentObjects.find(
              (o) =>
                o.type === "chute" && o.name.toLowerCase() === basinResult.chuteName?.toLowerCase()
            ) as ChuteObject
          }

          if (!chute) {
            return `Error: Chute not found. Please provide a valid chuteId or chuteName.`
          }

          // Calculate basin parameters based on hydraulics
          // For now, use simplified calculations - in production this would call the Rust backend
          const velocity = Math.sqrt(2 * 9.81 * chute.drop) // Approximate velocity at base
          const d1 = basinResult.discharge / (chute.width * velocity) // Approximate depth at base
          const froudeNumber = velocity / Math.sqrt(9.81 * d1)

          // Select basin type if "auto"
          let basinType = basinResult.basinType
          if (basinType === "auto") {
            if (froudeNumber < 1.7) basinType = "type-i"
            else if (froudeNumber >= 1.7 && froudeNumber < 2.5) basinType = "saf"
            else if (froudeNumber >= 2.5 && froudeNumber < 4.5) basinType = "type-iv"
            else if (froudeNumber >= 4.5 && velocity < 15) basinType = "type-iii"
            else basinType = "type-ii"
          }

          // Calculate basin dimensions (simplified)
          const d2 = (d1 * (Math.sqrt(1 + 8 * froudeNumber * froudeNumber) - 1)) / 2 // Conjugate depth
          const jumpLength = 6.9 * (d2 - d1) // Approximate jump length

          // Build basin config
          const basinConfig = {
            type: basinType as "type-i" | "type-ii" | "type-iii" | "type-iv" | "saf",
            length: jumpLength * 1.1, // Add 10% safety
            depth: d2 - basinResult.tailwaterDepth,
            floorThickness: 0.25,
            chuteBlocks:
              basinType !== "type-i" && basinType !== "type-iv"
                ? {
                    count: Math.max(3, Math.floor(chute.width / (d1 + 0.1))),
                    width: d1,
                    height: d1,
                    thickness: d1 * 0.5,
                    spacing: d1 * 0.5,
                  }
                : null,
            baffleBlocks:
              basinType === "type-iii" || basinType === "saf"
                ? {
                    rows: 1,
                    blocksPerRow: Math.floor(chute.width / (d1 * 2)),
                    width: d1 * 0.75,
                    height: d1 * 0.8,
                    thickness: d1 * 0.4,
                    distanceFromInlet: jumpLength * 0.3,
                    rowSpacing: 0,
                  }
                : null,
            endSill:
              basinType !== "none"
                ? {
                    type: basinType === "type-ii" ? ("dentated" as const) : ("solid" as const),
                    height: d1 * 0.6,
                    toothWidth: basinType === "type-ii" ? d1 * 0.5 : undefined,
                    toothSpacing: basinType === "type-ii" ? d1 * 0.5 : undefined,
                  }
                : null,
            wingwallAngle: basinType === "saf" ? 45 : 0,
          }

          // Update the chute with the new basin
          updateObject(chute.id, { stillingBasin: basinConfig })

          // Trigger re-analysis
          analyzeChute(chute.id)

          select(chute.id)
          return `Added ${basinType.toUpperCase()} stilling basin to "${chute.name}"\n• Basin length: ${basinConfig.length.toFixed(2)}m\n• Basin depth: ${basinConfig.depth.toFixed(2)}m\n• Froude number: ${froudeNumber.toFixed(2)}`
        }

        // Handle analysis tools - connect to Tauri backend
        if (
          finalAction === "analyzeNormalFlow" ||
          finalAction === "calculateNormalDepth" ||
          finalAction === "calculateCriticalDepth" ||
          finalAction === "analyzeGVF"
        ) {
          const analysisResult = toolResult as unknown as AnalysisResult
          const channel = getObjectById(analysisResult.channelId)

          if (!channel || channel.type !== "channel") {
            return `Error: Channel not found\n\nChannel ID: "${analysisResult.channelId}"\n\nUse the scene context to find valid channel IDs.`
          }

          const channelObj = channel as ChannelObject
          const section = channelObj.section

          // Build section params for the backend
          const sectionParams: Record<string, number> = { depth: section.depth }
          let sectionType: ChannelSectionType

          if (section.type === "rectangular") {
            sectionType = "rectangular"
            sectionParams.width = (section as { width: number }).width
          } else if (section.type === "trapezoidal") {
            sectionType = "trapezoidal"
            sectionParams.bottomWidth = (section as { bottomWidth: number }).bottomWidth
            sectionParams.sideSlope = (section as { sideSlope: number }).sideSlope
          } else {
            sectionType = "triangular"
            sectionParams.sideSlope = (section as { sideSlope: number }).sideSlope
          }

          const channelParams = sectionToChannelParams(
            sectionType,
            sectionParams,
            channelObj.manningN,
            channelObj.slope
          )

          try {
            if (finalAction === "analyzeNormalFlow") {
              const depth = analysisResult.flowDepth ?? section.depth
              const result: FlowAnalysis = await analyzeChannel(channelParams, depth)

              return `**Normal Flow Analysis for "${channelObj.name}"**
• Depth: ${result.depth.toFixed(3)} m
• Discharge (Q): ${result.discharge.toFixed(4)} m³/s
• Velocity (V): ${result.velocity.toFixed(3)} m/s
• Flow Area (A): ${result.area.toFixed(4)} m²
• Wetted Perimeter (P): ${result.wetted_perimeter.toFixed(3)} m
• Hydraulic Radius (R): ${result.hydraulic_radius.toFixed(4)} m
• Top Width (T): ${result.top_width.toFixed(3)} m
• Hydraulic Depth (D): ${result.hydraulic_depth.toFixed(4)} m
• Froude Number (Fr): ${result.froude_number.toFixed(3)}
• Flow Regime: ${result.flow_regime}
• Specific Energy: ${result.specific_energy.toFixed(4)} m`
            }

            if (finalAction === "calculateNormalDepth") {
              const discharge = analysisResult.discharge!
              const normalDepth = await calculateNormalDepth(channelParams, discharge)

              // Also get flow properties at this depth
              const result = await analyzeChannel(channelParams, normalDepth)

              return `**Normal Depth Calculation for "${channelObj.name}"**
• Target Discharge: ${discharge.toFixed(4)} m³/s
• **Normal Depth (yn): ${normalDepth.toFixed(4)} m**
• Velocity at yn: ${result.velocity.toFixed(3)} m/s
• Flow Area at yn: ${result.area.toFixed(4)} m²
• Froude Number: ${result.froude_number.toFixed(3)} (${result.flow_regime})`
            }

            if (finalAction === "calculateCriticalDepth") {
              const discharge = analysisResult.discharge!
              const criticalDepth = await calculateCriticalDepth(channelParams, discharge)

              // Also get flow properties at critical depth
              const result = await analyzeChannel(channelParams, criticalDepth)

              return `**Critical Depth Calculation for "${channelObj.name}"**
• Discharge: ${discharge.toFixed(4)} m³/s
• **Critical Depth (yc): ${criticalDepth.toFixed(4)} m**
• Critical Velocity: ${result.velocity.toFixed(3)} m/s
• Critical Area: ${result.area.toFixed(4)} m²
• Froude Number: ${result.froude_number.toFixed(3)} (should be ≈1.0)
• Minimum Specific Energy: ${result.specific_energy.toFixed(4)} m`
            }

            if (finalAction === "analyzeGVF") {
              const discharge = analysisResult.discharge!
              const boundaryDepth = analysisResult.boundaryDepth!
              const stepSize = analysisResult.stepSize ?? 1
              const numSteps = Math.ceil(channelObj.length / stepSize)

              const profile = await analyzeWaterProfile(
                channelParams,
                discharge,
                boundaryDepth,
                channelObj.length,
                numSteps
              )

              // Format results as a summary
              const minDepth = Math.min(...profile.depths)
              const maxDepth = Math.max(...profile.depths)
              const avgFr =
                profile.froude_numbers.reduce((a, b) => a + b, 0) / profile.froude_numbers.length

              return `**Gradually Varied Flow Profile for "${channelObj.name}"**
• Profile Type: ${profile.profile_type}
• Discharge: ${discharge.toFixed(4)} m³/s
• Channel Length: ${channelObj.length} m
• Computation Steps: ${profile.stations.length}

**Water Surface Profile:**
• Boundary Depth: ${boundaryDepth.toFixed(4)} m
• Min Depth: ${minDepth.toFixed(4)} m
• Max Depth: ${maxDepth.toFixed(4)} m
• Average Froude: ${avgFr.toFixed(3)}

**Station Data (first 5 points):**
${profile.stations
  .slice(0, 5)
  .map(
    (sta, i) =>
      `  Sta ${sta.toFixed(1)}m: y=${profile.depths[i].toFixed(3)}m, V=${profile.velocities[i].toFixed(2)}m/s, Fr=${profile.froude_numbers[i].toFixed(2)}`
  )
  .join("\n")}
${profile.stations.length > 5 ? `  ... (${profile.stations.length - 5} more points)` : ""}`
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Error analyzing channel: ${errorMsg}`
          }
        }

        // Handle modifyChannel action
        if (finalAction === "modifyChannel") {
          logger.log("[useAIChat] modifyChannel - starting")
          const modifyResult = toolResult as unknown as ModifyChannelResult
          logger.log(
            "[useAIChat] modifyChannel - channelId:",
            modifyResult.channelId,
            "updates:",
            modifyResult.updates
          )

          const channel = getObjectById(modifyResult.channelId)
          logger.log("[useAIChat] modifyChannel - found channel:", channel?.name, channel?.type)

          if (!channel || channel.type !== "channel") {
            console.error("[useAIChat] modifyChannel - channel not found or wrong type")
            return `Error: Channel not found\n\nChannel ID: "${modifyResult.channelId}"`
          }

          const channelObj = channel as ChannelObject
          const updates: Partial<ChannelObject> = {}
          const updatedProps: string[] = []

          // Apply updates to section if dimension changes
          if (
            modifyResult.updates.width !== undefined ||
            modifyResult.updates.bottomWidth !== undefined ||
            modifyResult.updates.depth !== undefined ||
            modifyResult.updates.sideSlope !== undefined
          ) {
            const newSection = { ...channelObj.section }

            if (modifyResult.updates.depth !== undefined) {
              newSection.depth = modifyResult.updates.depth
              updatedProps.push(`depth: ${modifyResult.updates.depth}m`)
            }

            if (
              channelObj.section.type === "rectangular" &&
              modifyResult.updates.width !== undefined
            ) {
              ;(newSection as { width: number }).width = modifyResult.updates.width
              updatedProps.push(`width: ${modifyResult.updates.width}m`)
            }

            if (channelObj.section.type === "trapezoidal") {
              if (modifyResult.updates.bottomWidth !== undefined) {
                ;(newSection as { bottomWidth: number }).bottomWidth =
                  modifyResult.updates.bottomWidth
                updatedProps.push(`bottomWidth: ${modifyResult.updates.bottomWidth}m`)
              }
              if (modifyResult.updates.sideSlope !== undefined) {
                ;(newSection as { sideSlope: number }).sideSlope = modifyResult.updates.sideSlope
                updatedProps.push(`sideSlope: ${modifyResult.updates.sideSlope}:1`)
              }
            }

            if (
              channelObj.section.type === "triangular" &&
              modifyResult.updates.sideSlope !== undefined
            ) {
              ;(newSection as { sideSlope: number }).sideSlope = modifyResult.updates.sideSlope
              updatedProps.push(`sideSlope: ${modifyResult.updates.sideSlope}:1`)
            }

            updates.section = newSection
          }

          // Apply other property updates
          if (modifyResult.updates.length !== undefined) {
            updates.length = modifyResult.updates.length
            updates.endStation = (channelObj.startStation ?? 0) + modifyResult.updates.length
            updatedProps.push(`length: ${modifyResult.updates.length}m`)
          }
          if (modifyResult.updates.slope !== undefined) {
            updates.slope = modifyResult.updates.slope
            updatedProps.push(`slope: ${(modifyResult.updates.slope * 100).toFixed(3)}%`)
          }
          if (modifyResult.updates.manningN !== undefined) {
            updates.manningN = modifyResult.updates.manningN
            updatedProps.push(`Manning's n: ${modifyResult.updates.manningN}`)
          }
          if (modifyResult.updates.thickness !== undefined) {
            updates.thickness = modifyResult.updates.thickness
            updatedProps.push(`thickness: ${modifyResult.updates.thickness}m`)
          }
          if (modifyResult.updates.freeBoard !== undefined) {
            updates.freeBoard = modifyResult.updates.freeBoard
            updatedProps.push(`freeboard: ${modifyResult.updates.freeBoard}m`)
          }
          if (modifyResult.updates.name !== undefined) {
            updates.name = modifyResult.updates.name
            updatedProps.push(`name: "${modifyResult.updates.name}"`)
          }

          if (updatedProps.length === 0) {
            return `No valid updates provided for channel "${channelObj.name}".`
          }

          updateObject(modifyResult.channelId, updates, true)
          return `Modified channel "${channelObj.name}":\n• ${updatedProps.join("\n• ")}`
        }

        // Handle modifyShape action
        if (finalAction === "modifyShape") {
          logger.log("[useAIChat] modifyShape - starting")
          const modifyResult = toolResult as unknown as ModifyShapeResult
          logger.log(
            "[useAIChat] modifyShape - shapeId:",
            modifyResult.shapeId,
            "updates:",
            modifyResult.updates
          )

          // List all available shapes for debugging
          const allShapes = objects.filter((o) => o.type === "shape")
          logger.log(
            "[useAIChat] modifyShape - available shapes:",
            allShapes.map((s) => ({ id: s.id, name: s.name }))
          )

          const shape = getObjectById(modifyResult.shapeId)
          logger.log("[useAIChat] modifyShape - found shape:", shape?.name, shape?.type)

          if (!shape || shape.type !== "shape") {
            console.error("[useAIChat] modifyShape - shape not found or wrong type")
            const availableShapes = allShapes.map((s) => `• ${s.name} (ID: ${s.id})`).join("\n")
            return `Error: Shape not found\n\nRequested ID: "${modifyResult.shapeId}"\n\nAvailable shapes:\n${availableShapes || "(none)"}`
          }

          const shapeObj = shape as import("@/stores/modeller-store").ShapeObject
          const updates: Partial<import("@/stores/modeller-store").ShapeObject> = {}
          const updatedProps: string[] = []

          // Update parameters based on shape type
          const newParams = { ...shapeObj.parameters }
          let paramsChanged = false

          // Box parameters
          if (shapeObj.shapeType === "box") {
            if (modifyResult.updates.width !== undefined) {
              newParams.width = modifyResult.updates.width
              updatedProps.push(`width: ${modifyResult.updates.width}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.height !== undefined) {
              newParams.height = modifyResult.updates.height
              updatedProps.push(`height: ${modifyResult.updates.height}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.depth !== undefined) {
              newParams.depth = modifyResult.updates.depth
              updatedProps.push(`depth: ${modifyResult.updates.depth}m`)
              paramsChanged = true
            }
          }

          // Cylinder parameters
          if (shapeObj.shapeType === "cylinder") {
            if (modifyResult.updates.radius !== undefined) {
              newParams.radius = modifyResult.updates.radius
              updatedProps.push(`radius: ${modifyResult.updates.radius}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.height !== undefined) {
              newParams.height = modifyResult.updates.height
              updatedProps.push(`height: ${modifyResult.updates.height}m`)
              paramsChanged = true
            }
          }

          // Sphere parameters
          if (shapeObj.shapeType === "sphere") {
            if (modifyResult.updates.radius !== undefined) {
              newParams.radius = modifyResult.updates.radius
              updatedProps.push(`radius: ${modifyResult.updates.radius}m`)
              paramsChanged = true
            }
          }

          // Cone parameters
          if (shapeObj.shapeType === "cone") {
            if (modifyResult.updates.bottomRadius !== undefined) {
              newParams.bottomRadius = modifyResult.updates.bottomRadius
              updatedProps.push(`bottomRadius: ${modifyResult.updates.bottomRadius}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.topRadius !== undefined) {
              newParams.topRadius = modifyResult.updates.topRadius
              updatedProps.push(`topRadius: ${modifyResult.updates.topRadius}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.height !== undefined) {
              newParams.height = modifyResult.updates.height
              updatedProps.push(`height: ${modifyResult.updates.height}m`)
              paramsChanged = true
            }
          }

          // Torus parameters
          if (shapeObj.shapeType === "torus") {
            if (modifyResult.updates.majorRadius !== undefined) {
              newParams.majorRadius = modifyResult.updates.majorRadius
              updatedProps.push(`majorRadius: ${modifyResult.updates.majorRadius}m`)
              paramsChanged = true
            }
            if (modifyResult.updates.minorRadius !== undefined) {
              newParams.minorRadius = modifyResult.updates.minorRadius
              updatedProps.push(`minorRadius: ${modifyResult.updates.minorRadius}m`)
              paramsChanged = true
            }
          }

          if (paramsChanged) {
            updates.parameters = newParams
          }

          // Position update (via transform)
          if (modifyResult.updates.position) {
            updates.transform = {
              ...shapeObj.transform,
              position: modifyResult.updates.position,
            }
            updatedProps.push(
              `position: (${modifyResult.updates.position.x}, ${modifyResult.updates.position.y}, ${modifyResult.updates.position.z})`
            )
          }

          // Name update
          if (modifyResult.updates.name !== undefined) {
            updates.name = modifyResult.updates.name
            updatedProps.push(`name: "${modifyResult.updates.name}"`)
          }

          if (updatedProps.length === 0) {
            return `No valid updates provided for shape "${shapeObj.name}".`
          }

          updateObject(modifyResult.shapeId, updates, true)
          logger.log("[useAIChat] modifyShape - updated successfully:", updatedProps)
          return `Modified shape "${shapeObj.name}":\n• ${updatedProps.join("\n• ")}`
        }

        // Handle deleteObject action
        if (finalAction === "deleteObject") {
          const deleteResult = toolResult as unknown as DeleteObjectResult

          let targetId = deleteResult.objectId
          let targetName = ""

          // Find by name if ID not provided
          if (!targetId && deleteResult.objectName) {
            const found = objects.find(
              (obj) => obj.name.toLowerCase() === deleteResult.objectName?.toLowerCase()
            )
            if (found) {
              targetId = found.id
              targetName = found.name
            }
          }

          if (!targetId) {
            return `Error: Object not found\n\nUse the scene context to find valid object IDs or names.`
          }

          const obj = getObjectById(targetId)
          if (!obj) {
            return `Error: Object not found\n\nObject ID: "${targetId}"`
          }

          targetName = obj.name

          if (!deleteResult.confirm) {
            return `Deletion cancelled for "${targetName}".`
          }

          deleteObject(targetId)
          return `Deleted ${obj.type} "${targetName}" (ID: ${targetId})`
        }

        // Handle duplicateObject action
        if (finalAction === "duplicateObject") {
          const dupResult = toolResult as unknown as DuplicateObjectResult
          const sourceObj = getObjectById(dupResult.objectId)

          if (!sourceObj) {
            return `Error: Object not found\n\nObject ID: "${dupResult.objectId}"`
          }

          // Create a copy with new position
          const newName = dupResult.newName ?? `${sourceObj.name} (copy)`
          const offset = dupResult.offset

          const newTransform = {
            ...sourceObj.transform,
            position: {
              x: sourceObj.transform.position.x + offset.x,
              y: sourceObj.transform.position.y + offset.y,
              z: sourceObj.transform.position.z + offset.z,
            },
          }

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, createdAt, updatedAt, ...rest } = sourceObj as ChannelObject & {
            id: string
            createdAt: Date
            updatedAt: Date
          }
          const newObj = {
            ...rest,
            name: newName,
            transform: newTransform,
            selected: false,
          }

          const newId = addObject(newObj)
          select(newId)

          return `Duplicated "${sourceObj.name}" as "${newName}" (new ID: ${newId})`
        }

        // Handle exportScene action
        if (finalAction === "exportScene") {
          const exportResult = toolResult as unknown as ExportSceneResult

          // Get objects to export based on selection
          const selectedIds = useModellerStore.getState().selectedIds
          let objectsToExport = objects

          if (exportResult.selection === "selected") {
            if (selectedIds.length === 0) {
              return "No objects selected. Please select objects to export or use 'all' to export the entire scene."
            }
            objectsToExport = objects.filter((obj) => selectedIds.includes(obj.id))
          }

          const exportableObjects = objectsToExport.filter((obj) => obj.type === "channel")

          if (exportableObjects.length === 0) {
            return "No exportable objects found. Currently only channels can be exported."
          }

          try {
            const result = await exportObjects(
              exportableObjects,
              exportResult.format as "stl" | "obj"
            )

            if (result.success) {
              return `Successfully exported ${exportableObjects.length} object(s) to ${result.filePath}`
            } else {
              return `Export failed: ${result.error}`
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Export error: ${errorMsg}`
          }
        }

        // =====================================================================
        // CONTEXT & INFORMATION TOOLS
        // =====================================================================

        // Handle getSceneInfo action
        if (finalAction === "getSceneInfo") {
          const infoResult = toolResult as unknown as GetSceneInfoResult
          const { includeDetails, filterType } = infoResult

          let filteredObjects = objects
          if (filterType !== "all") {
            filteredObjects = objects.filter((o) => o.type === filterType)
          }

          const selectedObjects = filteredObjects.filter((o) => o.selected)

          const lines: string[] = []
          lines.push(`## Scene Information\n`)
          lines.push(`**Total objects:** ${objects.length}`)
          lines.push(`**Filtered (${filterType}):** ${filteredObjects.length}`)
          lines.push(`**Selected:** ${selectedObjects.length}`)
          lines.push("")

          // Group by type
          const byType: Record<string, typeof objects> = {}
          for (const obj of filteredObjects) {
            if (!byType[obj.type]) byType[obj.type] = []
            byType[obj.type].push(obj)
          }

          for (const [type, objs] of Object.entries(byType)) {
            lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${objs.length})`)
            for (const obj of objs) {
              const selected = obj.selected ? " ✓" : ""
              const visible = obj.visible ? "" : " (hidden)"
              const locked = obj.locked ? " 🔒" : ""

              if (includeDetails) {
                lines.push(`- **${obj.name}**${selected}${visible}${locked}`)
                lines.push(`  - ID: \`${obj.id}\``)
                if (obj.transform?.position) {
                  const p = obj.transform.position
                  lines.push(
                    `  - Position: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
                  )
                }
                if (obj.type === "shape") {
                  const shape = obj as import("@/stores/modeller-store").ShapeObject
                  lines.push(`  - Shape type: ${shape.shapeType}`)
                }
              } else {
                lines.push(`- ${obj.name} (ID: \`${obj.id}\`)${selected}${visible}${locked}`)
              }
            }
            lines.push("")
          }

          return lines.join("\n")
        }

        // Handle getObjectInfo action
        if (finalAction === "getObjectInfo") {
          const infoResult = toolResult as unknown as GetObjectInfoResult
          const obj = getObjectById(infoResult.objectId)

          if (!obj) {
            return `Error: Object not found\n\nObject ID: "${infoResult.objectId}"`
          }

          const lines: string[] = []
          lines.push(`## Object: ${obj.name}\n`)
          lines.push(`**ID:** \`${obj.id}\``)
          lines.push(`**Type:** ${obj.type}`)
          lines.push(`**Visible:** ${obj.visible ? "Yes" : "No"}`)
          lines.push(`**Locked:** ${obj.locked ? "Yes" : "No"}`)
          lines.push(`**Selected:** ${obj.selected ? "Yes" : "No"}`)
          lines.push("")

          // Transform
          if (obj.transform) {
            const { position, rotation, scale } = obj.transform
            lines.push(`### Transform`)
            lines.push(
              `- Position: (${position.x.toFixed(3)}, ${position.y.toFixed(3)}, ${position.z.toFixed(3)})`
            )
            lines.push(
              `- Rotation: (${rotation.x.toFixed(1)}°, ${rotation.y.toFixed(1)}°, ${rotation.z.toFixed(1)}°)`
            )
            lines.push(
              `- Scale: (${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`
            )
            lines.push("")
          }

          // Material
          const material = (obj as { material?: Record<string, unknown> }).material
          if (material) {
            lines.push(`### Material`)
            if (material.color) lines.push(`- Color: ${material.color}`)
            if (material.opacity !== undefined) lines.push(`- Opacity: ${material.opacity}`)
            if (material.metalness !== undefined) lines.push(`- Metalness: ${material.metalness}`)
            if (material.roughness !== undefined) lines.push(`- Roughness: ${material.roughness}`)
            lines.push("")
          }

          // Type-specific info
          if (obj.type === "shape") {
            const shape = obj as import("@/stores/modeller-store").ShapeObject
            lines.push(`### Shape Properties`)
            lines.push(`- Shape type: ${shape.shapeType}`)
            for (const [key, value] of Object.entries(shape.parameters)) {
              lines.push(`- ${key}: ${value}`)
            }
          } else if (obj.type === "channel") {
            const channel = obj as import("@/stores/modeller-store").ChannelObject
            lines.push(`### Channel Properties`)
            lines.push(`- Section type: ${channel.section.type}`)
            lines.push(`- Length: ${channel.length}m`)
            lines.push(`- Slope: ${channel.slope}`)
            lines.push(`- Manning's n: ${channel.manningN}`)
            if (channel.section.type === "rectangular") {
              const sect = channel.section as { width: number; depth: number }
              lines.push(`- Width: ${sect.width}m`)
              lines.push(`- Depth: ${sect.depth}m`)
            }
          }

          return lines.join("\n")
        }

        // Handle measureDistance action
        if (finalAction === "measureDistance") {
          const measureResult = toolResult as unknown as MeasureDistanceResult
          const { from, to, measureType } = measureResult

          // Get positions
          let fromPos: { x: number; y: number; z: number }
          let toPos: { x: number; y: number; z: number }
          let fromName = "Point"
          let toName = "Point"

          if (typeof from === "string") {
            const fromObj = getObjectById(from)
            if (!fromObj) return `Error: Object not found\n\nFrom ID: "${from}"`
            fromPos = fromObj.transform?.position ?? { x: 0, y: 0, z: 0 }
            fromName = fromObj.name
          } else {
            fromPos = from
          }

          if (typeof to === "string") {
            const toObj = getObjectById(to)
            if (!toObj) return `Error: Object not found\n\nTo ID: "${to}"`
            toPos = toObj.transform?.position ?? { x: 0, y: 0, z: 0 }
            toName = toObj.name
          } else {
            toPos = to
          }

          // Calculate distance
          const dx = toPos.x - fromPos.x
          const dy = toPos.y - fromPos.y
          const dz = toPos.z - fromPos.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

          const lines: string[] = []
          lines.push(`## Distance Measurement\n`)
          lines.push(
            `**From:** ${fromName} (${fromPos.x.toFixed(3)}, ${fromPos.y.toFixed(3)}, ${fromPos.z.toFixed(3)})`
          )
          lines.push(
            `**To:** ${toName} (${toPos.x.toFixed(3)}, ${toPos.y.toFixed(3)}, ${toPos.z.toFixed(3)})`
          )
          lines.push(`**Method:** ${measureType}`)
          lines.push("")
          lines.push(`### Result`)
          lines.push(`- **Distance:** ${distance.toFixed(4)} m`)
          lines.push(`- **Delta X:** ${dx.toFixed(4)} m`)
          lines.push(`- **Delta Y:** ${dy.toFixed(4)} m`)
          lines.push(`- **Delta Z:** ${dz.toFixed(4)} m`)

          return lines.join("\n")
        }

        // =====================================================================
        // BOOLEAN OPERATIONS
        // =====================================================================

        // Handle booleanUnion action
        if (finalAction === "booleanUnion") {
          const boolResult = toolResult as unknown as BooleanUnionResult
          const { shapeIds, name, keepOriginals } = boolResult

          // Verify all shapes exist and are shapes
          const shapes: import("@/stores/modeller-store").ShapeObject[] = []
          for (const id of shapeIds) {
            const obj = getObjectById(id)
            if (!obj || obj.type !== "shape") {
              return `Error: Object "${id}" not found or is not a shape.`
            }
            shapes.push(obj as import("@/stores/modeller-store").ShapeObject)
          }

          if (shapes.length < 2) {
            return "Error: Boolean union requires at least 2 shapes."
          }

          // For now, create a simple merged representation
          // In a full implementation, this would call the CAD backend
          const baseShape = shapes[0]
          const newShape = {
            ...JSON.parse(JSON.stringify(baseShape)),
            name,
            metadata: {
              ...baseShape.metadata,
              booleanOperation: "union",
              sourceShapes: shapeIds,
            },
          }
          delete newShape.id
          delete newShape.createdAt
          delete newShape.updatedAt
          newShape.selected = true

          addObject(newShape)

          // Delete originals if not keeping
          if (!keepOriginals) {
            for (const id of shapeIds) {
              deleteObject(id)
            }
          }

          return `Created union "${name}" from ${shapes.length} shapes.${keepOriginals ? " Original shapes preserved." : " Original shapes removed."}`
        }

        // Handle booleanSubtract action
        if (finalAction === "booleanSubtract") {
          const boolResult = toolResult as unknown as BooleanSubtractResult
          const { baseShapeId, toolShapeIds, name, keepOriginals } = boolResult

          const baseObj = getObjectById(baseShapeId)
          if (!baseObj || baseObj.type !== "shape") {
            return `Error: Base shape "${baseShapeId}" not found or is not a shape.`
          }

          const toolShapes: import("@/stores/modeller-store").ShapeObject[] = []
          for (const id of toolShapeIds) {
            const obj = getObjectById(id)
            if (!obj || obj.type !== "shape") {
              return `Error: Tool shape "${id}" not found or is not a shape.`
            }
            toolShapes.push(obj as import("@/stores/modeller-store").ShapeObject)
          }

          const baseShape = baseObj as import("@/stores/modeller-store").ShapeObject
          const newShape = {
            ...JSON.parse(JSON.stringify(baseShape)),
            name,
            metadata: {
              ...baseShape.metadata,
              booleanOperation: "subtract",
              baseShape: baseShapeId,
              toolShapes: toolShapeIds,
            },
          }
          delete newShape.id
          delete newShape.createdAt
          delete newShape.updatedAt
          newShape.selected = true

          addObject(newShape)

          if (!keepOriginals) {
            deleteObject(baseShapeId)
            for (const id of toolShapeIds) {
              deleteObject(id)
            }
          }

          return `Created subtraction "${name}" (base - ${toolShapes.length} tools).${keepOriginals ? " Original shapes preserved." : " Original shapes removed."}`
        }

        // Handle booleanIntersect action
        if (finalAction === "booleanIntersect") {
          const boolResult = toolResult as unknown as BooleanIntersectResult
          const { shapeIds, name, keepOriginals } = boolResult

          const shapes: import("@/stores/modeller-store").ShapeObject[] = []
          for (const id of shapeIds) {
            const obj = getObjectById(id)
            if (!obj || obj.type !== "shape") {
              return `Error: Object "${id}" not found or is not a shape.`
            }
            shapes.push(obj as import("@/stores/modeller-store").ShapeObject)
          }

          if (shapes.length < 2) {
            return "Error: Boolean intersection requires at least 2 shapes."
          }

          const baseShape = shapes[0]
          const newShape = {
            ...JSON.parse(JSON.stringify(baseShape)),
            name,
            metadata: {
              ...baseShape.metadata,
              booleanOperation: "intersect",
              sourceShapes: shapeIds,
            },
          }
          delete newShape.id
          delete newShape.createdAt
          delete newShape.updatedAt
          newShape.selected = true

          addObject(newShape)

          if (!keepOriginals) {
            for (const id of shapeIds) {
              deleteObject(id)
            }
          }

          return `Created intersection "${name}" from ${shapes.length} shapes.${keepOriginals ? " Original shapes preserved." : " Original shapes removed."}`
        }

        // =====================================================================
        // MATERIAL & MANIPULATION TOOLS
        // =====================================================================

        // Handle setMaterial action (works on any object type)
        if (finalAction === "setMaterial") {
          const materialResult = toolResult as unknown as SetMaterialResult
          const { objectIds, material } = materialResult

          const updatedObjects: string[] = []
          const failedObjects: string[] = []

          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)

            if (!obj) {
              failedObjects.push(objectId)
              continue
            }

            // Build material update - only include defined properties
            const materialUpdate: Record<string, unknown> = {}
            if (material.color !== undefined) materialUpdate.color = material.color
            if (material.opacity !== undefined) materialUpdate.opacity = material.opacity
            if (material.metalness !== undefined) materialUpdate.metalness = material.metalness
            if (material.roughness !== undefined) materialUpdate.roughness = material.roughness

            if (Object.keys(materialUpdate).length === 0) {
              continue // No material properties to update
            }

            // Merge with existing material
            const currentMaterial = (obj as { material?: Record<string, unknown> }).material ?? {}
            const newMaterial = { ...currentMaterial, ...materialUpdate }

            updateObject(objectId, { material: newMaterial } as Partial<typeof obj>, true)
            updatedObjects.push(obj.name)
          }

          // Build response message
          const lines: string[] = []

          if (updatedObjects.length > 0) {
            const propsChanged: string[] = []
            if (material.color !== undefined) propsChanged.push(`color: ${material.color}`)
            if (material.opacity !== undefined) propsChanged.push(`opacity: ${material.opacity}`)
            if (material.metalness !== undefined)
              propsChanged.push(`metalness: ${material.metalness}`)
            if (material.roughness !== undefined)
              propsChanged.push(`roughness: ${material.roughness}`)

            lines.push(`Updated material for ${updatedObjects.length} object(s):`)
            lines.push(`• ${updatedObjects.join(", ")}`)
            lines.push("")
            lines.push(`Properties changed:`)
            lines.push(`• ${propsChanged.join("\n• ")}`)
          }

          if (failedObjects.length > 0) {
            if (lines.length > 0) lines.push("")
            lines.push(`Failed to find ${failedObjects.length} object(s):`)
            lines.push(`• IDs: ${failedObjects.join(", ")}`)
          }

          return lines.join("\n") || "No changes made."
        }

        // Handle moveObject action (relative movement)
        if (finalAction === "moveObject") {
          const moveResult = toolResult as unknown as MoveObjectResult
          const { objectIds, offset } = moveResult

          const movedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const currentPos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }
            const newPos = {
              x: currentPos.x + (offset.x ?? 0),
              y: currentPos.y + (offset.y ?? 0),
              z: currentPos.z + (offset.z ?? 0),
            }

            updateObject(
              objectId,
              {
                transform: { ...obj.transform, position: newPos },
              } as Partial<typeof obj>,
              true
            )
            movedObjects.push(obj.name)
          }

          return movedObjects.length > 0
            ? `Moved ${movedObjects.length} object(s) by (${offset.x}, ${offset.y}, ${offset.z}):\n• ${movedObjects.join(", ")}`
            : "No objects found to move."
        }

        // Handle rotateObject action (relative rotation)
        if (finalAction === "rotateObject") {
          const rotateResult = toolResult as unknown as RotateObjectResult
          const { objectIds, angle } = rotateResult

          const rotatedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const currentRot = obj.transform?.rotation ?? { x: 0, y: 0, z: 0 }
            const newRot = {
              x: currentRot.x + (angle.x ?? 0),
              y: currentRot.y + (angle.y ?? 0),
              z: currentRot.z + (angle.z ?? 0),
            }

            updateObject(
              objectId,
              {
                transform: { ...obj.transform, rotation: newRot },
              } as Partial<typeof obj>,
              true
            )
            rotatedObjects.push(obj.name)
          }

          return rotatedObjects.length > 0
            ? `Rotated ${rotatedObjects.length} object(s) by (${angle.x}°, ${angle.y}°, ${angle.z}°):\n• ${rotatedObjects.join(", ")}`
            : "No objects found to rotate."
        }

        // Handle scaleObject action (relative scale)
        if (finalAction === "scaleObject") {
          const scaleResult = toolResult as unknown as ScaleObjectResult
          const { objectIds, factor } = scaleResult

          const scaledObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const currentScale = obj.transform?.scale ?? { x: 1, y: 1, z: 1 }
            const newScale = {
              x: currentScale.x * (factor.x ?? 1),
              y: currentScale.y * (factor.y ?? 1),
              z: currentScale.z * (factor.z ?? 1),
            }

            updateObject(
              objectId,
              {
                transform: { ...obj.transform, scale: newScale },
              } as Partial<typeof obj>,
              true
            )
            scaledObjects.push(obj.name)
          }

          return scaledObjects.length > 0
            ? `Scaled ${scaledObjects.length} object(s) by factor (${factor.x}, ${factor.y}, ${factor.z}):\n• ${scaledObjects.join(", ")}`
            : "No objects found to scale."
        }

        // Handle setVisibility action
        if (finalAction === "setVisibility") {
          const visResult = toolResult as unknown as SetVisibilityResult
          const { objectIds, visible } = visResult

          const updatedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            updateObject(objectId, { visible } as Partial<typeof obj>, true)
            updatedObjects.push(obj.name)
          }

          const action = visible ? "Shown" : "Hidden"
          return updatedObjects.length > 0
            ? `${action} ${updatedObjects.length} object(s):\n• ${updatedObjects.join(", ")}`
            : "No objects found."
        }

        // Handle setLocked action
        if (finalAction === "setLocked") {
          const lockResult = toolResult as unknown as SetLockedResult
          const { objectIds, locked } = lockResult

          const updatedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            updateObject(objectId, { locked } as Partial<typeof obj>, true)
            updatedObjects.push(obj.name)
          }

          const action = locked ? "Locked" : "Unlocked"
          return updatedObjects.length > 0
            ? `${action} ${updatedObjects.length} object(s):\n• ${updatedObjects.join(", ")}`
            : "No objects found."
        }

        // Handle selectObjects action
        if (finalAction === "selectObjects") {
          const selectResult = toolResult as unknown as SelectObjectsResult
          const { mode, objectIds: targetIds, objectType, namePattern } = selectResult

          let targetObjects = objects

          // Filter by type if specified
          if (objectType && objectType !== "all") {
            targetObjects = targetObjects.filter((o) => o.type === objectType)
          }

          // Filter by name pattern if specified
          if (namePattern) {
            const regex = new RegExp(namePattern.replace(/\*/g, ".*"), "i")
            targetObjects = targetObjects.filter((o) => regex.test(o.name))
          }

          // Filter by IDs if specified
          if (targetIds && targetIds.length > 0) {
            targetObjects = targetObjects.filter((o) => targetIds.includes(o.id))
          }

          const targetIdSet = new Set(targetObjects.map((o) => o.id))

          switch (mode) {
            case "set":
              // Deselect all, then select targets
              objects.forEach((o) => {
                if (o.selected && !targetIdSet.has(o.id)) {
                  updateObject(o.id, { selected: false } as Partial<typeof o>, true)
                } else if (!o.selected && targetIdSet.has(o.id)) {
                  updateObject(o.id, { selected: true } as Partial<typeof o>, true)
                }
              })
              break
            case "add":
              targetObjects.forEach((o) => {
                if (!o.selected) updateObject(o.id, { selected: true } as Partial<typeof o>, true)
              })
              break
            case "remove":
              targetObjects.forEach((o) => {
                if (o.selected) updateObject(o.id, { selected: false } as Partial<typeof o>, true)
              })
              break
            case "toggle":
              targetObjects.forEach((o) => {
                updateObject(o.id, { selected: !o.selected } as Partial<typeof o>, true)
              })
              break
            case "all":
              objects.forEach((o) => {
                if (!o.selected) updateObject(o.id, { selected: true } as Partial<typeof o>, true)
              })
              break
            case "none":
              objects.forEach((o) => {
                if (o.selected) updateObject(o.id, { selected: false } as Partial<typeof o>, true)
              })
              break
            case "invert":
              objects.forEach((o) => {
                updateObject(o.id, { selected: !o.selected } as Partial<typeof o>, true)
              })
              break
          }

          return `Selection updated (${mode}): ${targetObjects.length} object(s) affected.`
        }

        // Handle renameObject action
        if (finalAction === "renameObject") {
          const renameResult = toolResult as unknown as RenameObjectResult
          const { objectIds, name, pattern, startNumber } = renameResult

          const renamedObjects: string[] = []
          objectIds.forEach((objectId, index) => {
            const obj = getObjectById(objectId)
            if (!obj) return

            let newName: string
            if (pattern) {
              newName = pattern.replace("{n}", String(startNumber + index))
            } else if (name) {
              newName = objectIds.length === 1 ? name : `${name} ${startNumber + index}`
            } else {
              return
            }

            updateObject(objectId, { name: newName } as Partial<typeof obj>, true)
            renamedObjects.push(`${obj.name} → ${newName}`)
          })

          return renamedObjects.length > 0
            ? `Renamed ${renamedObjects.length} object(s):\n• ${renamedObjects.join("\n• ")}`
            : "No objects found to rename."
        }

        // Handle copyObjects action
        if (finalAction === "copyObjects") {
          const copyResult = toolResult as unknown as CopyObjectsResult
          const { objectIds, count, offset } = copyResult

          const createdCopies: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            for (let i = 0; i < count; i++) {
              const copyOffset = {
                x: offset.x * (i + 1),
                y: offset.y * (i + 1),
                z: offset.z * (i + 1),
              }

              const currentPos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }
              const newPos = {
                x: currentPos.x + copyOffset.x,
                y: currentPos.y + copyOffset.y,
                z: currentPos.z + copyOffset.z,
              }

              // Create a deep copy of the object
              const copy = JSON.parse(JSON.stringify(obj))
              delete copy.id
              delete copy.createdAt
              delete copy.updatedAt
              copy.name = `${obj.name} (copy ${i + 1})`
              copy.transform = { ...copy.transform, position: newPos }
              copy.selected = false

              addObject(copy)
              createdCopies.push(copy.name)
            }
          }

          return createdCopies.length > 0
            ? `Created ${createdCopies.length} copies:\n• ${createdCopies.join("\n• ")}`
            : "No objects found to copy."
        }

        // Handle focusObjects action (just acknowledge - actual camera control is in the viewer)
        if (finalAction === "focusObjects") {
          const focusResult = toolResult as unknown as FocusObjectsResult
          const targetIds = focusResult.objectIds

          if (targetIds && targetIds.length > 0) {
            // Select the objects to focus on
            targetIds.forEach((id) => {
              const obj = getObjectById(id)
              if (obj) select(id)
            })
            return `Focused on ${targetIds.length} object(s). Camera will adjust to fit them in view.`
          }
          return "Focused on all visible objects."
        }

        // Handle transformObject action (absolute transform)
        if (finalAction === "transformObject") {
          const transformResult = toolResult as unknown as TransformObjectResult
          const { objectIds, transform } = transformResult

          const transformedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const newTransform = { ...obj.transform }
            if (transform.position) newTransform.position = transform.position
            if (transform.rotation) newTransform.rotation = transform.rotation
            if (transform.scale) newTransform.scale = transform.scale

            updateObject(objectId, { transform: newTransform } as Partial<typeof obj>, true)
            transformedObjects.push(obj.name)
          }

          const changes: string[] = []
          if (transform.position)
            changes.push(
              `position: (${transform.position.x}, ${transform.position.y}, ${transform.position.z})`
            )
          if (transform.rotation)
            changes.push(
              `rotation: (${transform.rotation.x}°, ${transform.rotation.y}°, ${transform.rotation.z}°)`
            )
          if (transform.scale)
            changes.push(
              `scale: (${transform.scale.x}, ${transform.scale.y}, ${transform.scale.z})`
            )

          return transformedObjects.length > 0
            ? `Transformed ${transformedObjects.length} object(s):\n• ${transformedObjects.join(", ")}\n\nChanges:\n• ${changes.join("\n• ")}`
            : "No objects found to transform."
        }

        // Handle alignObjects action
        if (finalAction === "alignObjects") {
          const alignResult = toolResult as unknown as AlignObjectsResult
          const { objectIds, axis, alignTo } = alignResult

          if (objectIds.length < 2) {
            return "Need at least 2 objects to align."
          }

          // Get all objects and their positions
          const objs = objectIds.map((id) => getObjectById(id)).filter(Boolean) as typeof objects
          if (objs.length < 2) return "Not enough objects found."

          // Calculate target value based on alignTo
          const positions = objs.map((o) => o.transform?.position ?? { x: 0, y: 0, z: 0 })
          let targetValue: number

          switch (alignTo) {
            case "min":
              targetValue = Math.min(...positions.map((p) => p[axis]))
              break
            case "max":
              targetValue = Math.max(...positions.map((p) => p[axis]))
              break
            case "center": {
              const min = Math.min(...positions.map((p) => p[axis]))
              const max = Math.max(...positions.map((p) => p[axis]))
              targetValue = (min + max) / 2
              break
            }
            case "first":
              targetValue = positions[0][axis]
              break
            case "last":
              targetValue = positions[positions.length - 1][axis]
              break
            default:
              targetValue = 0
          }

          // Apply alignment
          objs.forEach((obj) => {
            const currentPos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }
            const newPos = { ...currentPos, [axis]: targetValue }
            updateObject(
              obj.id,
              {
                transform: { ...obj.transform, position: newPos },
              } as Partial<typeof obj>,
              true
            )
          })

          return `Aligned ${objs.length} objects along ${axis.toUpperCase()} axis (${alignTo}).`
        }

        // Handle distributeObjects action
        if (finalAction === "distributeObjects") {
          const distResult = toolResult as unknown as DistributeObjectsResult
          const { objectIds, axis, spacing } = distResult

          if (objectIds.length < 3) {
            return "Need at least 3 objects to distribute."
          }

          const objs = objectIds.map((id) => getObjectById(id)).filter(Boolean) as typeof objects
          if (objs.length < 3) return "Not enough objects found."

          // Sort by current position on the axis
          objs.sort((a, b) => {
            const posA = a.transform?.position ?? { x: 0, y: 0, z: 0 }
            const posB = b.transform?.position ?? { x: 0, y: 0, z: 0 }
            return posA[axis] - posB[axis]
          })

          const positions = objs.map((o) => o.transform?.position ?? { x: 0, y: 0, z: 0 })
          const firstPos = positions[0][axis]
          const lastPos = positions[positions.length - 1][axis]

          // Calculate spacing
          const totalSpan = lastPos - firstPos
          const gap = spacing ?? totalSpan / (objs.length - 1)

          // Apply distribution
          objs.forEach((obj, index) => {
            const currentPos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }
            const newPos = { ...currentPos, [axis]: firstPos + gap * index }
            updateObject(
              obj.id,
              {
                transform: { ...obj.transform, position: newPos },
              } as Partial<typeof obj>,
              true
            )
          })

          return `Distributed ${objs.length} objects along ${axis.toUpperCase()} axis with ${gap.toFixed(2)}m spacing.`
        }

        // Handle arrayObjects action (rectangular array)
        if (finalAction === "arrayObjects") {
          const arrayResult = toolResult as unknown as ArrayObjectsResult
          const { objectIds, count, spacing, includeOriginal } = arrayResult

          const createdObjects: string[] = []

          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const basePos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }

            for (let ix = 0; ix < count.x; ix++) {
              for (let iy = 0; iy < count.y; iy++) {
                for (let iz = 0; iz < count.z; iz++) {
                  // Skip the original position if not including original
                  if (ix === 0 && iy === 0 && iz === 0) {
                    if (includeOriginal) createdObjects.push(obj.name)
                    continue
                  }

                  const newPos = {
                    x: basePos.x + ix * spacing.x,
                    y: basePos.y + iy * spacing.y,
                    z: basePos.z + iz * spacing.z,
                  }

                  const copy = JSON.parse(JSON.stringify(obj))
                  delete copy.id
                  delete copy.createdAt
                  delete copy.updatedAt
                  copy.name = `${obj.name} [${ix},${iy},${iz}]`
                  copy.transform = { ...copy.transform, position: newPos }
                  copy.selected = false

                  addObject(copy)
                  createdObjects.push(copy.name)
                }
              }
            }
          }

          const totalCount = count.x * count.y * count.z
          return `Created ${totalCount}-element array (${count.x}x${count.y}x${count.z}):\n• ${createdObjects.length} objects total`
        }

        // Handle polarArray action (circular array)
        if (finalAction === "polarArray") {
          const polarResult = toolResult as unknown as PolarArrayResult
          const { objectIds, count, center, axis, angle, includeOriginal } = polarResult

          const createdObjects: string[] = []
          const angleStep = (angle * Math.PI) / 180 / (includeOriginal ? count : count - 1)

          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            const basePos = obj.transform?.position ?? { x: 0, y: 0, z: 0 }

            // Calculate distance from center
            let dx: number, dz: number
            if (axis === "y") {
              dx = basePos.x - center.x
              dz = basePos.z - center.z
            } else if (axis === "x") {
              dx = basePos.y - center.y
              dz = basePos.z - center.z
            } else {
              dx = basePos.x - center.x
              dz = basePos.y - center.y
            }
            const radius = Math.sqrt(dx * dx + dz * dz)
            const baseAngle = Math.atan2(dz, dx)

            for (let i = 0; i < count; i++) {
              if (i === 0 && !includeOriginal) continue

              const currentAngle = baseAngle + angleStep * i
              let newPos: { x: number; y: number; z: number }

              if (axis === "y") {
                newPos = {
                  x: center.x + radius * Math.cos(currentAngle),
                  y: basePos.y,
                  z: center.z + radius * Math.sin(currentAngle),
                }
              } else if (axis === "x") {
                newPos = {
                  x: basePos.x,
                  y: center.y + radius * Math.cos(currentAngle),
                  z: center.z + radius * Math.sin(currentAngle),
                }
              } else {
                newPos = {
                  x: center.x + radius * Math.cos(currentAngle),
                  y: center.y + radius * Math.sin(currentAngle),
                  z: basePos.z,
                }
              }

              if (i === 0) {
                createdObjects.push(obj.name)
                continue
              }

              const copy = JSON.parse(JSON.stringify(obj))
              delete copy.id
              delete copy.createdAt
              delete copy.updatedAt
              copy.name = `${obj.name} [${i + 1}/${count}]`
              copy.transform = { ...copy.transform, position: newPos }
              copy.selected = false

              // Also rotate the object around the axis
              const rotationDeg = (angleStep * i * 180) / Math.PI
              const currentRot = copy.transform.rotation ?? { x: 0, y: 0, z: 0 }
              copy.transform.rotation = {
                ...currentRot,
                [axis]: currentRot[axis] + rotationDeg,
              }

              addObject(copy)
              createdObjects.push(copy.name)
            }
          }

          return `Created polar array with ${count} elements around ${axis.toUpperCase()} axis:\n• ${createdObjects.length} objects total`
        }

        // Handle setLayer action
        if (finalAction === "setLayer") {
          const layerResult = toolResult as unknown as SetLayerResult
          const { objectIds, layerId } = layerResult

          const movedObjects: string[] = []
          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            updateObject(objectId, { layerId } as Partial<typeof obj>, true)
            movedObjects.push(obj.name)
          }

          return movedObjects.length > 0
            ? `Moved ${movedObjects.length} object(s) to layer "${layerId}":\n• ${movedObjects.join(", ")}`
            : "No objects found."
        }

        // Handle setLOD action (segments for shapes)
        if (finalAction === "setLOD") {
          const lodResult = toolResult as unknown as SetLODResult
          const { objectIds, segments, level } = lodResult

          const updatedObjects: string[] = []
          const skippedObjects: string[] = []

          for (const objectId of objectIds) {
            const obj = getObjectById(objectId)
            if (!obj) continue

            // Only shapes support segments parameter
            if (obj.type !== "shape") {
              skippedObjects.push(`${obj.name} (not a shape)`)
              continue
            }

            const shapeObj = obj as import("@/stores/modeller-store").ShapeObject

            // For box, clamp segments to 1-10; for curves, use 8-128
            let finalSegments = segments
            if (shapeObj.shapeType === "box") {
              finalSegments = Math.max(1, Math.min(10, segments))
            } else {
              finalSegments = Math.max(8, Math.min(128, segments))
            }

            // Update parameters.segments
            const newParams = { ...shapeObj.parameters, segments: finalSegments }
            updateObject(objectId, { parameters: newParams } as Partial<typeof shapeObj>, true)
            updatedObjects.push(`${obj.name} (${finalSegments} segments)`)
          }

          const lines: string[] = []
          if (updatedObjects.length > 0) {
            lines.push(
              `Updated LOD for ${updatedObjects.length} shape(s)${level ? ` to "${level}"` : ""}:`
            )
            lines.push(`• ${updatedObjects.join("\n• ")}`)
          }
          if (skippedObjects.length > 0) {
            if (lines.length > 0) lines.push("")
            lines.push(`Skipped ${skippedObjects.length} non-shape object(s):`)
            lines.push(`• ${skippedObjects.join("\n• ")}`)
          }

          return lines.join("\n") || "No objects updated."
        }

        // Handle setCameraView action
        if (finalAction === "setCameraView") {
          const viewResult = toolResult as unknown as SetCameraViewResult
          const { view, fitToScene } = viewResult

          // Note: This would need to integrate with the viewer component
          // For now, we just acknowledge the request
          return `Camera view set to "${view}"${fitToScene ? " (fit to scene)" : ""}.`
        }

        // =====================================================================
        // HISTORY & UX TOOLS
        // =====================================================================

        // Handle undo action
        if (finalAction === "undo") {
          const undoResult = toolResult as unknown as UndoResult
          const { steps } = undoResult

          const { historyIndex, history, undo } = useModellerStore.getState()

          // Check how many undos are possible
          const canUndoSteps = historyIndex
          if (canUndoSteps <= 0) {
            return "Cannot undo - no actions in history to undo."
          }

          const actualSteps = Math.min(steps, canUndoSteps)

          // Perform undo for requested steps
          for (let i = 0; i < actualSteps; i++) {
            undo()
          }

          const undoneAction = history[historyIndex]?.action ?? "unknown action"

          return actualSteps === 1
            ? `Undid 1 action: "${undoneAction}"`
            : `Undid ${actualSteps} action(s). ${steps > actualSteps ? `(Requested ${steps}, but only ${actualSteps} were available)` : ""}`
        }

        // Handle redo action
        if (finalAction === "redo") {
          const redoResult = toolResult as unknown as RedoResult
          const { steps } = redoResult

          const { historyIndex, history, redo } = useModellerStore.getState()

          // Check how many redos are possible
          const canRedoSteps = history.length - 1 - historyIndex
          if (canRedoSteps <= 0) {
            return "Cannot redo - no actions to redo."
          }

          const actualSteps = Math.min(steps, canRedoSteps)

          // Perform redo for requested steps
          for (let i = 0; i < actualSteps; i++) {
            redo()
          }

          const newIndex = historyIndex + actualSteps
          const redoneAction = history[newIndex]?.action ?? "unknown action"

          return actualSteps === 1
            ? `Redid 1 action: "${redoneAction}"`
            : `Redid ${actualSteps} action(s). ${steps > actualSteps ? `(Requested ${steps}, but only ${actualSteps} were available)` : ""}`
        }

        // Handle clearScene action
        if (finalAction === "clearScene") {
          const clearResult = toolResult as unknown as ClearSceneResult
          const { confirm, keepLayers } = clearResult

          if (!confirm) {
            return "Scene clearing cancelled. To clear the scene, set confirm=true."
          }

          const { objects: currentObjects, reset } = useModellerStore.getState()
          const objectCount = currentObjects.length

          // Reset the scene (this clears all objects)
          reset()

          // Note: keepLayers is currently not implemented in reset()
          // The default layer is always preserved

          return `Scene cleared. Removed ${objectCount} object(s).${keepLayers ? " Layers preserved." : ""}`
        }

        // Handle getHistoryInfo action
        if (finalAction === "getHistoryInfo") {
          const { history, historyIndex } = useModellerStore.getState()

          const canUndo = historyIndex > 0
          const canRedo = historyIndex < history.length - 1
          const undoableSteps = historyIndex
          const redoableSteps = history.length - 1 - historyIndex

          const lines: string[] = []
          lines.push(`## History Information\n`)
          lines.push(`**Total entries:** ${history.length}`)
          lines.push(`**Current position:** ${historyIndex + 1} of ${history.length}`)
          lines.push(
            `**Can undo:** ${canUndo ? `Yes (${undoableSteps} step${undoableSteps === 1 ? "" : "s"})` : "No"}`
          )
          lines.push(
            `**Can redo:** ${canRedo ? `Yes (${redoableSteps} step${redoableSteps === 1 ? "" : "s"})` : "No"}`
          )
          lines.push("")

          if (history.length > 0) {
            lines.push("### Recent Actions")
            // Show last 5 history entries
            const recentHistory = history
              .slice(Math.max(0, historyIndex - 4), historyIndex + 1)
              .reverse()
            recentHistory.forEach((entry, idx) => {
              const isCurrent = idx === 0
              const marker = isCurrent ? "→ " : "  "
              const date = new Date(entry.timestamp)
              const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              lines.push(`${marker}${entry.action} (${time})`)
            })

            if (historyIndex > 4) {
              lines.push(`  ... and ${historyIndex - 4} earlier action(s)`)
            }
          }

          return lines.join("\n")
        }

        return `Unknown action\n\nAction: "${finalAction}"\n\nThis action is not implemented.`
      } catch (error) {
        console.error("[useAIChat] Error handling tool result:", error)
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        return `Error executing tool\n\n${errorMsg}`
      }
    },
    [
      addObject,
      select,
      getObjectById,
      updateObject,
      deleteObject,
      objects,
      createBoxShape,
      createCylinderShape,
      createSphereShape,
      createConeShape,
      createTorusShape,
    ]
  )

  // -------------------------------------------------------------------------
  // Message Actions
  // -------------------------------------------------------------------------

  // Send a message
  const sendMessage = useCallback(
    async (content?: string) => {
      const messageContent = content ?? input.trim()
      if (!messageContent || isLoading || !currentSessionId) return

      // Check if the message is about the scene/viewer
      const isSceneRelated = containsSceneKeywords(messageContent)
      if (isSceneRelated) {
        setAnalyzingScene(true)
        analyzingStartTimeRef.current = Date.now()
      }

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: messageContent,
        createdAt: new Date(),
      }

      const messagesWithUser = [...messages, userMessage]
      setMessages(messagesWithUser)
      setInput("")
      setIsLoading(true)

      // Create assistant message placeholder with current model info
      const assistantId = generateId()
      const currentProvider = getProviderFromModelId(modelId)
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        isStreaming: true,
        toolCalls: [],
        modelId: modelId,
        provider: currentProvider,
      }

      const messagesWithAssistant = [...messagesWithUser, assistantMessage]
      setMessages(messagesWithAssistant)

      // Build chat history for the AI
      // If this is a scene-related query, inject the scene context into the last user message
      const chatHistory: ChatMessage[] = messagesWithUser.map((m, idx) => {
        // Only inject scene context into the current (last) user message
        if (isSceneRelated && m.role === "user" && idx === messagesWithUser.length - 1) {
          const sceneContext = formatSceneContextForPrompt()
          logger.log("[useAIChat] Injecting scene context:", sceneContext)
          return {
            role: m.role,
            content: `${m.content}\n\n${sceneContext}`,
          }
        }
        return {
          role: m.role,
          content: m.content,
        }
      })

      logger.log(
        "[useAIChat] isSceneRelated:",
        isSceneRelated,
        "chatHistory length:",
        chatHistory.length
      )

      // Stream the response
      try {
        const apiKey = await getApiKey()

        // Track if we've already stopped the analyzing effect for this message
        let hasStoppedAnalyzing = false
        const maybeStopAnalyzing = () => {
          if (!hasStoppedAnalyzing && isSceneRelated) {
            hasStoppedAnalyzing = true
            stopAnalyzingScene()
          }
        }

        const abortController = await streamChat(
          chatHistory,
          {
            onText: (text) => {
              // Stop analyzing when first text arrives
              maybeStopAnalyzing()

              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m))
              )
            },
            onToolCall: (toolName, args) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls ?? []),
                          { name: toolName, status: "running" as const, args },
                        ],
                      }
                    : m
                )
              )
            },
            onToolResult: async (result) => {
              const resultMessage = await handleToolResult(result)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: m.toolCalls?.map((tc) =>
                          tc.name === result.toolName
                            ? { ...tc, status: "completed" as const, result: resultMessage }
                            : tc
                        ),
                      }
                    : m
                )
              )
            },
            onFinish: (_fullText, _toolResults, usage) => {
              // Ensure analyzing is stopped on finish
              maybeStopAnalyzing()

              // Accumulate token usage for the session
              if (usage) {
                addUsage({
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  totalTokens: usage.totalTokens,
                  reasoningTokens: usage.reasoningTokens,
                  cachedInputTokens: usage.cachedInputTokens,
                })
              }

              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
              )
              setIsLoading(false)
              abortControllerRef.current = null
              // Save after streaming completes
              debouncedSave()
            },
            onError: (error) => {
              // Ensure analyzing is stopped on error
              maybeStopAnalyzing()

              console.error("[useAIChat] Stream error:", error)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content || `Error: ${error.message}`,
                        isStreaming: false,
                      }
                    : m
                )
              )
              setIsLoading(false)
              abortControllerRef.current = null
              options.onError?.(error)
            },
          },
          {
            modelId,
            systemPrompt: options.systemPrompt,
            apiKey: apiKey ?? undefined,
          }
        )

        abortControllerRef.current = abortController
      } catch (error) {
        console.error("[useAIChat] Error:", error)
        // Stop analyzing on error
        stopAnalyzingScene()

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                  isStreaming: false,
                }
              : m
          )
        )
        setIsLoading(false)
      }
    },
    [
      input,
      isLoading,
      messages,
      generateId,
      modelId,
      options,
      handleToolResult,
      setMessages,
      currentSessionId,
      debouncedSave,
      containsSceneKeywords,
      setAnalyzingScene,
      stopAnalyzingScene,
      addUsage,
    ]
  )

  // Stop generation
  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
    // Stop analyzing effect if active
    stopAnalyzingScene()
    setMessages(messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)))
    // Save after stopping
    debouncedSave()
  }, [messages, setMessages, debouncedSave, stopAnalyzingScene])

  // Clear chat (for current session)
  const clear = useCallback(() => {
    setMessages([])
    setInput("")
    setIsLoading(false)
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    // Save empty state
    debouncedSave()
  }, [setMessages, debouncedSave])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    stop,
    clear,
    hasApiKey: apiKeyExists,
    checkApiKey,
    modelId,
    setModelId,
    modelGroups,
    availableModels,
  }
}
