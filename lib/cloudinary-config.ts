// Configuración para Cloudinary usando las variables correctas
export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "petgourmet",
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  // Usar un upload preset por defecto que no requiere configuración
  uploadPreset: "ml_default", // Este es un preset público por defecto de Cloudinary
}
