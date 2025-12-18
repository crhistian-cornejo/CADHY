import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  precision?: number // Number of decimal places to display
}

/**
 * NumberInput - A controlled number input that uses string internally
 *
 * Features:
 * - Allows clearing the input (backspace/delete work properly)
 * - Uses period (.) for decimal separator regardless of locale
 * - Converts comma (,) to period automatically
 * - Validates and clamps value on blur
 * - Persists user input while focused
 */
function NumberInput({
  className,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  precision,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const formatValue = React.useCallback(
    (num: number) => {
      // Guard against undefined/null/NaN values
      if (num === undefined || num === null || Number.isNaN(num)) {
        return "0"
      }
      if (precision !== undefined) {
        return num.toFixed(precision)
      }
      return parseFloat(num.toPrecision(10)).toString()
    },
    [precision]
  )

  const [displayValue, setDisplayValue] = React.useState(() => formatValue(value))
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isFocusedRef = React.useRef(false)
  const lastExternalValue = React.useRef(value)

  // Only sync from external value when:
  // 1. Not focused
  // 2. External value actually changed (not just a re-render)
  React.useEffect(() => {
    if (!isFocusedRef.current && value !== lastExternalValue.current) {
      setDisplayValue(formatValue(value))
      lastExternalValue.current = value
    }
  }, [value, formatValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value

    // Replace comma with period for decimal separator
    inputValue = inputValue.replace(",", ".")

    // Allow empty, numbers, single period, and negative sign at start
    const isValidInput = /^-?\d*\.?\d*$/.test(inputValue)

    if (!isValidInput && inputValue !== "") {
      return // Reject invalid input
    }

    setDisplayValue(inputValue)

    // Try to parse and call onChange for valid numbers
    const num = parseFloat(inputValue)
    if (!Number.isNaN(num)) {
      let clampedValue = num
      if (min !== undefined) clampedValue = Math.max(min, clampedValue)
      if (max !== undefined) clampedValue = Math.min(max, clampedValue)
      lastExternalValue.current = clampedValue
      onChange(clampedValue)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false

    const num = parseFloat(displayValue)

    if (Number.isNaN(num) || displayValue === "" || displayValue === "-") {
      // Reset to current value or min if invalid
      const resetValue = min ?? 0
      setDisplayValue(formatValue(resetValue))
      lastExternalValue.current = resetValue
      onChange(resetValue)
    } else {
      // Clamp and format the value
      let clampedValue = num
      if (min !== undefined) clampedValue = Math.max(min, clampedValue)
      if (max !== undefined) clampedValue = Math.min(max, clampedValue)

      // Format with precision if specified
      const formatted = formatValue(clampedValue)
      setDisplayValue(formatted)
      lastExternalValue.current = clampedValue

      if (clampedValue !== value) {
        onChange(clampedValue)
      }
    }

    onBlur?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true
    // Select all text on focus for easy replacement
    e.target.select()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow increment/decrement with arrow keys
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const currentNum = parseFloat(displayValue) || 0
      const delta = e.key === "ArrowUp" ? (step ?? 0.1) : -(step ?? 0.1)
      let newValue = currentNum + delta

      if (min !== undefined) newValue = Math.max(min, newValue)
      if (max !== undefined) newValue = Math.min(max, newValue)

      const formatted = formatValue(newValue)
      setDisplayValue(formatted)
      lastExternalValue.current = newValue
      onChange(newValue)
    }

    onKeyDown?.(e)
  }

  return (
    <InputPrimitive
      ref={inputRef}
      type="text"
      inputMode="decimal"
      data-slot="number-input"
      className={cn(
        "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { NumberInput }
export type { NumberInputProps }
