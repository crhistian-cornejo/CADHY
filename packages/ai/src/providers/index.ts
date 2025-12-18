/**
 * AI Providers Configuration
 *
 * Uses Vercel AI SDK Gateway for unified access to multiple AI providers.
 * Supports OpenAI, Anthropic, Google (Gemini), and more.
 * Also supports Ollama for local AI model execution.
 */

// Re-export core AI SDK utilities for use in consuming packages
export { type CoreMessage, generateObject, generateText, streamText, type ToolSet } from "ai"
export {
  clearGatewayCache,
  type GatewayProviderConfig,
  getGateway,
  getGatewayModel,
} from "./gateway"
export {
  // Provider-based model filtering
  type AIProviderType,
  AVAILABLE_MODELS,
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_CHAT_MODEL,
  getAvailableModelsForProvider,
  getDefaultModelForProvider,
  getFilteredModels,
  getModelById,
  getModelsByProvider,
  getOllamaLocalModels,
  getOllamaModels,
  getReasoningModels,
  getStructuredOutputModels,
  getVisionModels,
  type ModelConfig,
  type ModelGroup,
  type ModelProvider,
  modelAlwaysReasons,
  modelSupportsReasoning,
  modelSupportsVision,
  type ProviderAvailability,
} from "./models"
export {
  checkOllamaLocal,
  deleteOllamaModel,
  getOllamaProvider,
  OLLAMA_LOCAL_URL,
  OLLAMA_QUICK_INSTRUCTIONS,
  OLLAMA_RECOMMENDED_MODELS,
  OLLAMA_SETUP_INSTRUCTIONS,
  type OllamaLocalModelId,
  type OllamaMode,
  type OllamaModelId,
  type OllamaModelInfo,
  type OllamaProviderConfig,
  type OllamaStatus,
  pullOllamaModel,
} from "./ollama"
