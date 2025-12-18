/**
 * TOC Context
 *
 * Provides table of contents data to the docs layout.
 */

import { createContext, type ReactNode, useContext, useState } from "react"

export interface TocItem {
  title: ReactNode
  url: string
  depth: number
}

interface TocContextValue {
  toc: TocItem[]
  setToc: (toc: TocItem[]) => void
}

const TocContext = createContext<TocContextValue | null>(null)

export function TocProvider({ children }: { children: ReactNode }) {
  const [toc, setToc] = useState<TocItem[]>([])

  return <TocContext.Provider value={{ toc, setToc }}>{children}</TocContext.Provider>
}

export function useToc() {
  const context = useContext(TocContext)
  if (!context) {
    throw new Error("useToc must be used within a TocProvider")
  }
  return context
}
