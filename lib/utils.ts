import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte un string en un slug URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD") // Normalizar acentos
    .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Espacios a guiones
    .replace(/[^\w-]+/g, "") // Eliminar caracteres no alfanuméricos
    .replace(/--+/g, "-") // Eliminar guiones múltiples
    .replace(/^-+/, "") // Eliminar guiones al inicio
    .replace(/-+$/, "") // Eliminar guiones al final
}
