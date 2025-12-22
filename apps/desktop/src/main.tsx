import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/noto-sans"
import "@cadhy/ui/styles/globals.css"
import "./i18n" // Initialize i18n before app
import { App } from "./app/App"
import { initializeBVH } from "./lib/bvh-setup"
import { initializeCadOperations } from "./services/cad-operations-init"

// Initialize BVH (Bounding Volume Hierarchy) for 10-100x faster raycasting
initializeBVH()

// Initialize CAD operations bridge before rendering
// This connects the factory pattern to the Tauri CAD backend
initializeCadOperations()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
