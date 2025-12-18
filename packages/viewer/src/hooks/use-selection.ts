import { useCallback, useState } from "react"

export function useSelection<_T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const select = useCallback((id: string, multi = false) => {
    setSelectedIds((prev) => {
      if (multi) {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      }
      return new Set([id])
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return {
    selectedIds: Array.from(selectedIds),
    select,
    clearSelection,
    isSelected,
  }
}
