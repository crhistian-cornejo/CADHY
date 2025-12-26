"use client"

import { cn } from "@cadhy/ui/lib/utils"
import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { Button } from "./button"

interface CarouselContextProps {
  currentIndex: number
  setCurrentIndex: (index: number) => void
  itemsCount: number
}

const CarouselContext = React.createContext<CarouselContextProps>({
  currentIndex: 0,
  setCurrentIndex: () => {},
  itemsCount: 0,
})

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  opts?: {
    align?: "start" | "center" | "end"
    loop?: boolean
  }
  orientation?: "horizontal" | "vertical"
}

function Carousel({
  orientation = "horizontal",
  opts,
  className,
  children,
  ...props
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [itemsCount] = React.useState(0)

  return (
    <CarouselContext.Provider value={{ currentIndex, setCurrentIndex, itemsCount }}>
      <div
        data-slot="carousel"
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { currentIndex } = React.useContext(CarouselContext)

    return (
      <div ref={ref} data-slot="carousel-content" className="overflow-hidden">
        <div
          className={cn("flex transition-transform duration-300", className)}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
          {...props}
        />
      </div>
    )
  }
)
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="carousel-item"
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
      {...props}
    />
  )
)
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { currentIndex, setCurrentIndex } = React.useContext(CarouselContext)

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        data-slot="carousel-previous"
        className={cn("absolute h-8 w-8 rounded-full left-2 top-1/2 -translate-y-1/2", className)}
        disabled={currentIndex === 0}
        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
        {...props}
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    )
  }
)
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { currentIndex, setCurrentIndex, itemsCount } = React.useContext(CarouselContext)

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        data-slot="carousel-next"
        className={cn("absolute h-8 w-8 rounded-full right-2 top-1/2 -translate-y-1/2", className)}
        disabled={currentIndex >= itemsCount - 1}
        onClick={() => setCurrentIndex(Math.min(itemsCount - 1, currentIndex + 1))}
        {...props}
      >
        <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    )
  }
)
CarouselNext.displayName = "CarouselNext"

export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious }
