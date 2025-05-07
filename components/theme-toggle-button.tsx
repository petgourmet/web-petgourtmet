"use client"

import { useTheme } from "@/components/theme-provider"
import { useEffect } from "react"

export function ThemeToggleButton() {
  const { setTheme } = useTheme()

  // Establecer siempre el tema claro al montar el componente
  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  // No renderizar ningún botón, solo establecer el tema
  return null
}
