"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

// Tipos para las partículas
interface Particle {
  id: string
  x: number
  y: number
  size: number
  color: string
  speed: number
  direction: number
  opacity: number
  delay: number
}

interface ParticlesBackgroundProps {
  scrollRef: React.RefObject<HTMLElement>
}

export function ParticlesBackground({ scrollRef }: ParticlesBackgroundProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)

  // Usar el mismo progreso de scroll que el componente principal
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  })

  // Transformar el progreso del scroll para controlar la visibilidad de las partículas
  const particlesOpacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [1, 1, 1, 1])

  // Colores específicos de la web
  const colors = [
    "#7AB8BF", // Azul (primary)
    "#8C4A23", // Café (secondary)
    "#D9F5E8", // Verde (pastel-green)
  ]

  // Actualizar dimensiones cuando cambia el tamaño de la ventana
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Generar partículas
  const generateParticles = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return []

    // Número de partículas
    const particleCount = 50

    // Generar partículas
    return Array.from({ length: particleCount }).map((_, index) => {
      // Distribuir partículas por toda la pantalla
      const x = Math.random() * dimensions.width
      const y = Math.random() * dimensions.height

      // Tamaño de las partículas (muy pequeñas)
      const size = 1 + Math.random() * 3 // Entre 1 y 4px

      // Color aleatorio de la paleta
      const color = colors[Math.floor(Math.random() * colors.length)]

      // Velocidad y dirección para el movimiento
      const speed = 0.5 + Math.random() * 1.5 // Velocidad aleatoria
      const direction = Math.random() * 360 // Dirección aleatoria en grados

      // Delay para aparición escalonada
      const delay = Math.random() * 2 // Delay entre 0 y 2 segundos

      return {
        id: `particle-${index}`,
        x,
        y,
        size,
        color,
        speed,
        direction,
        opacity: Math.random() * 0.5 + 0.3, // Opacidad entre 0.3 y 0.8
        delay,
      }
    })
  }, [dimensions, colors])

  // Inicializar partículas solo una vez cuando las dimensiones están disponibles
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0 && !isInitializedRef.current) {
      setParticles(generateParticles())
      isInitializedRef.current = true
    }
  }, [dimensions, generateParticles])

  // Regenerar partículas cuando cambia el tamaño de la ventana
  useEffect(() => {
    if (isInitializedRef.current && dimensions.width > 0 && dimensions.height > 0) {
      const dimensionId = `${dimensions.width}-${dimensions.height}`
      const prevDimensionId = containerRef.current?.dataset.dimensionId

      if (dimensionId !== prevDimensionId) {
        setParticles(generateParticles())
        if (containerRef.current) {
          containerRef.current.dataset.dimensionId = dimensionId
        }
      }
    }
  }, [dimensions, generateParticles])

  // Ajustar la posición del contenedor para seguir el scroll
  useEffect(() => {
    if (!containerRef.current) return

    const updatePosition = () => {
      if (containerRef.current) {
        containerRef.current.style.top = `${window.scrollY}px`
      }
    }

    updatePosition()
    window.addEventListener("scroll", updatePosition)
    return () => window.removeEventListener("scroll", updatePosition)
  }, [])

  return (
    <motion.div
      ref={containerRef}
      className="fixed left-0 w-screen h-screen pointer-events-none"
      style={{
        opacity: particlesOpacity,
        zIndex: 1,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
          }}
          animate={{
            x: [
              0,
              Math.cos((particle.direction * Math.PI) / 180) * 30 * particle.speed,
              Math.cos((particle.direction * Math.PI) / 180) * -20 * particle.speed,
              Math.cos((particle.direction * Math.PI) / 180) * 15 * particle.speed,
              0,
            ],
            y: [
              0,
              Math.sin((particle.direction * Math.PI) / 180) * 30 * particle.speed,
              Math.sin((particle.direction * Math.PI) / 180) * -20 * particle.speed,
              Math.sin((particle.direction * Math.PI) / 180) * 15 * particle.speed,
              0,
            ],
            scale: [1, 1.2, 0.9, 1.1, 1],
            opacity: [particle.opacity, particle.opacity * 1.2, particle.opacity * 0.8, particle.opacity],
          }}
          transition={{
            duration: 4 + Math.random() * 3, // Entre 4 y 7 segundos
            delay: particle.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  )
}
