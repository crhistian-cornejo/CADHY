/**
 * AI Models Tests - @cadhy/ai
 */

import { describe, expect, test } from "bun:test"
import {
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
  modelAlwaysReasons,
  modelSupportsReasoning,
  modelSupportsVision,
  type ProviderAvailability,
} from "../providers/models"

describe("AVAILABLE_MODELS", () => {
  test("should have at least one model", () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0)
  })

  test("all models should have required fields", () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.name).toBeDefined()
      expect(model.id).toBeDefined()
      expect(model.provider).toBeDefined()
      expect(["openai", "anthropic", "google", "xai", "ollama"]).toContain(model.provider)
    }
  })

  test("model IDs should follow provider/model format", () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.id).toMatch(/^(openai|anthropic|google|xai|ollama)\//)
    }
  })
})

describe("getModelById", () => {
  test("should find existing model", () => {
    const model = getModelById("openai/gpt-4o")
    expect(model).toBeDefined()
    expect(model?.name).toBe("GPT-4o")
  })

  test("should return undefined for non-existent model", () => {
    const model = getModelById("non-existent/model")
    expect(model).toBeUndefined()
  })
})

describe("getModelsByProvider", () => {
  test("should return OpenAI models", () => {
    const models = getModelsByProvider("openai")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.provider === "openai")).toBe(true)
  })

  test("should return Anthropic models", () => {
    const models = getModelsByProvider("anthropic")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.provider === "anthropic")).toBe(true)
  })

  test("should return Google models", () => {
    const models = getModelsByProvider("google")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.provider === "google")).toBe(true)
  })

  test("should return xAI models", () => {
    const models = getModelsByProvider("xai")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.provider === "xai")).toBe(true)
  })
})

describe("getStructuredOutputModels", () => {
  test("should return models that support structured output", () => {
    const models = getStructuredOutputModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.supportsStructuredOutput)).toBe(true)
  })
})

describe("getReasoningModels", () => {
  test("should return models that support reasoning", () => {
    const models = getReasoningModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.supportsReasoning)).toBe(true)
  })
})

describe("getVisionModels", () => {
  test("should return models that support vision", () => {
    const models = getVisionModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.supportsVision)).toBe(true)
  })
})

describe("modelSupportsVision", () => {
  test("should return true for vision-capable model", () => {
    expect(modelSupportsVision("openai/gpt-4o")).toBe(true)
  })

  test("should return false for non-vision model", () => {
    expect(modelSupportsVision("xai/grok-3")).toBe(false)
  })

  test("should return false for non-existent model", () => {
    expect(modelSupportsVision("non-existent/model")).toBe(false)
  })
})

describe("modelSupportsReasoning", () => {
  test("should return true for reasoning-capable model", () => {
    expect(modelSupportsReasoning("openai/gpt-4o")).toBe(true)
  })

  test("should return false for non-reasoning model", () => {
    expect(modelSupportsReasoning("openai/gpt-4o-mini")).toBe(false)
  })
})

describe("modelAlwaysReasons", () => {
  test("should return true for always-reasoning model", () => {
    expect(modelAlwaysReasons("anthropic/claude-opus-4.5")).toBe(true)
    expect(modelAlwaysReasons("google/gemini-2.5-pro")).toBe(true)
  })

  test("should return false for optional reasoning model", () => {
    expect(modelAlwaysReasons("openai/gpt-4o")).toBe(false)
  })
})

describe("Default models", () => {
  test("DEFAULT_ANALYSIS_MODEL should be a valid model", () => {
    const model = getModelById(DEFAULT_ANALYSIS_MODEL)
    expect(model).toBeDefined()
  })

  test("DEFAULT_CHAT_MODEL should be a valid model", () => {
    const model = getModelById(DEFAULT_CHAT_MODEL)
    expect(model).toBeDefined()
  })
})

// =============================================================================
// NEW TESTS: Provider-based filtering (simplified to Gateway + Ollama Local)
// =============================================================================

describe("getOllamaLocalModels", () => {
  test("should return only Ollama models", () => {
    const models = getOllamaLocalModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m.provider === "ollama")).toBe(true)
  })

  test("should not return any cloud models", () => {
    const models = getOllamaLocalModels()
    // After cleanup, there should be no isCloudModel property
    expect(models.every((m) => !("isCloudModel" in m) || !m.isCloudModel)).toBe(true)
  })
})

describe("getOllamaModels", () => {
  test("should return same as getOllamaLocalModels after cleanup", () => {
    const ollamaModels = getOllamaModels()
    const ollamaLocalModels = getOllamaLocalModels()
    expect(ollamaModels.length).toBe(ollamaLocalModels.length)
  })
})

describe("AIProviderType", () => {
  test("should only allow ollama-local, gateway, or null", () => {
    // TypeScript type check - these should compile
    const validTypes: AIProviderType[] = ["ollama-local", "gateway", null]
    expect(validTypes).toHaveLength(3)
  })
})

describe("ProviderAvailability", () => {
  test("should have simplified structure", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: true,
      ollamaModels: ["qwen3:8b"],
      activeProvider: "ollama-local",
    }
    expect(availability.hasOllamaLocal).toBe(true)
    expect(availability.ollamaModels).toEqual(["qwen3:8b"])
    expect(availability.activeProvider).toBe("ollama-local")
  })
})

describe("getAvailableModelsForProvider", () => {
  test("should return Ollama models when ollama-local is active", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: true,
      ollamaModels: ["qwen3:8b", "llama3.1:8b"],
      activeProvider: "ollama-local",
    }

    const groups = getAvailableModelsForProvider(availability)
    expect(groups).toHaveLength(1)
    expect(groups[0].provider).toBe("ollama-local")
    expect(groups[0].label).toBe("Ollama (Local)")
    expect(groups[0].isActive).toBe(true)
    expect(groups[0].models.length).toBe(2)
  })

  test("should return gateway models when no provider is active", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: false,
      ollamaModels: [],
      activeProvider: "gateway",
    }

    const groups = getAvailableModelsForProvider(availability)
    expect(groups.length).toBeGreaterThan(0)
    // Gateway returns multiple groups (OpenAI, Anthropic, Google, xAI)
    expect(groups.every((g) => g.provider === "gateway")).toBe(true)
  })

  test("should return gateway models when activeProvider is null", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: false,
      ollamaModels: [],
      activeProvider: null,
    }

    const groups = getAvailableModelsForProvider(availability)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every((g) => g.provider === "gateway")).toBe(true)
  })
})

describe("getFilteredModels", () => {
  test("should return flat list of models", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: false,
      ollamaModels: [],
      activeProvider: "gateway",
    }

    const models = getFilteredModels(availability)
    expect(models.length).toBeGreaterThan(0)
    expect(Array.isArray(models)).toBe(true)
  })
})

describe("getDefaultModelForProvider", () => {
  test("should return first Ollama model when Ollama is available", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: true,
      ollamaModels: ["custom-model:7b"],
      activeProvider: "ollama-local",
    }

    const defaultModel = getDefaultModelForProvider(availability)
    expect(defaultModel).toBe("ollama/custom-model:7b")
  })

  test("should prefer qwen3:8b if installed", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: true,
      ollamaModels: ["llama3.1:8b", "qwen3:8b", "mistral:7b"],
      activeProvider: "ollama-local",
    }

    const defaultModel = getDefaultModelForProvider(availability)
    expect(defaultModel).toBe("ollama/qwen3:8b")
  })

  test("should return DEFAULT_CHAT_MODEL when no Ollama", () => {
    const availability: ProviderAvailability = {
      hasOllamaLocal: false,
      ollamaModels: [],
      activeProvider: "gateway",
    }

    const defaultModel = getDefaultModelForProvider(availability)
    expect(defaultModel).toBe(DEFAULT_CHAT_MODEL)
  })
})
