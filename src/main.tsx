import "./style.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { initTheme } from "./lib/theme.ts"

// `.dark` class on <html>: saved toggle choice, else dark.
initTheme()

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
