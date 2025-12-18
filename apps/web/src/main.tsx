import { TooltipProvider } from "@cadhy/ui"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import DocsLayout from "@/app/docs/layout"
import DocsPage from "@/app/docs/page"
import LandingLayout from "@/app/layout"
import LandingPage from "@/app/page"
import PrivacyPage from "@/app/privacy/page"
import TermsPage from "@/app/terms/page"
import { ScrollToTop } from "@/components/scroll-to-top"

import "@/styles/globals.css"

// Apply initial theme immediately to prevent flash
const applyInitialTheme = () => {
  const saved = localStorage.getItem("cadhy-web-theme")
  const theme = saved === "light" ? "light" : "dark"
  const root = document.documentElement

  if (theme === "dark") {
    root.classList.add("dark")
    root.classList.remove("light")
    root.setAttribute("data-theme", "dark")
  } else {
    root.classList.add("light")
    root.classList.remove("dark")
    root.setAttribute("data-theme", "light")
  }
}

// Apply theme before render to prevent flash
applyInitialTheme()

// Get base path for GitHub Pages deployment
const basePath = import.meta.env.BASE_URL || "/"

// Using BrowserRouter with basename for clean URLs (better SEO)
// 404.html handles client-side routing on GitHub Pages
const router = createBrowserRouter(
  [
    {
      element: <LandingLayout />,
      children: [
        {
          path: "/",
          element: <LandingPage />,
        },
        {
          path: "/privacy",
          element: <PrivacyPage />,
        },
        {
          path: "/terms",
          element: <TermsPage />,
        },
      ],
    },
    {
      path: "/docs",
      element: <DocsLayout />,
      children: [
        {
          path: "",
          element: <DocsPage />,
        },
        {
          path: "*",
          element: <DocsPage />,
        },
      ],
    },
  ],
  {
    basename: basePath.endsWith("/") ? basePath.slice(0, -1) : basePath,
  }
)

function App() {
  return (
    <TooltipProvider delay={300}>
      <RouterProvider router={router} />
      <ScrollToTop />
    </TooltipProvider>
  )
}

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Could not find root element to mount to")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
