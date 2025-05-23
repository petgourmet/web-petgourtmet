"use client"

import type React from "react"

interface ThemedBackgroundProps {
  theme?: "default" | "dense" | "sparse" | "subtle"
  children: React.ReactNode
  depthEffect?: boolean
}

export function ThemedBackground({ theme = "default", children, depthEffect = true }: ThemedBackgroundProps) {
  // Configuraciones de colores según el tema
  const getBackgroundColor = () => {
    switch (theme) {
      case "dense":
        return "bg-gradient-to-b from-blue-50 to-blue-100"
      case "sparse":
        return "bg-gradient-to-b from-amber-50 to-amber-100"
      case "subtle":
        return "bg-gradient-to-b from-gray-50 to-gray-100"
      default:
        return "bg-gradient-to-b from-green-50 to-green-100"
    }
  }

  const backgroundColor = getBackgroundColor()

  return <div className={`relative ${backgroundColor} transition-colors duration-500`}>{children}</div>
}
