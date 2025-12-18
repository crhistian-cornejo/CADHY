/**
 * Utils Tests - @cadhy/ui
 */

import { describe, expect, test } from "bun:test"
import { cn } from "../lib/utils"

describe("cn utility", () => {
  test("should merge single class", () => {
    expect(cn("foo")).toBe("foo")
  })

  test("should merge multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  test("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz")
  })

  test("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar")
  })

  test("should merge tailwind classes correctly", () => {
    // Later class should override earlier conflicting class
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  test("should handle object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo")
  })

  test("should handle array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  test("should handle complex combinations", () => {
    const result = cn(
      "base-class",
      ["array-class"],
      { "conditional-class": true },
      undefined,
      "final-class"
    )
    expect(result).toBe("base-class array-class conditional-class final-class")
  })

  test("should handle empty inputs", () => {
    expect(cn()).toBe("")
    expect(cn("")).toBe("")
  })
})
