"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  INGREDIENT_TYPES,
  type Particle,
  type ParticlePosition,
  type IngredientType,
  type EdgeType,
  getInitialPosition,
  getVelocity,
  getBaseSize,
  isOffscreen,
  lerp,
} from "@/utils/particle-utils"

interface ParticleEngineProps {
  count: number
  speed: number
  opacity: number
  maxSize: number
  minSize: number
  depthEffect: boolean
  width: number
  height: number
}

export function useParticleEngine({
  count,
  speed,
  opacity,
  maxSize,
  minSize,
  depthEffect,
  width,
  height,
}: ParticleEngineProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const positionsRef = useRef<ParticlePosition[]>([])
  const targetPositionsRef = useRef<ParticlePosition[]>([])
  const animationRef = useRef<number>(0)
  const timeRef = useRef<number>(Date.now())
  const lastUpdateRef = useRef<number>(Date.now())

  // Generar partículas cuando cambian las dimensiones o propiedades
  useEffect(() => {
    if (width === 0 || height === 0) return

    const edges: EdgeType[] = ["top", "right", "bottom", "left"]
    const newParticles: Particle[] = []
    const newPositions: ParticlePosition[] = []
    const newTargetPositions: ParticlePosition[] = []

    // Distribuir los tipos de ingredientes en cantidades iguales
    const typesCount = INGREDIENT_TYPES.length
    const itemsPerType = Math.ceil(count / typesCount)

    // Crear una distribución equilibrada de tipos
    const typeDistribution: IngredientType[] = []
    INGREDIENT_TYPES.forEach((type) => {
      for (let i = 0; i < itemsPerType; i++) {
        typeDistribution.push(type)
      }
    })

    // Recortar si es necesario para no exceder el count
    const finalDistribution = typeDistribution.slice(0, count)

    for (let i = 0; i < count; i++) {
      // Seleccionar un tipo de la distribución equilibrada
      const type = finalDistribution[i % finalDistribution.length]

      // Profundidad aleatoria (0 = más cercano, 1 = más lejano)
      const depth = Math.random()

      // Tamaño base según el tipo
      const baseSize = getBaseSize(type, minSize, maxSize)

      // Tamaño basado en profundidad (más grande = más cercano)
      const depthFactor = depthEffect ? 1 - depth : 0.5
      const size = baseSize * (depthFactor * 0.6 + 0.4)

      // Velocidad basada en profundidad (más rápido = más cercano)
      const speedFactor = depthEffect ? 1 - depth * 0.7 : 1
      const baseSpeed = (0.5 + Math.random() * 0.8) * speed * speedFactor

      // Opacidad basada en profundidad y tipo
      let opacityMultiplier = 1.0
      if (type === "heart" || type === "paw-cake") {
        opacityMultiplier = 0.9 // Ligeramente más opaco para los pasteles
      }

      const opacityValue = depthEffect
        ? (0.3 + 0.7 * (1 - depth)) * opacity * opacityMultiplier
        : (0.3 + Math.random() * 0.7) * opacity * opacityMultiplier

      // Seleccionar bordes de entrada y salida aleatorios
      const entryEdge = edges[Math.floor(Math.random() * edges.length)]
      let exitEdge = edges[Math.floor(Math.random() * edges.length)]
      // Evitar que entre y salga por el mismo borde
      while (exitEdge === entryEdge) {
        exitEdge = edges[Math.floor(Math.random() * edges.length)]
      }

      // Obtener posición inicial basada en el borde de entrada
      const initialPos = getInitialPosition(entryEdge, size, width, height)

      // Obtener velocidad basada en los bordes y tipo
      const velocity = getVelocity(entryEdge, exitEdge, baseSpeed, type)

      // Estado inicial - la mayoría comienza visible
      const initialState = Math.random() > 0.3 ? "visible" : "entering"
      const initialOpacity = initialState === "visible" ? opacityValue : opacityValue * 0.5

      // Tiempos de cambio de estado aleatorios (entre 8 y 20 segundos)
      const stateChangeTime = 8000 + Math.random() * 12000

      // Para ingredientes visibles, colocarlos aleatoriamente en la pantalla
      let posX = initialPos.x
      let posY = initialPos.y
      if (initialState === "visible") {
        posX = Math.random() * width
        posY = Math.random() * height
      }

      // Ajustar velocidad de rotación según el tipo
      let rotationSpeedMultiplier = 1.0
      if (type === "heart" || type === "paw-cake") {
        rotationSpeedMultiplier = 0.5 // Rotación más lenta para los pasteles
      }

      const particle: Particle = {
        id: i,
        type,
        x: posX,
        y: posY,
        size,
        rotation: Math.random() * 360,
        opacity: opacityValue,
        speedX: velocity.x,
        speedY: velocity.y,
        rotationSpeed: (Math.random() * 0.2 - 0.1) * speed * rotationSpeedMultiplier,
        scale:
          type === "heart" || type === "paw-cake"
            ? 0.9 + Math.random() * 0.2 // Escala más consistente para pasteles
            : 0.8 + Math.random() * 0.4,
        depth,
        directionChangeTime: 8000 + Math.random() * 7000, // Entre 8 y 15 segundos
        lastDirectionChange: Date.now() - Math.random() * 5000, // Inicio escalonado
        state: initialState,
        stateChangeTime,
        lastStateChange: Date.now() - Math.random() * stateChangeTime, // Inicio escalonado
        entryEdge,
        exitEdge,
      }

      newParticles.push(particle)

      const position = {
        x: posX,
        y: posY,
        rotation: particle.rotation,
        opacity: initialOpacity,
        state: initialState,
      }

      newPositions.push({ ...position })
      newTargetPositions.push({ ...position })
    }

    setParticles(newParticles)
    positionsRef.current = newPositions
    targetPositionsRef.current = newTargetPositions
  }, [count, speed, opacity, maxSize, minSize, depthEffect, width, height])

  // Calcular las posiciones objetivo
  const updateTargetPositions = useCallback(() => {
    if (particles.length === 0 || width === 0 || height === 0) return

    const currentTime = Date.now()
    const deltaTime = currentTime - timeRef.current
    timeRef.current = currentTime

    // Limitar deltaTime para evitar saltos grandes después de inactividad
    const safeDeltaTime = Math.min(deltaTime, 100)

    const updatedTargetPositions = [...targetPositionsRef.current]

    particles.forEach((particle, index) => {
      // Check if the target position exists at this index
      if (!updatedTargetPositions[index]) {
        // Initialize it if it doesn't exist
        updatedTargetPositions[index] = {
          x: particle.x,
          y: particle.y,
          rotation: particle.rotation,
          opacity: particle.opacity,
          state: particle.state || "visible",
        }
      }

      let { x, y, rotation, opacity, state } = updatedTargetPositions[index]

      // Gestionar cambios de estado
      if (currentTime - particle.lastStateChange > particle.stateChangeTime) {
        // Cambiar al siguiente estado
        switch (state) {
          case "hidden":
            state = "entering"
            // Reiniciar posición al entrar
            const newPos = getInitialPosition(particle.entryEdge, particle.size, width, height)
            x = newPos.x
            y = newPos.y
            break
          case "entering":
            state = "visible"
            break
          case "visible":
            state = "exiting"
            break
          case "exiting":
            state = "hidden"
            break
        }

        // Actualizar tiempo de último cambio
        particles[index].lastStateChange = currentTime
      }

      // Actualizar opacidad basada en el estado
      if (state === "entering") {
        opacity = Math.min(opacity + 0.03 * (safeDeltaTime / 16.67), particle.opacity)
      } else if (state === "exiting") {
        opacity = Math.max(opacity - 0.03 * (safeDeltaTime / 16.67), 0)
      } else if (state === "hidden") {
        opacity = 0
      } else {
        opacity = particle.opacity
      }

      // Solo mover si es visible o está entrando/saliendo
      if (state !== "hidden") {
        // Comprobar si es hora de cambiar de dirección
        if (currentTime - particle.lastDirectionChange > particle.directionChangeTime) {
          // Cambiar dirección gradualmente (no de golpe)
          const angleChange = (Math.random() * 40 - 20) * (Math.PI / 180)
          const speed = Math.sqrt(particle.speedX * particle.speedX + particle.speedY * particle.speedY)
          const currentAngle = Math.atan2(particle.speedY, particle.speedX)
          const newAngle = currentAngle + angleChange

          particles[index].speedX = Math.cos(newAngle) * speed
          particles[index].speedY = Math.sin(newAngle) * speed

          // Actualizar último cambio de dirección
          particles[index].lastDirectionChange = currentTime
        }

        // Actualizar posición basada en velocidad y tiempo transcurrido
        const timeScale = safeDeltaTime / 16.67 // Normalizar para 60fps
        x += particle.speedX * timeScale
        y += particle.speedY * timeScale
        rotation += particle.rotationSpeed * timeScale

        // Comprobar si ha salido completamente de la pantalla
        if (isOffscreen(x, y, particle.size, width, height)) {
          // Si está saliendo y ya está fuera de pantalla, cambiar a oculto
          if (state === "exiting") {
            state = "hidden"
            particles[index].lastStateChange = currentTime
          }
        }
      }

      // Guardar posición y estado actualizados
      updatedTargetPositions[index] = { x, y, rotation, opacity, state }
    })

    targetPositionsRef.current = updatedTargetPositions
  }, [particles, width, height])

  // Interpolar entre las posiciones actuales y las objetivo para suavizar el movimiento
  const interpolatePositions = useCallback(() => {
    if (particles.length === 0) return

    const currentTime = Date.now()
    const deltaTime = currentTime - lastUpdateRef.current
    lastUpdateRef.current = currentTime

    // Factor de interpolación basado en el tiempo transcurrido (0.1 = 10% del camino por frame)
    // Ajustar este valor para movimientos más suaves (valores más bajos) o más rápidos (valores más altos)
    const lerpFactor = Math.min(0.1, deltaTime / 100)

    const updatedPositions = [...positionsRef.current]
    const targetPositions = targetPositionsRef.current

    for (let i = 0; i < updatedPositions.length; i++) {
      // Skip if either current or target position is undefined
      if (!updatedPositions[i] || !targetPositions[i]) continue

      const current = updatedPositions[i]
      const target = targetPositions[i]

      // Interpolar cada propiedad para un movimiento más suave
      current.x = lerp(current.x, target.x, lerpFactor)
      current.y = lerp(current.y, target.y, lerpFactor)
      current.rotation = lerp(current.rotation, target.rotation, lerpFactor)
      current.opacity = lerp(current.opacity, target.opacity, lerpFactor * 2) // Opacidad cambia más rápido
      current.state = target.state // El estado no se interpola
    }

    positionsRef.current = updatedPositions
  }, [])

  // Animación con interpolación para movimientos más suaves
  useEffect(() => {
    if (particles.length === 0 || width === 0 || height === 0) return

    let lastFrameTime = performance.now()
    const targetFrameTime = 1000 / 60 // Objetivo: 60 FPS

    const animate = (time: number) => {
      // Calcular el tiempo transcurrido desde el último frame
      const elapsed = time - lastFrameTime

      // Si ha pasado suficiente tiempo, actualizar las posiciones objetivo
      if (elapsed >= targetFrameTime) {
        updateTargetPositions()
        lastFrameTime = time
      }

      // Interpolar entre las posiciones actuales y las objetivo en cada frame
      interpolatePositions()

      // Continuar la animación
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [particles, width, height, updateTargetPositions, interpolatePositions])

  return { particles, positions: positionsRef.current }
}
