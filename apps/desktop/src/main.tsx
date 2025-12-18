import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/noto-sans"
import "@cadhy/ui/styles/globals.css"
import "./i18n" // Initialize i18n before app
import { App } from "./app/App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
