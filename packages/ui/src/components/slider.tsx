import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@cadhy/ui/lib/utils"
import * as React from "react"

interface SliderProps extends Omit<SliderPrimitive.Root.Props, "onValueChange"> {
  /** Callback when value changes - receives array of values */
  onValueChange?: (value: number[]) => void
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  ...props
}: SliderProps) {
  // Calculate number of thumbs based on value/defaultValue
  const _values = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (typeof value === "number") return [value]
    if (Array.isArray(defaultValue)) return defaultValue
    if (typeof defaultValue === "number") return [defaultValue]
    return [min] // Default to single thumb at min
  }, [value, defaultValue, min])

  // Wrap the callback to normalize the value to always be an array
  const handleValueChange = React.useCallback(
    (newValue: number | readonly number[]) => {
      if (onValueChange) {
        const normalizedValue = Array.isArray(newValue) ? [...newValue] : [newValue]
        onValueChange(normalizedValue)
      }
    },
    [onValueChange]
  )

  return (
    <SliderPrimitive.Root
      className="data-horizontal:w-full data-vertical:h-full"
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      onValueChange={handleValueChange}
      {...props}
    >
      <SliderPrimitive.Control
        className={cn(
          "data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col",
          className
        )}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-muted rounded-full data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 relative overflow-hidden select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {_values.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="border-primary ring-ring/50 size-4 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
export type { SliderProps }
