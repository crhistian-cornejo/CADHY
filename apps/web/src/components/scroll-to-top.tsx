import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * ScrollToTop - A component that scrolls the window to the top on every route change.
 * It ignores hash-only changes to allow internal section navigation.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Only scroll to top if there is no hash and no search params
    // If there's a hash, we let the browser or the specific component handle it
    if (!hash) {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}
