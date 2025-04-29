"use client"

import { useRef, useState, useEffect } from "react"
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  animate,
  type AnimationOptions,
  useAnimation,
} from "framer-motion"
import Image from "next/image"
import { useMediaQuery } from "@/hooks/use-mobile"

// Interfaz para las partículas
interface BowlParticle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  delay: number
  duration: number
  colorSequence: string[]
  width: number
  height: number
}

// Colores para las partículas (definidos fuera del componente para evitar recreación)
const PARTICLE_COLORS = [
  "#8C4A23", // Café
  "#1E3A8A", // Azul oscuro
  "#111827", // Negro
  "#065F46", // Verde oscuro
]

// Clave para localStorage
const SCROLL_POSITION_KEY = "pet-gourmet-scroll-position"
const ELEMENTS_POSITION_KEY = "pet-gourmet-elements-position"

// Configuración para animaciones más suaves
const SPRING_CONFIG = { stiffness: 60, damping: 15, mass: 1 }
const SPRING_CONFIG_GENTLE = { stiffness: 40, damping: 20, mass: 1.2 }

export function BowlScrollShowcase() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  })

  // Estados para controlar el tamaño de los elementos con doble clic
  const [bowlToggled, setBowlToggled] = useState(false)
  const [ingredientToggled, setIngredientToggled] = useState({
    donut: false,
    bone: false,
    ball: false,
  })

  // Estado para las partículas
  const [particles, setParticles] = useState<BowlParticle[]>([])

  // Estado para guardar la última posición de scroll
  const [lastScrollPosition, setLastScrollPosition] = useState(0)

  // Estado para guardar las posiciones de los elementos
  const [savedPositions, setSavedPositions] = useState<{
    bowl: { x: number; y: number; scale: number }
    ingredients: { x: number; y: number; scale: number; rotate: number }[]
  } | null>(null)

  // Estado para controlar si estamos al final de la secuencia
  const [isAtEnd, setIsAtEnd] = useState(false)

  // Controles de animación para cada elemento
  const bowlControls = useAnimation()
  const donutControls = useAnimation()
  const boneControls = useAnimation()
  const ballControls = useAnimation()

  // Detectar si es dispositivo móvil
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")

  // Valores de motion para animaciones suaves
  const smoothBowlY = useSpring(useMotionValue(0), SPRING_CONFIG)
  const smoothBowlScale = useSpring(useMotionValue(isMobile ? 1.1 : 1.3), SPRING_CONFIG)

  // Monitorear cuando estamos al final de la secuencia y actualizar las animaciones
  useEffect(() => {
    const checkIfAtEnd = () => {
      const currentProgress = scrollYProgress.get()
      const newIsAtEnd = currentProgress >= 0.8

      // Solo actualizar si el estado ha cambiado
      if (newIsAtEnd !== isAtEnd) {
        setIsAtEnd(newIsAtEnd)

        // Iniciar o detener animaciones según corresponda
        if (newIsAtEnd) {
          // Iniciar animaciones de levitación
          startFloatingAnimations()
        } else {
          // Detener animaciones de levitación
          stopFloatingAnimations()
        }
      }
    }

    const unsubscribe = scrollYProgress.onChange(checkIfAtEnd)

    // Verificar también al montar el componente
    checkIfAtEnd()

    return () => unsubscribe()
  }, [scrollYProgress, isAtEnd])

  // Función para iniciar las animaciones de levitación
  const startFloatingAnimations = () => {
    // Animación del tazón
    bowlControls.start({
      y: [bowlY.get() - 6, bowlY.get() + 6, bowlY.get() - 6],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 4.5,
          ease: "easeInOut",
        },
      },
    })

    // Animación del donut
    donutControls.start({
      y: [animations[0].y.get() - 7, animations[0].y.get() + 7, animations[0].y.get() - 7],
      rotate: [animations[0].rotate.get() - 1.5, animations[0].rotate.get() + 1.5, animations[0].rotate.get() - 1.5],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 5,
          ease: "easeInOut",
          delay: 0,
        },
        rotate: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 6,
          ease: "easeInOut",
          delay: 0.2,
        },
      },
    })

    // Animación del hueso
    boneControls.start({
      y: [animations[1].y.get() - 8, animations[1].y.get() + 8, animations[1].y.get() - 8],
      rotate: [animations[1].rotate.get() - 1.5, animations[1].rotate.get() + 1.5, animations[1].rotate.get() - 1.5],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 5.5,
          ease: "easeInOut",
          delay: 0.5,
        },
        rotate: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 6.5,
          ease: "easeInOut",
          delay: 0.7,
        },
      },
    })

    // Animación de la bola
    ballControls.start({
      y: [animations[2].y.get() - 6, animations[2].y.get() + 6, animations[2].y.get() - 6],
      rotate: [animations[2].rotate.get() - 1.5, animations[2].rotate.get() + 1.5, animations[2].rotate.get() - 1.5],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 4.5,
          ease: "easeInOut",
          delay: 1,
        },
        rotate: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 5.5,
          ease: "easeInOut",
          delay: 1.2,
        },
      },
    })
  }

  // Función para detener las animaciones de levitación
  const stopFloatingAnimations = () => {
    // Detener todas las animaciones y volver a la posición original
    bowlControls.stop()
    donutControls.stop()
    boneControls.stop()
    ballControls.stop()

    // Restablecer posiciones
    bowlControls.set({ y: bowlY.get() })
    donutControls.set({ y: animations[0].y.get(), rotate: animations[0].rotate.get() })
    boneControls.set({ y: animations[1].y.get(), rotate: animations[1].rotate.get() })
    ballControls.set({ y: animations[2].y.get(), rotate: animations[2].rotate.get() })
  }

  // Cargar posición de scroll guardada
  useEffect(() => {
    const loadSavedPosition = () => {
      try {
        const savedScrollPosition = localStorage.getItem(SCROLL_POSITION_KEY)
        if (savedScrollPosition) {
          const position = Number.parseFloat(savedScrollPosition)
          // Aplicar la posición de scroll guardada
          if (!isNaN(position) && position > 0) {
            setLastScrollPosition(position)
            // Esperar a que el componente esté montado antes de hacer scroll
            setTimeout(() => {
              const scrollTarget = position * document.documentElement.scrollHeight
              window.scrollTo(0, scrollTarget)
            }, 100)
          }
        }

        // Cargar posiciones guardadas de los elementos
        const savedElementsPosition = localStorage.getItem(ELEMENTS_POSITION_KEY)
        if (savedElementsPosition) {
          const positions = JSON.parse(savedElementsPosition)
          setSavedPositions(positions)
        }
      } catch (error) {
        console.error("Error loading saved positions:", error)
      }
    }

    loadSavedPosition()
  }, [])

  // Guardar posición de scroll actual
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY / document.documentElement.scrollHeight
      setLastScrollPosition(currentScrollPosition)
      localStorage.setItem(SCROLL_POSITION_KEY, currentScrollPosition.toString())
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Generar partículas al montar el componente
  useEffect(() => {
    // Reducir el número de partículas en dispositivos móviles para mejorar el rendimiento
    const particleCount = isMobile ? 20 : 40

    const generateParticles = () => {
      const newParticles: BowlParticle[] = []

      for (let i = 0; i < particleCount; i++) {
        // Posición aleatoria en un círculo alrededor del centro
        const angle = Math.random() * Math.PI * 2
        // Distancia desde el centro (120-200px) - más alejadas del tazón
        const distance = 120 + Math.random() * 80

        // Crear una secuencia de colores única para cada partícula
        // Mezclar los colores en un orden aleatorio para cada partícula
        const shuffledColors = [...PARTICLE_COLORS].sort(() => Math.random() - 0.5)

        // Ajustar la posición X de las partículas 10 unidades a la izquierda
        const particleX = Math.cos(angle) * distance - 10

        newParticles.push({
          id: i,
          x: particleX, // Posición X ajustada
          y: Math.sin(angle) * distance,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5, // Escala entre 0.5 y 1
          opacity: 0.4 + Math.random() * 0.5, // Aumentado: Opacidad entre 0.4 y 0.9 (más visible)
          delay: Math.random() * 5, // Delay aleatorio hasta 5 segundos
          duration: 5 + Math.random() * 7, // Duración entre 5 y 12 segundos (más lento)
          colorSequence: shuffledColors,
          width: 0.5 + Math.random() * 0.5, // Ancho entre 0.5 y 1px
          height: 2 + Math.random() * 3, // Altura entre 2 y 5px
        })
      }

      setParticles(newParticles)
    }

    generateParticles()
  }, [isMobile]) // Eliminar particleColors de las dependencias

  // Definir los ingredientes con posiciones X ajustadas para móvil y desktop
  const ingredients = [
    {
      id: "donut",
      name: "Donut de zanahoria",
      image: "/treat-donut-new.png",
      color: "#F9A8D4",
      initialXOffset: isMobile ? -175 : isTablet ? -200 : -225,
      closeXOffset: isMobile ? -80 : isTablet ? -95 : -110,
    },
    {
      id: "bone",
      name: "Pastel de carne",
      image: "/treat-bone-new.png",
      color: "#8C4A23",
      initialXOffset: isMobile ? -40 : isTablet ? -45 : -50,
      closeXOffset: isMobile ? -20 : isTablet ? -25 : -30,
    },
    {
      id: "ball",
      name: "Bola guau",
      image: "/treat-ball-new.png",
      color: "#7AB8BF",
      initialXOffset: isMobile ? 100 : isTablet ? 115 : 130,
      closeXOffset: isMobile ? 40 : isTablet ? 45 : 50,
    },
  ]

  // Modificar las posiciones iniciales y finales para los ingredientes
  const initialY = -300 // Cambiado a -300 para que caigan desde más alto
  const followY = isMobile ? -30 : -50 // Posición cuando siguen al bowl (más cerca en móvil)
  const finalY = isMobile ? -120 : -190 // Posición final en el semicírculo (más cerca en móvil)

  // Crear transformaciones más suaves para cada ingrediente
  const donutY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      initialY,
      initialY * 0.9,
      initialY * 0.8,
      initialY * 0.6,
      initialY * 0.4,
      initialY * 0.2,
      followY,
      followY,
      finalY,
      finalY,
      finalY,
      isMobile ? finalY - 30 : finalY - 50,
      isMobile ? finalY - 30 : finalY - 50,
      isMobile ? finalY - 30 : finalY - 50,
    ],
  )

  const donutX = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      ingredients[0].initialXOffset * 0.5,
      ingredients[0].initialXOffset * 0.52,
      ingredients[0].initialXOffset * 0.55,
      ingredients[0].initialXOffset * 0.6,
      ingredients[0].initialXOffset * 0.65,
      ingredients[0].initialXOffset * 0.7,
      ingredients[0].initialXOffset * 0.8,
      ingredients[0].closeXOffset,
      ingredients[0].initialXOffset * 0.9,
      ingredients[0].initialXOffset,
      ingredients[0].initialXOffset,
      isMobile ? ingredients[0].initialXOffset - 30 : ingredients[0].initialXOffset - 50,
      isMobile ? ingredients[0].initialXOffset - 30 : ingredients[0].initialXOffset - 50,
      isMobile ? ingredients[0].initialXOffset - 30 : ingredients[0].initialXOffset - 50,
    ],
  )

  // Actualizar las transformaciones para el bone (segundo ingrediente)
  const boneY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      initialY,
      initialY * 0.9,
      initialY * 0.8,
      initialY * 0.6,
      initialY * 0.4,
      initialY * 0.2,
      followY,
      followY,
      finalY,
      finalY,
      finalY,
      isMobile ? finalY - 50 : finalY - 80,
      isMobile ? finalY - 50 : finalY - 80,
      isMobile ? finalY - 50 : finalY - 80,
    ],
  )

  const boneX = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      ingredients[1].initialXOffset * 0.5,
      ingredients[1].initialXOffset * 0.52,
      ingredients[1].initialXOffset * 0.55,
      ingredients[1].initialXOffset * 0.6,
      ingredients[1].initialXOffset * 0.65,
      ingredients[1].initialXOffset * 0.7,
      ingredients[1].initialXOffset * 0.8,
      ingredients[1].closeXOffset,
      ingredients[1].initialXOffset * 0.9,
      ingredients[1].initialXOffset,
      ingredients[1].initialXOffset,
      ingredients[1].initialXOffset,
      ingredients[1].initialXOffset,
      ingredients[1].initialXOffset,
    ],
  )

  // Actualizar las transformaciones para el ball (tercer ingrediente)
  const ballY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      initialY,
      initialY * 0.9,
      initialY * 0.8,
      initialY * 0.6,
      initialY * 0.4,
      initialY * 0.2,
      followY,
      followY,
      finalY,
      finalY,
      finalY,
      isMobile ? finalY - 30 : finalY - 50,
      isMobile ? finalY - 30 : finalY - 50,
      isMobile ? finalY - 30 : finalY - 50,
    ],
  )

  const ballX = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      ingredients[2].initialXOffset * 0.5,
      ingredients[2].initialXOffset * 0.52,
      ingredients[2].initialXOffset * 0.55,
      ingredients[2].initialXOffset * 0.6,
      ingredients[2].initialXOffset * 0.65,
      ingredients[2].initialXOffset * 0.7,
      ingredients[2].initialXOffset * 0.8,
      ingredients[2].closeXOffset,
      ingredients[2].initialXOffset * 0.9,
      ingredients[2].initialXOffset,
      ingredients[2].initialXOffset,
      isMobile ? ingredients[2].initialXOffset + 30 : ingredients[2].initialXOffset + 50,
      isMobile ? ingredients[2].initialXOffset + 30 : ingredients[2].initialXOffset + 50,
      isMobile ? ingredients[2].initialXOffset + 30 : ingredients[2].initialXOffset + 50,
    ],
  )

  // Animación para el bowl con más puntos de control
  const bowlY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [20, 19, 18, 16, 14, 12, 8, 4, 0, -5, -8, -10, -10, -10],
  )

  const bowlScale = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [
      isMobile ? 1.1 : 1.3,
      isMobile ? 1.12 : 1.32,
      isMobile ? 1.14 : 1.34,
      isMobile ? 1.16 : 1.36,
      isMobile ? 1.18 : 1.38,
      isMobile ? 1.2 : 1.4,
      isMobile ? 1.22 : 1.42,
      isMobile ? 1.26 : 1.46,
      isMobile ? 1.3 : 1.5,
      isMobile ? 1.3 : 1.5,
      isMobile ? 1.3 : 1.5,
      isMobile ? 1.3 : 1.5,
      isMobile ? 1.3 : 1.5,
      isMobile ? 1.3 : 1.5,
    ],
  )

  // Opacidad de las partículas basada en el scroll con transición más suave
  const particlesOpacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    [0, 0.3, 0.6, 1, 1, 1, 1, 1, 1, 1, 1],
  )

  // Agrupar las transformaciones para facilitar el acceso
  const donutOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [1, 1, 1, 1])

  const donutScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.8, 1],
    [isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5],
  )

  const donutRotate = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.8, 1], [0, 0, 0, 0, 0])

  const boneOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [1, 1, 1, 1])

  const boneScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.8, 1],
    [isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5],
  )

  const boneRotate = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.8, 1], [0, 0, 0, 0, 0])

  const ballOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [1, 1, 1, 1])

  const ballScale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.8, 1],
    [isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5, isMobile ? 1.0 : 1.5],
  )

  const ballRotate = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.8, 1], [0, 0, 0, 0, 0])

  const animations = [
    { x: donutX, y: donutY, opacity: donutOpacity, scale: donutScale, rotate: donutRotate },
    { x: boneX, y: boneY, opacity: boneOpacity, scale: boneScale, rotate: boneRotate },
    { x: ballX, y: ballY, opacity: ballOpacity, scale: ballScale, rotate: ballRotate },
  ]

  // Animación para las etiquetas de los ingredientes con transición más suave
  const labelsOpacity = useTransform(scrollYProgress, [0.6, 0.65, 0.7, 0.75, 0.8], [0, 0.25, 0.5, 0.75, 1])

  // Función para manejar el doble clic en el tazón
  const handleBowlDoubleClick = () => {
    setBowlToggled(!bowlToggled)
  }

  // Función para manejar el doble clic en un ingrediente
  const handleIngredientDoubleClick = (id: string) => {
    setIngredientToggled((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Guardar posiciones de los elementos
  useEffect(() => {
    const saveElementPositions = () => {
      try {
        const positions = {
          bowl: {
            x: -90,
            y: bowlY.get(),
            scale: bowlScale.get(),
          },
          ingredients: ingredients.map((_, index) => ({
            x: animations[index].x.get(),
            y: animations[index].y.get(),
            scale: animations[index].scale.get(),
            rotate: animations[index].rotate.get(),
          })),
        }

        localStorage.setItem(ELEMENTS_POSITION_KEY, JSON.stringify(positions))
      } catch (error) {
        console.error("Error saving element positions:", error)
      }
    }

    // Guardar posiciones cuando cambia el scroll
    const unsubscribeScroll = scrollYProgress.onChange(saveElementPositions)

    return () => {
      unsubscribeScroll()
    }
  }, [scrollYProgress, bowlY, bowlScale])

  // Inicializar suavemente la animación al cargar
  useEffect(() => {
    const initializeAnimation = async () => {
      // Pequeño retraso para asegurar que todo esté renderizado
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Opciones de animación suave
      const options: AnimationOptions<number> = {
        type: "spring",
        ...SPRING_CONFIG_GENTLE,
        duration: 1.5,
      }

      // Animar suavemente desde valores iniciales
      if (scrollYProgress.get() < 0.05) {
        // Solo aplicar animación inicial si estamos cerca del principio
        smoothBowlY.set(30) // Valor inicial más alto
        smoothBowlScale.set(isMobile ? 1.05 : 1.25) // Escala inicial más pequeña

        // Animar hacia los valores correctos
        animate(smoothBowlY, 20, options)
        animate(smoothBowlScale, isMobile ? 1.1 : 1.3, options)
      }
    }

    initializeAnimation()
  }, [isMobile, scrollYProgress, smoothBowlY, smoothBowlScale])

  return (
    <section ref={ref} className="relative h-[300vh] w-full">
      {/* Sticky container visible todo el tiempo */}
      <div className="sticky top-0 h-screen flex items-center justify-center bg-transparent">
        <div className="relative w-full max-w-xl h-[600px]">
          {/* Contenedor central para el bowl y los ingredientes */}
          <div className="bowl-animation-container absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[400px]">
            {/* Bowl lleno (siempre visible) */}
            <motion.div
              className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
              style={{
                y: bowlY,
                scale: bowlToggled ? 1.5 : bowlScale,
                x: -90,
              }}
              animate={bowlControls}
              transition={{
                scale: { duration: 0.5, ease: "easeInOut" },
              }}
              whileTap={{
                scale: bowlToggled ? 1.2 : bowlScale,
                rotate: [0, -3, 3, -2, 0],
                transition: { duration: 0.4, ease: "easeInOut" },
              }}
              onDoubleClick={handleBowlDoubleClick}
              aria-label="Tazón de comida para perros"
            >
              <div className="relative cursor-pointer transform translate-y-8 -translate-x-6">
                <Image
                  src="/pet-bowl-full.png"
                  alt="Tazón lleno"
                  width={isMobile ? 550 : 700}
                  height={isMobile ? 275 : 350}
                  className="mx-auto"
                  loading="lazy"
                />
                {/* Contenedor de partículas alrededor del tazón */}
                <motion.div
                  className="absolute top-1/2 left-1/2 w-full h-full"
                  style={{
                    opacity: particlesOpacity,
                    zIndex: 25,
                    pointerEvents: "none",
                  }}
                >
                  {particles.map((particle) => (
                    <motion.div
                      key={`particle-${particle.id}`}
                      className="absolute rounded-sm will-change-transform"
                      style={{
                        width: particle.width,
                        height: particle.height,
                        x: particle.x,
                        y: particle.y,
                        rotate: particle.rotation,
                        originX: "50%",
                        originY: "50%",
                        opacity: 0,
                      }}
                      animate={{
                        x: [
                          particle.x,
                          particle.x + Math.random() * 15 - 7.5,
                          particle.x - Math.random() * 15 - 7.5,
                          particle.x,
                        ],
                        y: [
                          particle.y,
                          particle.y + Math.random() * 15 - 7.5,
                          particle.y - Math.random() * 15 - 7.5,
                          particle.y,
                        ],
                        rotate: [
                          particle.rotation,
                          particle.rotation + Math.random() * 30,
                          particle.rotation - Math.random() * 30,
                          particle.rotation,
                        ],
                        opacity: [0, particle.opacity, particle.opacity, 0],
                        scale: [particle.scale * 0.8, particle.scale, particle.scale * 0.9, particle.scale * 0.7],
                        backgroundColor: [
                          particle.colorSequence[0],
                          particle.colorSequence[1],
                          particle.colorSequence[2],
                          particle.colorSequence[3],
                          particle.colorSequence[0],
                        ],
                      }}
                      transition={{
                        duration: particle.duration,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "loop",
                        delay: particle.delay,
                        ease: "easeInOut",
                        backgroundColor: {
                          duration: particle.duration / 4,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                          ease: "easeInOut",
                        },
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* Ingredientes animados con nombres que aparecen al final */}
            {ingredients.map((item, index) => {
              // Determinar el z-index según el ingrediente
              const zIndex = item.id === "bone" ? 40 : 10

              // Crear un offset de animación único para cada ingrediente
              const floatOffset = index * 0.5 // Desfase para que no floten todos al mismo tiempo

              // Controles de animación según el ingrediente
              const controls = index === 0 ? donutControls : index === 1 ? boneControls : ballControls

              return (
                <motion.div
                  key={`ingredient-${item.id}`}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    x: animations[index].x,
                    y: animations[index].y,
                    scale: animations[index].scale,
                    opacity: animations[index].opacity,
                    rotate: animations[index].rotate,
                    zIndex: zIndex,
                  }}
                  animate={controls}
                  transition={{
                    scale: { duration: 0.5, ease: "easeInOut" },
                  }}
                  whileTap={{
                    scale: animations[index].scale,
                    rotate: [0, -5, 5, -3, 0],
                    transition: { duration: 0.4, ease: "easeInOut" },
                  }}
                  onDoubleClick={() => handleIngredientDoubleClick(item.id)}
                  aria-label={`Ingrediente: ${item.name}`}
                >
                  <div className="relative cursor-pointer transform -translate-x-8">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={isMobile ? 120 : 180}
                      height={isMobile ? 120 : 180}
                      loading="lazy"
                    />

                    {/* Etiqueta del ingrediente que aparece al final */}
                    <motion.div
                      className="absolute text-[8px] font-medium text-white px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap"
                      style={{
                        backgroundColor: item.color,
                        top: isMobile ? "5px" : "10px",
                        opacity: labelsOpacity,
                        background: `${item.color}99`,
                        left: index === 0 ? (isMobile ? "25%" : "30%") : index === 1 ? "50%" : isMobile ? "60%" : "55%",
                        transform: "translateX(-50%)",
                        marginTop: "0px",
                        maxWidth: isMobile ? "60px" : "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
