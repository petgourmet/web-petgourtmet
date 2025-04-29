"use client"

import type React from "react"

import { IngredientsParticlesBackgroundDynamic } from "@/components/ingredients-particles-background-dynamic"

interface ThemedBackgroundProps {
  theme?: "default" | "dense" | "sparse" | "subtle"
  children: React.ReactNode
  depthEffect?: boolean
}

export function ThemedBackground({ theme = "default", children, depthEffect = true }: ThemedBackgroundProps) {
  // Configuraciones predefinidas según el tema
  const getConfig = () => {
    switch (theme) {
      case "dense":
        return {
          count: 30,
          opacity: 0.4,
          speed: 1.2,
          maxSize: 60,
          minSize: 20,
        }
      case "sparse":
        return {
          count: 10,
          opacity: 0.3,
          speed: 1.5,
          maxSize: 55,
          minSize: 25,
        }
      case "subtle":
        return {
          count: 15,
          opacity: 0.2,
          speed: 0.9,
          maxSize: 40,
          minSize: 15,
        }
      default:
        return {
          count: 20,
          opacity: 0.35,
          speed: 1.1,
          maxSize: 50,
          minSize: 20,
        }
    }
  }

  const config = getConfig()

  return (
    <div className="relative">
      <IngredientsParticlesBackgroundDynamic {...config} depthEffect={depthEffect} />
      {children}
    </div>
  )
}
