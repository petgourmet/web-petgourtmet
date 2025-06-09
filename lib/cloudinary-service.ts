/**
 * Servicio para gestionar la subida y manipulación de imágenes con Cloudinary
 * Usando upload directo desde el cliente
 */

// Configuración básica de Cloudinary
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

/**
 * Sube una imagen a Cloudinary usando upload directo
 * @param file Archivo a subir
 * @param folder Carpeta donde se guardará (ej: 'products', 'blogs')
 * @param onProgress Función callback para reportar progreso
 * @returns URL de la imagen subida
 */
export async function uploadImage(
  file: File,
  folder = "general",
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error("CLOUDINARY_CLOUD_NAME no está configurado correctamente. Verifica las variables de entorno.")
  }

  // Crear FormData para la subida
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "ml_default") // Preset por defecto de Cloudinary
  formData.append("folder", `petgourmet/${folder}`)

  try {
    // Iniciar progreso
    if (onProgress) onProgress(10)

    console.log("Subiendo imagen a Cloudinary directamente...")

    // Realizar la subida directa a Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    })

    // Actualizar progreso
    if (onProgress) onProgress(70)

    if (!response.ok) {
      const error = await response.json()
      console.error("Error de Cloudinary:", error)
      throw new Error(error.error?.message || "Error al subir la imagen a Cloudinary")
    }

    const data = await response.json()

    // Completar progreso
    if (onProgress) onProgress(100)

    console.log("Imagen subida exitosamente:", data.secure_url)

    // Devolver la URL segura de la imagen
    return data.secure_url
  } catch (error: any) {
    console.error("Error al subir imagen a Cloudinary:", error)
    throw new Error(`Error al subir imagen: ${error.message}`)
  }
}

/**
 * Genera una URL de transformación de Cloudinary
 * @param url URL original de Cloudinary
 * @param options Opciones de transformación
 * @returns URL transformada
 */
export function getTransformedUrl(
  url: string,
  options: {
    width?: number
    height?: number
    crop?: "fill" | "scale" | "fit" | "thumb"
    quality?: number
  } = {},
): string {
  if (!url || !url.includes("cloudinary.com")) return url

  // Extraer partes de la URL de Cloudinary
  const urlParts = url.split("/upload/")
  if (urlParts.length !== 2) return url

  // Construir parámetros de transformación
  const transformations = []

  if (options.width) transformations.push(`w_${options.width}`)
  if (options.height) transformations.push(`h_${options.height}`)
  if (options.crop) transformations.push(`c_${options.crop}`)
  if (options.quality) transformations.push(`q_${options.quality}`)

  // Si no hay transformaciones, devolver URL original
  if (transformations.length === 0) return url

  // Construir URL transformada
  return `${urlParts[0]}/upload/${transformations.join(",")}/v1/${urlParts[1]}`
}

/**
 * Obtiene una URL de miniatura optimizada
 * @param url URL original de Cloudinary
 * @param size Tamaño de la miniatura
 * @returns URL de la miniatura
 */
export function getThumbnailUrl(url: string, size = 200): string {
  return getTransformedUrl(url, {
    width: size,
    height: size,
    crop: "fill",
    quality: 80,
  })
}

/**
 * Extrae el public_id de una URL de Cloudinary
 * @param url URL de Cloudinary
 * @returns public_id o null si no se puede extraer
 */
export function extractPublicId(url: string): string | null {
  try {
    if (!url || !url.includes("cloudinary.com")) return null

    // Buscar el patrón /upload/v{version}/{public_id}.{extension}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
    if (match && match[1]) {
      return match[1]
    }

    return null
  } catch (error) {
    console.error("Error al extraer public_id:", error)
    return null
  }
}
