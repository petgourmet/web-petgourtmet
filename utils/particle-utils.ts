// Definir los tipos de ingredientes como constantes - solo los que funcionan correctamente
export const INGREDIENT_TYPES = ["bone", "donut", "ball", "heart", "paw-cake"] as const
export type IngredientType = (typeof INGREDIENT_TYPES)[number]

export type ParticleState = "entering" | "visible" | "exiting" | "hidden"
export type EdgeType = "top" | "right" | "bottom" | "left"

export interface Particle {
  id: number
  type: IngredientType
  x: number
  y: number
  size: number
  rotation: number
  opacity: number
  speedX: number
  speedY: number
  rotationSpeed: number
  scale: number
  depth: number
  directionChangeTime: number
  lastDirectionChange: number
  state: ParticleState
  stateChangeTime: number
  lastStateChange: number
  entryEdge: EdgeType
  exitEdge: EdgeType
}

export interface ParticlePosition {
  x: number
  y: number
  rotation: number
  opacity: number
  state: ParticleState
}

// Función para determinar posición inicial basada en el borde de entrada
export function getInitialPosition(
  edge: EdgeType,
  size: number,
  width: number,
  height: number,
): { x: number; y: number } {
  switch (edge) {
    case "top":
      return { x: Math.random() * width, y: -size }
    case "right":
      return { x: width + size, y: Math.random() * height }
    case "bottom":
      return { x: Math.random() * width, y: height + size }
    case "left":
      return { x: -size, y: Math.random() * height }
    default:
      return { x: 0, y: 0 }
  }
}

// Función para determinar velocidad basada en los bordes de entrada y salida
export function getVelocity(
  entryEdge: EdgeType,
  exitEdge: EdgeType,
  baseSpeed: number,
  type: IngredientType,
): { x: number; y: number } {
  // Crear un vector de dirección general basado en los bordes
  let dirX = 0
  let dirY = 0

  // Determinar dirección X basada en bordes horizontales
  if (entryEdge === "left") dirX = 1
  else if (entryEdge === "right") dirX = -1
  else if (exitEdge === "left") dirX = -1
  else if (exitEdge === "right") dirX = 1

  // Determinar dirección Y basada en bordes verticales
  if (entryEdge === "top") dirY = 1
  else if (entryEdge === "bottom") dirY = -1
  else if (exitEdge === "top") dirY = -1
  else if (exitEdge === "bottom") dirY = 1

  // Añadir algo de aleatoriedad a la dirección
  dirX += Math.random() * 0.4 - 0.2
  dirY += Math.random() * 0.4 - 0.2

  // Normalizar el vector para mantener una velocidad constante
  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY)
  if (magnitude > 0) {
    dirX = dirX / magnitude
    dirY = dirY / magnitude
  }

  // Ajustar velocidad según el tipo de ingrediente
  let speedMultiplier = 1.0
  if (type === "heart" || type === "paw-cake") {
    speedMultiplier = 0.7 // Más lento para los pasteles
  }

  return {
    x: dirX * baseSpeed * speedMultiplier,
    y: dirY * baseSpeed * speedMultiplier,
  }
}

// Obtener el tamaño base según el tipo de ingrediente
export function getBaseSize(type: IngredientType, minSize: number, maxSize: number): number {
  switch (type) {
    case "heart":
    case "paw-cake":
      return minSize * 1.4 + (maxSize - minSize) * 0.6 // Tamaño más grande para los pasteles
    default:
      return minSize + (maxSize - minSize) * 0.4 // Tamaño normal para los demás
  }
}

// Obtener la ruta de la imagen según el tipo de ingrediente
export function getIngredientImage(type: IngredientType): string {
  switch (type) {
    case "bone":
      return "/treat-bone-new.png"
    case "donut":
      return "/treat-donut-new.png"
    case "ball":
      return "/treat-ball-new.png"
    case "heart":
      return "/treat-heart-cake.png"
    case "paw-cake":
      return "/treat-paw-cake.png"
    default:
      return "/treat-ball-new.png"
  }
}

// Verificar si una partícula está fuera de la pantalla
export function isOffscreen(x: number, y: number, size: number, width: number, height: number): boolean {
  return x < -size * 2 || x > width + size * 2 || y < -size * 2 || y > height + size * 2
}

// Función para suavizar transiciones usando interpolación
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

// Función para aplicar una curva de ease-in-out a un valor
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
