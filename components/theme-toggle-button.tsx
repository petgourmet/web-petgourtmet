"use client"

import { useTheme } from "@/components/theme-provider"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      style={{
        background:
          theme === "light" ? "linear-gradient(135deg, #7AB8BF, #5A9CA3)" : "linear-gradient(135deg, #8c242b, #6a1b20)",
        boxShadow: theme === "light" ? "0 2px 8px rgba(122, 184, 191, 0.5)" : "0 2px 8px rgba(140, 36, 43, 0.5)",
      }}
      aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
    >
      {theme === "light" ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-white" />}
    </button>
  )
}
