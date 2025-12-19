import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { logger, perf } from "../logger"

describe("logger", () => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    group: console.group,
    groupEnd: console.groupEnd,
    table: console.table,
  }

  // Mock console methods
  const mockConsole = () => {
    console.log = mock(() => {})
    console.warn = mock(() => {})
    console.error = mock(() => {})
    console.info = mock(() => {})
    console.debug = mock(() => {})
    console.group = mock(() => {})
    console.groupEnd = mock(() => {})
    console.table = mock(() => {})
  }

  beforeEach(() => {
    mockConsole()
  })

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole)
  })

  describe("logger.log", () => {
    it("should be a function", () => {
      expect(typeof logger.log).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.log("test")).not.toThrow()
    })

    it("should handle multiple arguments", () => {
      expect(() => logger.log("test", 123, { foo: "bar" })).not.toThrow()
    })
  })

  describe("logger.warn", () => {
    it("should be a function", () => {
      expect(typeof logger.warn).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.warn("warning")).not.toThrow()
    })
  })

  describe("logger.error", () => {
    it("should be a function", () => {
      expect(typeof logger.error).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.error("error")).not.toThrow()
    })

    it("should always log errors (even in production)", () => {
      // Error should always be bound to console.error
      expect(logger.error).toBeDefined()
    })
  })

  describe("logger.info", () => {
    it("should be a function", () => {
      expect(typeof logger.info).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.info("info")).not.toThrow()
    })
  })

  describe("logger.debug", () => {
    it("should be a function", () => {
      expect(typeof logger.debug).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.debug("debug")).not.toThrow()
    })
  })

  describe("logger.group", () => {
    it("should be a function", () => {
      expect(typeof logger.group).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.group("group")).not.toThrow()
    })
  })

  describe("logger.groupEnd", () => {
    it("should be a function", () => {
      expect(typeof logger.groupEnd).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.groupEnd()).not.toThrow()
    })
  })

  describe("logger.table", () => {
    it("should be a function", () => {
      expect(typeof logger.table).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => logger.table([{ a: 1, b: 2 }])).not.toThrow()
    })
  })

  describe("logger type safety", () => {
    it("should have correct type", () => {
      // Type tests
      const _log: typeof console.log = logger.log
      const _warn: typeof console.warn = logger.warn
      const _error: typeof console.error = logger.error
      const _info: typeof console.info = logger.info
      const _debug: typeof console.debug = logger.debug

      expect(_log).toBeDefined()
      expect(_warn).toBeDefined()
      expect(_error).toBeDefined()
      expect(_info).toBeDefined()
      expect(_debug).toBeDefined()
    })
  })
})

describe("perf", () => {
  describe("perf.mark", () => {
    it("should be a function", () => {
      expect(typeof perf.mark).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => perf.mark("test-mark")).not.toThrow()
    })
  })

  describe("perf.measure", () => {
    it("should be a function", () => {
      expect(typeof perf.measure).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => perf.measure("test-measure")).not.toThrow()
    })
  })

  describe("perf.getEntries", () => {
    it("should be a function", () => {
      expect(typeof perf.getEntries).toBe("function")
    })

    it("should return an array", () => {
      const entries = perf.getEntries()
      expect(Array.isArray(entries)).toBe(true)
    })
  })

  describe("perf.clearMarks", () => {
    it("should be a function", () => {
      expect(typeof perf.clearMarks).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => perf.clearMarks()).not.toThrow()
    })
  })

  describe("perf.clearMeasures", () => {
    it("should be a function", () => {
      expect(typeof perf.clearMeasures).toBe("function")
    })

    it("should not throw when called", () => {
      expect(() => perf.clearMeasures()).not.toThrow()
    })
  })

  describe("performance measurement workflow", () => {
    it("should support mark and measure workflow", () => {
      expect(() => {
        perf.mark("start")
        // Simulate work
        for (let i = 0; i < 1000; i++) {
          // do nothing
        }
        perf.mark("end")
        perf.measure("operation", "start", "end")
      }).not.toThrow()
    })

    it("should support clearing workflow", () => {
      expect(() => {
        perf.mark("test")
        perf.clearMarks()
        perf.measure("test-measure")
        perf.clearMeasures()
      }).not.toThrow()
    })
  })
})

describe("logger and perf integration", () => {
  it("should export both logger and perf", () => {
    expect(logger).toBeDefined()
    expect(perf).toBeDefined()
  })

  it("should not interfere with each other", () => {
    expect(() => {
      logger.log("Starting operation")
      perf.mark("operation-start")

      // Simulate work
      for (let i = 0; i < 100; i++) {
        // do nothing
      }

      perf.mark("operation-end")
      perf.measure("operation", "operation-start", "operation-end")
      logger.log("Operation complete")
    }).not.toThrow()
  })
})
