"use client"

import { memo, useState } from "react"
import Image from "next/image"
import { getIngredientImage, type IngredientType } from "@/utils/particle-utils"

interface ParticleProps {
  id: number
  x: number
  y: number
  rotation: number
  size: number
  opacity: number
  scale: number
  zIndex: number
  type: IngredientType
  onError: (type: IngredientType) => void
  priority?: boolean
}

export const Particle = memo(function Particle({
  id,
  x,
  y,
  rotation,
  size,
  opacity,
  scale,
  zIndex,
  type,
  onError,
  priority = false,
}: ParticleProps) {
  const [hasError, setHasError] = useState(false)

  // Obtener la ruta de la imagen
  const imageSrc = getIngredientImage(type)

  // Si hay un error, usar una imagen de fallback
  const finalSrc = hasError ? "/treat-ball-new.png" : imageSrc

  const handleError = () => {
    setHasError(true)
    onError(type)
  }

  return (
    <div
      className="absolute will-change-transform"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`,
        width: size,
        height: size,
        opacity,
        zIndex,
        transition: "opacity 0.5s ease-in-out, transform 0.2s ease-out",
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src={finalSrc || "/placeholder.svg"}
          alt={`${type} particle`}
          fill
          sizes={`${size}px`}
          className="object-contain"
          priority={priority}
          onError={handleError}
          unoptimized={true} // Desactivar la optimización para evitar problemas
        />
      </div>
    </div>
  )
})
