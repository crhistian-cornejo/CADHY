/**
 * AI Context Component
 *
 * Displays AI model context window usage, token consumption, and cost estimation.
 * Pricing data should be provided via props (from gateway.getAvailableModels() or custom config).
 *
 * @package @cadhy/ui
 */

"use client"

import { cn } from "@cadhy/ui/lib/utils"
import { type ComponentProps, createContext, useContext } from "react"
import { Button } from "../button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card"
import { Progress, ProgressIndicator, ProgressTrack } from "../progress"

// =============================================================================
// CONSTANTS
// =============================================================================

const PERCENT_MAX = 100
const ICON_RADIUS = 10
const ICON_VIEWBOX = 24
const ICON_CENTER = 12
const ICON_STROKE_WIDTH = 2

// =============================================================================
// TYPES
// =============================================================================

/**
 * Usage data compatible with AI SDK's LanguageModelUsage
 */
export interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

/**
 * Model pricing information (per token in USD)
 * Compatible with AI Gateway pricing format
 */
export interface ModelPricing {
  /** Cost per input token in USD */
  input?: number
  /** Cost per output token in USD */
  output?: number
  /** Cost per cached input token (read) in USD */
  cachedInputTokens?: number
  /** Cost per cache creation input token (write) in USD */
  cacheCreationInputTokens?: number
}

/**
 * Context schema for the Context component
 */
interface ContextSchema {
  /** Total tokens used in the session */
  usedTokens: number
  /** Maximum tokens for the model's context window */
  maxTokens: number
  /** Detailed usage breakdown */
  usage?: TokenUsage
  /** Model ID for display (e.g., "openai/gpt-4o" or "anthropic/claude-sonnet-4.5") */
  modelId?: string
  /** Model display name (e.g., "GPT-4o", "Claude Sonnet 4.5") */
  modelName?: string
  /** Pricing information for cost calculation */
  pricing?: ModelPricing
}

// =============================================================================
// CONTEXT
// =============================================================================

const ContextContext = createContext<ContextSchema | null>(null)

const useContextValue = () => {
  const context = useContext(ContextContext)

  if (!context) {
    throw new Error("Context components must be used within Context")
  }

  return context
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract model name from model ID
 * "openai/gpt-4o" → "gpt-4o"
 * "anthropic:claude-sonnet-4.5" → "claude-sonnet-4.5"
 */
function extractModelName(modelId: string): string {
  const parts = modelId.split(/[:/]/)
  return parts[parts.length - 1] ?? modelId
}

/**
 * Calculate costs from usage and pricing
 */
function calculateCosts(
  usage: TokenUsage,
  pricing?: ModelPricing
): { inputUSD?: number; outputUSD?: number; totalUSD?: number } {
  if (!pricing) return {}

  const inputCost =
    pricing.input !== undefined && usage.inputTokens ? usage.inputTokens * pricing.input : undefined

  const outputCost =
    pricing.output !== undefined && usage.outputTokens
      ? usage.outputTokens * pricing.output
      : undefined

  const cachedCost =
    pricing.cachedInputTokens !== undefined && usage.cachedInputTokens
      ? usage.cachedInputTokens * pricing.cachedInputTokens
      : 0

  // Calculate total if we have at least input or output cost
  let totalUSD: number | undefined
  if (inputCost !== undefined || outputCost !== undefined) {
    totalUSD = (inputCost ?? 0) + (outputCost ?? 0) + cachedCost
  }

  return {
    inputUSD: inputCost,
    outputUSD: outputCost,
    totalUSD,
  }
}

/**
 * Format USD cost for display
 */
function formatCost(cost: number | undefined): string | undefined {
  if (cost === undefined) return undefined
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export type ContextProps = ComponentProps<typeof HoverCard> & ContextSchema

/**
 * Context - Root component for displaying AI context usage
 *
 * @example
 * ```tsx
 * <Context
 *   maxTokens={128000}
 *   usedTokens={40000}
 *   modelId="openai/gpt-4o"
 *   modelName="GPT-4o"
 *   usage={{ inputTokens: 32000, outputTokens: 8000, totalTokens: 40000 }}
 *   pricing={{ input: 0.0000025, output: 0.00001 }}
 * >
 *   <ContextTrigger />
 *   <ContextContent>
 *     <ContextContentHeader />
 *     <ContextContentBody>
 *       <ContextInputUsage />
 *       <ContextOutputUsage />
 *     </ContextContentBody>
 *     <ContextContentFooter />
 *   </ContextContent>
 * </Context>
 * ```
 */
export const Context = ({
  usedTokens,
  maxTokens,
  usage,
  modelId,
  modelName,
  pricing,
  ...props
}: ContextProps) => (
  <ContextContext.Provider
    value={{
      usedTokens,
      maxTokens,
      usage,
      modelId,
      modelName,
      pricing,
    }}
  >
    <HoverCard {...props} />
  </ContextContext.Provider>
)

// =============================================================================
// CONTEXT ICON
// =============================================================================

/**
 * Circular progress icon showing context usage percentage
 */
const ContextIcon = () => {
  const { usedTokens, maxTokens } = useContextValue()
  const circumference = 2 * Math.PI * ICON_RADIUS
  const usedPercent = Math.min(usedTokens / maxTokens, 1) // Clamp to 100%
  const dashOffset = circumference * (1 - usedPercent)

  // Color based on usage level
  const getColor = () => {
    if (usedPercent >= 0.9) return "text-destructive"
    if (usedPercent >= 0.75) return "text-amber-500"
    return "text-muted-foreground"
  }

  return (
    <svg
      aria-label="Model context usage"
      height="16"
      role="img"
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="16"
      className={getColor()}
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.8"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={ICON_STROKE_WIDTH}
        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
      />
    </svg>
  )
}

// =============================================================================
// TRIGGER
// =============================================================================

export type ContextTriggerProps = ComponentProps<typeof Button>

/**
 * ContextTrigger - Button that triggers the hover card
 * Shows percentage and circular progress icon
 */
export const ContextTrigger = ({ children, className, ...props }: ContextTriggerProps) => {
  const { usedTokens, maxTokens } = useContextValue()
  const usedPercent = Math.min(usedTokens / maxTokens, 1)
  const renderedPercent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(usedPercent)

  return (
    <HoverCardTrigger asChild>
      {children ?? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-6 gap-1.5 px-2 text-xs", className)}
          {...props}
        >
          <span className="font-medium text-muted-foreground tabular-nums">{renderedPercent}</span>
          <ContextIcon />
        </Button>
      )}
    </HoverCardTrigger>
  )
}

// =============================================================================
// CONTENT
// =============================================================================

export type ContextContentProps = ComponentProps<typeof HoverCardContent>

/**
 * ContextContent - Container for the hover card content
 */
export const ContextContent = ({ className, ...props }: ContextContentProps) => (
  <HoverCardContent
    side="top"
    align="end"
    className={cn("min-w-56 divide-y divide-border overflow-hidden p-0 w-auto", className)}
    {...props}
  />
)

// =============================================================================
// CONTENT HEADER
// =============================================================================

export type ContextContentHeaderProps = ComponentProps<"div">

/**
 * ContextContentHeader - Shows progress bar with percentage and token counts
 */
export const ContextContentHeader = ({
  children,
  className,
  ...props
}: ContextContentHeaderProps) => {
  const { usedTokens, maxTokens, modelId, modelName } = useContextValue()
  const usedPercent = Math.min(usedTokens / maxTokens, 1)
  const displayPct = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(usedPercent)
  const used = new Intl.NumberFormat("en-US", {
    notation: "compact",
  }).format(usedTokens)
  const total = new Intl.NumberFormat("en-US", {
    notation: "compact",
  }).format(maxTokens)

  // Use provided modelName, or extract from modelId
  const displayName = modelName ?? (modelId ? extractModelName(modelId) : "Model")

  return (
    <div className={cn("w-full space-y-2 p-3", className)} {...props}>
      {children ?? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="font-medium">{displayName}</p>
            <p className="font-mono text-muted-foreground">
              {used} / {total}
            </p>
          </div>
          <Progress value={usedPercent * PERCENT_MAX}>
            <ProgressTrack className="h-1.5">
              <ProgressIndicator
                className={cn(
                  usedPercent >= 0.9 && "bg-destructive",
                  usedPercent >= 0.75 && usedPercent < 0.9 && "bg-amber-500"
                )}
              />
            </ProgressTrack>
          </Progress>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Context Window</span>
            <span>{displayPct}</span>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// CONTENT BODY
// =============================================================================

export type ContextContentBodyProps = ComponentProps<"div">

/**
 * ContextContentBody - Container for usage breakdown items
 */
export const ContextContentBody = ({ children, className, ...props }: ContextContentBodyProps) => (
  <div className={cn("w-full space-y-1 p-3", className)} {...props}>
    {children}
  </div>
)

// =============================================================================
// TOKENS WITH COST
// =============================================================================

const TokensWithCost = ({ tokens, costText }: { tokens?: number; costText?: string }) => (
  <span className="tabular-nums">
    {tokens === undefined
      ? "-"
      : new Intl.NumberFormat("en-US", {
          notation: "compact",
        }).format(tokens)}
    {costText && <span className="ml-1.5 text-muted-foreground">({costText})</span>}
  </span>
)

// =============================================================================
// INPUT USAGE
// =============================================================================

export type ContextInputUsageProps = ComponentProps<"div">

/**
 * ContextInputUsage - Shows input tokens used and cost
 */
export const ContextInputUsage = ({ className, children, ...props }: ContextInputUsageProps) => {
  const { usage, pricing } = useContextValue()
  const inputTokens = usage?.inputTokens ?? 0

  if (children) return <>{children}</>
  if (!inputTokens) return null

  const inputCost = pricing?.input !== undefined ? inputTokens * pricing.input : undefined

  return (
    <div className={cn("flex items-center justify-between text-xs", className)} {...props}>
      <span className="text-muted-foreground">Input</span>
      <TokensWithCost costText={formatCost(inputCost)} tokens={inputTokens} />
    </div>
  )
}

// =============================================================================
// OUTPUT USAGE
// =============================================================================

export type ContextOutputUsageProps = ComponentProps<"div">

/**
 * ContextOutputUsage - Shows output tokens used and cost
 */
export const ContextOutputUsage = ({ className, children, ...props }: ContextOutputUsageProps) => {
  const { usage, pricing } = useContextValue()
  const outputTokens = usage?.outputTokens ?? 0

  if (children) return <>{children}</>
  if (!outputTokens) return null

  const outputCost = pricing?.output !== undefined ? outputTokens * pricing.output : undefined

  return (
    <div className={cn("flex items-center justify-between text-xs", className)} {...props}>
      <span className="text-muted-foreground">Output</span>
      <TokensWithCost costText={formatCost(outputCost)} tokens={outputTokens} />
    </div>
  )
}

// =============================================================================
// REASONING USAGE
// =============================================================================

export type ContextReasoningUsageProps = ComponentProps<"div">

/**
 * ContextReasoningUsage - Shows reasoning tokens used (for models like o3)
 */
export const ContextReasoningUsage = ({
  className,
  children,
  ...props
}: ContextReasoningUsageProps) => {
  const { usage } = useContextValue()
  const reasoningTokens = usage?.reasoningTokens ?? 0

  if (children) return <>{children}</>
  if (!reasoningTokens) return null

  return (
    <div className={cn("flex items-center justify-between text-xs", className)} {...props}>
      <span className="text-muted-foreground">Reasoning</span>
      <TokensWithCost tokens={reasoningTokens} />
    </div>
  )
}

// =============================================================================
// CACHE USAGE
// =============================================================================

export type ContextCacheUsageProps = ComponentProps<"div">

/**
 * ContextCacheUsage - Shows cached input tokens
 */
export const ContextCacheUsage = ({ className, children, ...props }: ContextCacheUsageProps) => {
  const { usage, pricing } = useContextValue()
  const cacheTokens = usage?.cachedInputTokens ?? 0

  if (children) return <>{children}</>
  if (!cacheTokens) return null

  const cacheCost =
    pricing?.cachedInputTokens !== undefined ? cacheTokens * pricing.cachedInputTokens : undefined

  return (
    <div className={cn("flex items-center justify-between text-xs", className)} {...props}>
      <span className="text-muted-foreground">Cache</span>
      <TokensWithCost costText={formatCost(cacheCost)} tokens={cacheTokens} />
    </div>
  )
}

// =============================================================================
// CONTENT FOOTER
// =============================================================================

export type ContextContentFooterProps = ComponentProps<"div">

/**
 * ContextContentFooter - Shows total cost
 */
export const ContextContentFooter = ({
  children,
  className,
  ...props
}: ContextContentFooterProps) => {
  const { pricing, usage } = useContextValue()

  const costs = usage ? calculateCosts(usage, pricing) : undefined
  const totalCostText = formatCost(costs?.totalUSD) ?? "-"

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 bg-muted/50 p-3 text-xs",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="text-muted-foreground">Session Cost</span>
          <span className="font-medium tabular-nums">{totalCostText}</span>
        </>
      )}
    </div>
  )
}
