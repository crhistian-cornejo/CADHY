import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

/**
 * ScrollToTop - Scrolls the window to the top on every route change.
 * Ignores hash-only changes to allow internal section navigation.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    // Only scroll if the pathname actually changed (not just hash)
    if (previousPathRef.current !== pathname && !hash) {
      window.scrollTo({ top: 0, behavior: "instant" })
    }
    previousPathRef.current = pathname
  }, [pathname, hash])

  return null
}
