/**
 * Utilidades para manejo seguro de fechas
 * Evita errores de "Invalid time value" cuando se trabaja con fechas desde la base de datos
 */

/**
 * Valida si una fecha es válida
 */
export const isValidDate = (date: Date | string | null | undefined): boolean => {
  if (!date) return false
  
  const dateObj = date instanceof Date ? date : new Date(date)
  return !isNaN(dateObj.getTime())
}

/**
 * Formatea una fecha de forma segura a string localizado
 * @param dateString - String de fecha, puede ser null o undefined
 * @param locale - Locale para formatear (default: 'es-MX')
 * @param options - Opciones de formato
 * @returns String formateado o mensaje de error
 */
export const formatDate = (
  dateString: string | null | undefined,
  locale: string = 'es-MX',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return 'No disponible'
  
  try {
    const date = new Date(dateString)
    
    // Validar que la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida:', dateString)
      return 'Fecha inválida'
    }
    
    return date.toLocaleDateString(locale, options)
  } catch (error) {
    console.error('Error formateando fecha:', dateString, error)
    return 'Error en fecha'
  }
}

/**
 * Formatea una fecha y hora de forma segura
 */
export const formatDateTime = (
  dateString: string | null | undefined,
  locale: string = 'es-MX'
): string => {
  if (!dateString) return 'No disponible'
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida:', dateString)
      return 'Fecha inválida'
    }
    
    return date.toLocaleString(locale)
  } catch (error) {
    console.error('Error formateando fecha y hora:', dateString, error)
    return 'Error en fecha'
  }
}

/**
 * Convierte fecha a ISO string de forma segura
 */
export const toISOStringSafe = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida para ISO:', dateString)
      return null
    }
    
    return date.toISOString()
  } catch (error) {
    console.error('Error convirtiendo a ISO string:', dateString, error)
    return null
  }
}

/**
 * Formatea una fecha relativa (ej: "hace 2 días")
 */
export const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Fecha desconocida'
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`
    return `Hace ${Math.floor(diffDays / 365)} años`
  } catch (error) {
    console.error('Error calculando fecha relativa:', dateString, error)
    return 'Fecha no disponible'
  }
}

/**
 * Obtiene el timestamp actual de forma segura
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString()
}

/**
 * Parsea una fecha de forma segura
 */
export const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.error('Error parseando fecha:', dateString, error)
    return null
  }
}
