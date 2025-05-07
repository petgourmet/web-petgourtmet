/**
 * Servicio para gestionar la subida y manipulación de imágenes con Cloudinary
 */

// Configuración básica de Cloudinary
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

/**
 * Sube una imagen a Cloudinary
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
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary no está configurado correctamente. Verifica las variables de entorno.")
  }

  // Crear FormData para la subida
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", UPLOAD_PRESET)
  formData.append("folder", folder)

  try {
    // Iniciar progreso
    if (onProgress) onProgress(10)

    // Realizar la subida a Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    })

    // Actualizar progreso
    if (onProgress) onProgress(70)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Error al subir la imagen a Cloudinary")
    }

    const data = await response.json()

    // Completar progreso
    if (onProgress) onProgress(100)

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
