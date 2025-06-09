"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

interface SplashScreenProps {
  onLoadingComplete?: () => void // Making onLoadingComplete optional
}

export default function SplashScreen({ onLoadingComplete = () => {} }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // Mostrar la pantalla de carga durante 1.5 segundos
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Notificar que la carga ha terminado
      setTimeout(() => {
        onLoadingComplete()
      }, 500) // Esperar a que termine la animación de salida
    }, 1500)

    return () => clearTimeout(timer)
  }, [onLoadingComplete])

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#8ED9E3]"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: "easeInOut" },
          }}
        >
          {/* Textura de fondo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -15, 0],
              transition: {
                scale: { duration: 0.5 },
                opacity: { duration: 0.5 },
                y: {
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1,
                  ease: "easeInOut",
                  repeatType: "reverse",
                },
              },
            }}
            className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center"
          >
            {imageError ? (
              // Fallback: mostrar texto si la imagen falla
              <div className="text-white text-4xl md:text-6xl font-bold">Pet Gourmet</div>
            ) : (
              // Intentar cargar la imagen conocida que existe en el proyecto
              <Image
                src="/petgourmet-logo.png"
                alt="Pet Gourmet"
                fill
                className="object-contain drop-shadow-lg"
                priority
                onError={() => setImageError(true)}
                unoptimized
              />
            )}
          </motion.div>

          {/* Indicador de carga */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            <motion.div
              className="flex space-x-2"
              animate={{
                opacity: [0.4, 1, 0.4],
                transition: {
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                },
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
