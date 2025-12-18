import { useEffect } from "react"
import { useLocation } from "react-router-dom"

interface SEOProps {
  title?: string
  description?: string
  image?: string
  type?: "website" | "article"
  noIndex?: boolean
}

const BASE_URL = "https://crhistian-cornejo.github.io/CADHY"
const DEFAULT_TITLE = "CADHY - Hydraulic Engineering Software"
const DEFAULT_DESCRIPTION =
  "Professional CAD software for hydraulic engineering. Open channel flow, pipe networks, GVF analysis with AI assistance. Built with OpenCASCADE and Rust."
const DEFAULT_IMAGE = `${BASE_URL}/hero/light.png`

/**
 * SEO component that dynamically updates document head meta tags.
 * Uses DOM API directly to avoid additional dependencies.
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
}: SEOProps) {
  const location = useLocation()
  const fullTitle = title ? `${title} | CADHY` : DEFAULT_TITLE
  const canonicalUrl = `${BASE_URL}${location.pathname}`

  useEffect(() => {
    // Update document title
    document.title = fullTitle

    // Helper to update or create meta tags
    const updateMeta = (property: string, content: string, isName = false) => {
      const selector = isName ? `meta[name="${property}"]` : `meta[property="${property}"]`
      let element = document.querySelector(selector) as HTMLMetaElement | null

      if (!element) {
        element = document.createElement("meta")
        if (isName) {
          element.setAttribute("name", property)
        } else {
          element.setAttribute("property", property)
        }
        document.head.appendChild(element)
      }
      element.setAttribute("content", content)
    }

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.setAttribute("rel", "canonical")
      document.head.appendChild(canonical)
    }
    canonical.setAttribute("href", canonicalUrl)

    // Update basic meta tags
    updateMeta("description", description, true)
    updateMeta("robots", noIndex ? "noindex, nofollow" : "index, follow", true)

    // Update Open Graph tags
    updateMeta("og:title", fullTitle)
    updateMeta("og:description", description)
    updateMeta("og:image", image)
    updateMeta("og:url", canonicalUrl)
    updateMeta("og:type", type)

    // Update Twitter tags
    updateMeta("twitter:title", fullTitle)
    updateMeta("twitter:description", description)
    updateMeta("twitter:image", image)
    updateMeta("twitter:url", canonicalUrl)
  }, [fullTitle, description, image, canonicalUrl, type, noIndex])

  return null
}

// Pre-configured SEO for common pages
export function LandingSEO() {
  return <SEO />
}

export function DocsSEO({ pageTitle }: { pageTitle?: string }) {
  return (
    <SEO
      title={pageTitle ? `${pageTitle} - Docs` : "Documentation"}
      description="CADHY documentation. Learn how to install, configure, and use CADHY for hydraulic engineering projects."
      type="article"
    />
  )
}

export function PrivacySEO() {
  return (
    <SEO
      title="Privacy Policy"
      description="CADHY privacy policy. Learn how we handle your data and protect your privacy."
    />
  )
}

export function TermsSEO() {
  return (
    <SEO
      title="Terms of Service"
      description="CADHY terms of service. Understand the terms and conditions for using CADHY software."
    />
  )
}
