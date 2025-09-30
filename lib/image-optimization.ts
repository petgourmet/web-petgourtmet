import { supabase } from "@/lib/supabase/client"

/**
 * Optimiza las URLs de imágenes de Supabase con transformaciones
 * @param imagePath - Ruta de la imagen en Supabase Storage
 * @param width - Ancho deseado (default: 400)
 * @param quality - Calidad de la imagen 1-100 (default: 85)
 * @param format - Formato de imagen (default: 'webp')
 * @returns URL optimizada de la imagen
 */
export function getOptimizedImageUrl(
  imagePath: string | null | undefined,
  width = 400,
  quality = 85,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string {
  // Fallback para imágenes vacías
  if (!imagePath) {
    return "/placeholder.svg"
  }

  // Si ya es una URL completa, devolverla tal como está
  if (imagePath.startsWith("http")) {
    return imagePath
  }

  // Si es una ruta local, devolverla tal como está
  if (imagePath.startsWith("/")) {
    return imagePath
  }

  try {
    // Para Supabase Storage con transformaciones
    const { data } = supabase.storage
      .from("products")
      .getPublicUrl(imagePath, {
        transform: {
          width,
          height: width, // Mantener aspecto cuadrado
          resize: 'cover',
          quality,
          format
        }
      })
    
    return data.publicUrl
  } catch (error) {
    console.error("Error al optimizar imagen:", error)
    return "/placeholder.svg"
  }
}

/**
 * Precarga imágenes críticas para mejorar el rendimiento
 * @param imageUrls - Array de URLs de imágenes a precargar
 */
export function preloadCriticalImages(imageUrls: string[]) {
  if (typeof window === 'undefined') return
  
  // Filtrar URLs válidas y evitar duplicados
  const validUrls = [...new Set(imageUrls.filter(url => 
    url && 
    url !== "/placeholder.svg" && 
    url !== "" && 
    !url.includes('undefined') &&
    !document.querySelector(`link[rel="preload"][href="${url}"]`) // Evitar duplicados
  ))]
  
  validUrls.forEach((url) => {
    try {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      link.crossOrigin = 'anonymous' // Evitar warnings de CORS
      
      // Agregar listener para limpiar en caso de error
      link.onerror = () => {
        console.warn(`[preloadCriticalImages] Error precargando imagen: ${url}`)
        link.remove()
      }
      
      document.head.appendChild(link)
    } catch (error) {
      console.warn(`[preloadCriticalImages] Error creando preload para: ${url}`, error)
    }
  })
}

/**
 * Genera URLs optimizadas para diferentes tamaños de pantalla
 * @param imagePath - Ruta de la imagen
 * @returns Objeto con URLs para diferentes breakpoints
 */
export function getResponsiveImageUrls(imagePath: string | null | undefined) {
  return {
    mobile: getOptimizedImageUrl(imagePath, 300, 80),
    tablet: getOptimizedImageUrl(imagePath, 400, 85),
    desktop: getOptimizedImageUrl(imagePath, 500, 90),
    large: getOptimizedImageUrl(imagePath, 600, 95)
  }
}

/**
 * Genera el srcSet para imágenes responsivas
 * @param imagePath - Ruta de la imagen
 * @returns String con el srcSet optimizado
 */
export function generateSrcSet(imagePath: string | null | undefined): string {
  if (!imagePath) return ""
  
  const urls = getResponsiveImageUrls(imagePath)
  
  return [
    `${urls.mobile} 300w`,
    `${urls.tablet} 400w`,
    `${urls.desktop} 500w`,
    `${urls.large} 600w`
  ].join(', ')
}

/**
 * Hook personalizado para manejar la carga de imágenes con estado
 */
export function useImageLoader() {
  const loadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = src
    })
  }

  const preloadImages = async (urls: string[]) => {
    try {
      await Promise.all(urls.map(loadImage))
    } catch (error) {
      console.warn('Error precargando imágenes:', error)
    }
  }

  return { loadImage, preloadImages }
}