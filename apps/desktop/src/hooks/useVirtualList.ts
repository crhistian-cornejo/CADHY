import { useVirtualizer, type VirtualizerOptions } from "@tanstack/react-virtual"
import { type RefObject, useRef } from "react"

export interface UseVirtualListOptions<T> {
  /**
   * Array of items to virtualize
   */
  items: T[]

  /**
   * Estimated size of each item in pixels
   * @default 50
   */
  estimateSize?: number

  /**
   * Number of items to render outside visible area (above and below)
   * Higher values improve scroll experience but use more memory
   * @default 5
   */
  overscan?: number

  /**
   * Custom scroll element (if not using parent)
   */
  scrollElement?: RefObject<HTMLElement | null>
}

export interface UseVirtualListReturn {
  /**
   * Ref to attach to scrollable parent container
   */
  parentRef: RefObject<HTMLDivElement>

  /**
   * Virtualizer instance (for advanced use)
   */
  virtualizer: ReturnType<typeof useVirtualizer>

  /**
   * Virtual items to render (subset of full list)
   */
  virtualItems: ReturnType<typeof useVirtualizer>["getVirtualItems"]

  /**
   * Total height of virtual list (for container sizing)
   */
  totalSize: number
}

/**
 * Hook for virtualizing large lists with @tanstack/react-virtual
 *
 * Renders only visible items + overscan buffer for smooth scrolling.
 * Dramatically improves performance for lists with 100+ items.
 *
 * @example
 * ```tsx
 * const { parentRef, virtualItems, totalSize } = useVirtualList({
 *   items: objects,
 *   estimateSize: 50
 * })
 *
 * return (
 *   <div ref={parentRef} className="h-full overflow-auto">
 *     <div style={{ height: totalSize }}>
 *       {virtualItems.map(virtual => {
 *         const item = objects[virtual.index]
 *         return (
 *           <div
 *             key={virtual.key}
 *             style={{
 *               position: 'absolute',
 *               transform: `translateY(${virtual.start}px)`,
 *               height: virtual.size
 *             }}
 *           >
 *             <Item data={item} />
 *           </div>
 *         )
 *       })}
 *     </div>
 *   </div>
 * )
 * ```
 */
export function useVirtualList<T>({
  items,
  estimateSize = 50,
  overscan = 5,
  scrollElement,
}: UseVirtualListOptions<T>): UseVirtualListReturn {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement?.current ?? parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  }
}
