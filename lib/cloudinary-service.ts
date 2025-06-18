/**
 * Servicio simple para subir imágenes a Cloudinary
 * Sin dependencias de crypto o SDK server-side
 */

/**
 * Sube una imagen a Cloudinary usando upload directo con preset
 * @param file Archivo a subir
 * @param folder Carpeta donde se guardará
 * @param onProgress Función callback para reportar progreso
 * @returns URL de la imagen subida
 */
export async function uploadImage(
  file: File,
  folder = "general",
  onProgress?: (progress: number) => void,
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME no está configurado")
  }

  try {
    if (onProgress) onProgress(10)

    // Crear FormData simple
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "ml_default") // Preset por defecto que siempre existe

    console.log("Subiendo a Cloudinary con preset ml_default...")

    // Upload directo a Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (onProgress) onProgress(70)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error de Cloudinary:", errorText)
      throw new Error(`Error de Cloudinary: ${errorText}`)
    }

    const result = await response.json()

    if (onProgress) onProgress(100)

    console.log("Upload exitoso:", result.secure_url)
    return result.secure_url
  } catch (error: any) {
    console.error("Error en upload:", error)
    throw new Error(`Error al subir imagen: ${error.message}`)
  }
}

/**
 * Genera una URL de transformación de Cloudinary
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

  const urlParts = url.split("/upload/")
  if (urlParts.length !== 2) return url

  const transformations = []

  if (options.width) transformations.push(`w_${options.width}`)
  if (options.height) transformations.push(`h_${options.height}`)
  if (options.crop) transformations.push(`c_${options.crop}`)
  if (options.quality) transformations.push(`q_${options.quality}`)

  if (transformations.length === 0) return url

  return `${urlParts[0]}/upload/${transformations.join(",")}/v1/${urlParts[1]}`
}

/**
 * Obtiene una URL de miniatura optimizada
 */
export function getThumbnailUrl(url: string, size = 200): string {
  return getTransformedUrl(url, {
    width: size,
    height: size,
    crop: "fill",
    quality: 80,
  })
}
