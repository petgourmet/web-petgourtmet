"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

interface SplashScreenProps {
  onLoadingComplete: () => void
}

export default function SplashScreen({ onLoadingComplete }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Mostrar la pantalla de carga durante 2.5 segundos
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Notificar que la carga ha terminado
      setTimeout(() => {
        onLoadingComplete()
      }, 500) // Esperar a que termine la animación de salida
    }, 2500)

    return () => clearTimeout(timer)
  }, [onLoadingComplete])

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: "easeInOut" },
          }}
        >
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
                  duration: 2,
                  ease: "easeInOut",
                  repeatType: "reverse",
                },
              },
            }}
            className="relative w-72 h-72 md:w-96 md:h-96"
          >
            <Image src="/pet-gourmet-logo-transparent.png" alt="Pet Gourmet" fill className="object-contain" priority />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
