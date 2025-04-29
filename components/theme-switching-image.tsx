"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import Image from "next/image"
import { motion } from "framer-motion"

interface ThemeSwitchingImageProps {
  lightImage: string
  darkImage: string
  alt: string
  width: number
  height: number
  caption?: string
}

export default function ThemeSwitchingImage({
  lightImage,
  darkImage,
  alt,
  width,
  height,
  caption,
}: ThemeSwitchingImageProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined)
  const [previousTheme, setPreviousTheme] = useState<string | undefined>(undefined)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Después de montar el componente, podemos acceder al tema
  useEffect(() => {
    setMounted(true)
    setCurrentTheme(theme)
  }, [])

  // Manejar cambios de tema con transición suave
  useEffect(() => {
    if (!mounted || currentTheme === theme) return

    // Guardar el tema anterior
    setPreviousTheme(currentTheme)

    // Iniciar transición
    setIsTransitioning(true)

    // Después de un breve retraso, actualizar el tema actual
    const timer = setTimeout(() => {
      setCurrentTheme(theme)

      // Finalizar transición después de que se complete
      const endTimer = setTimeout(() => {
        setIsTransitioning(false)
      }, 600)

      return () => clearTimeout(endTimer)
    }, 100)

    return () => clearTimeout(timer)
  }, [theme, mounted, currentTheme])

  // Función para animar la imagen cuando se hace clic
  const handleImageClick = () => {
    const element = document.querySelector(".theme-switching-image-container")
    if (element) {
      element.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-10px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(3px)" },
          { transform: "translateX(0)" },
        ],
        {
          duration: 500,
          easing: "ease-in-out",
        },
      )
    }
  }

  // Si no está montado, mostrar un placeholder
  if (!mounted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative cursor-pointer"
      >
        <div className="theme-switching-image-container">
          <div className="w-[300px] h-[400px] bg-gray-200 animate-pulse rounded-lg"></div>
        </div>

        {caption && (
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm px-4 py-1 rounded-full text-sm text-primary font-medium">
            {caption}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative cursor-pointer"
      onClick={handleImageClick}
    >
      <div className="theme-switching-image-container relative">
        {/* Imagen del tema claro */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            currentTheme === "dark" ? "opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src={lightImage || "/placeholder.svg"}
            alt={`${alt} - Modo claro`}
            width={width}
            height={height}
            className="object-contain"
            priority
          />
        </div>

        {/* Imagen del tema oscuro */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            currentTheme === "dark" ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={darkImage || "/placeholder.svg"}
            alt={`${alt} - Modo oscuro`}
            width={width}
            height={height}
            className="object-contain"
            priority
          />
        </div>

        {/* Espacio para mantener las dimensiones correctas */}
        <div style={{ width, height }} />
      </div>

      {caption && (
        <div
          className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-medium transition-all duration-700 ease-in-out ${
            currentTheme === "dark" ? "bg-black/50 text-white" : "bg-white/80 text-primary"
          }`}
        >
          {caption}
        </div>
      )}
    </motion.div>
  )
}
