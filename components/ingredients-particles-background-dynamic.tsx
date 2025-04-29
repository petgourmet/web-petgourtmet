"use client"

import { useState, useEffect } from "react"
import { useWindowSize } from "@/hooks/use-window-size"
import { useParticleEngine } from "@/hooks/use-particle-engine"
import { Particle } from "@/components/particle"
import type { IngredientType } from "@/utils/particle-utils"

interface IngredientsParticlesBackgroundProps {
  count?: number
  speed?: number
  opacity?: number
  maxSize?: number
  minSize?: number
  zIndex?: number
  depthEffect?: boolean
}

export function IngredientsParticlesBackgroundDynamic({
  count = 20, // Aumentado ligeramente para compensar la eliminación de un tipo
  speed = 0.8, // Reducido para movimientos más suaves
  opacity = 0.5,
  maxSize = 50,
  minSize = 15,
  zIndex = -1,
  depthEffect = true,
}: IngredientsParticlesBackgroundProps) {
  // Obtener dimensiones de la ventana
  const { width, height } = useWindowSize()

  // Ajustar el número de partículas según el tamaño de la pantalla
  const [adjustedCount, setAdjustedCount] = useState(count)

  useEffect(() => {
    // Reducir el número de partículas en pantallas pequeñas
    if (width < 640) {
      // Móvil
      setAdjustedCount(Math.floor(count * 0.6))
    } else if (width < 1024) {
      // Tablet
      setAdjustedCount(Math.floor(count * 0.8))
    } else {
      // Desktop
      setAdjustedCount(count)
    }
  }, [width, count])

  // Manejar errores de carga de imágenes
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const handleImageError = (type: IngredientType) => {
    console.error(`Error loading image for type: ${type}`)
    setImageErrors((prev) => ({ ...prev, [type]: true }))
  }

  // Usar el motor de partículas
  const { particles, positions } = useParticleEngine({
    count: adjustedCount,
    speed,
    opacity,
    maxSize,
    minSize,
    depthEffect,
    width,
    height,
  })

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ zIndex }}>
      {particles.map((particle, index) => {
        const position = positions[index] || {
          x: particle.x,
          y: particle.y,
          rotation: particle.rotation,
          opacity: 0,
          state: "hidden",
        }

        // Calcular z-index basado en profundidad
        const layerZIndex = depthEffect ? Math.floor(particle.depth * 10) : 0

        // Si hay un error con este tipo de imagen, no renderizarlo
        if (imageErrors[particle.type]) return null

        return (
          <Particle
            key={particle.id}
            id={particle.id}
            x={position.x}
            y={position.y}
            rotation={position.rotation}
            size={particle.size}
            opacity={position.opacity}
            scale={particle.scale}
            zIndex={layerZIndex}
            type={particle.type}
            onError={handleImageError}
            priority={index < 5} // Cargar con prioridad los primeros 5 ingredientes
          />
        )
      })}
    </div>
  )
}
