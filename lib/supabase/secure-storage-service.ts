import { supabase } from "./client"

export class SecureStorageService {
  private bucketName: string

  constructor(bucketName: string) {
    this.bucketName = bucketName
  }

  async checkBucketExists(): Promise<boolean> {
    try {
      console.log(`Verificando si el bucket ${this.bucketName} existe...`)

      // Usar getBucket en lugar de listBuckets para verificar un bucket específico
      const { data, error } = await supabase.storage.getBucket(this.bucketName)

      if (error) {
        console.error(`Error al verificar bucket ${this.bucketName}:`, error)
        return false
      }

      console.log(`Bucket ${this.bucketName} encontrado:`, data)
      return true
    } catch (error) {
      console.error(`Error inesperado al verificar bucket ${this.bucketName}:`, error)
      return false
    }
  }

  async createBucketIfNotExists(): Promise<boolean> {
    try {
      const exists = await this.checkBucketExists()
      if (exists) return true

      console.log(`Creando bucket ${this.bucketName}...`)
      const { error } = await supabase.storage.createBucket(this.bucketName, {
        public: true,
      })

      if (error) {
        console.error(`Error al crear bucket ${this.bucketName}:`, error)
        return false
      }

      console.log(`Bucket ${this.bucketName} creado correctamente`)
      return true
    } catch (error) {
      console.error(`Error inesperado al crear bucket ${this.bucketName}:`, error)
      return false
    }
  }

  async uploadFile(file: File, folderPath = ""): Promise<string | null> {
    try {
      // Verificar si el bucket existe
      const bucketExists = await this.checkBucketExists()
      if (!bucketExists) {
        throw new Error(`El bucket ${this.bucketName} no existe`)
      }

      // Crear una ruta única para el archivo
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName

      console.log(`Subiendo archivo a ${this.bucketName}/${filePath}...`)

      // Subir el archivo
      const { data, error } = await supabase.storage.from(this.bucketName).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Error al subir archivo:", error)
        throw error
      }

      console.log("Archivo subido exitosamente:", data)

      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage.from(this.bucketName).getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error("Error en uploadFile:", error)
      throw error
    }
  }

  async listFiles(folderPath = ""): Promise<{ name: string; url: string }[]> {
    try {
      const { data, error } = await supabase.storage.from(this.bucketName).list(folderPath)

      if (error) {
        console.error("Error al listar archivos:", error)
        throw error
      }

      if (!data) return []

      return data
        .filter((item) => !item.id.endsWith("/")) // Filtrar carpetas
        .map((item) => ({
          name: item.name,
          url: supabase.storage
            .from(this.bucketName)
            .getPublicUrl(folderPath ? `${folderPath}/${item.name}` : item.name).data.publicUrl,
        }))
    } catch (error) {
      console.error("Error en listFiles:", error)
      throw error
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(this.bucketName).remove([filePath])

      if (error) {
        console.error("Error al eliminar archivo:", error)
        throw error
      }
    } catch (error) {
      console.error("Error en deleteFile:", error)
      throw error
    }
  }
}

// Instancias preconfiguradas para uso común
export const productImagesStorage = new SecureStorageService("images")
export const blogImagesStorage = new SecureStorageService("images")
export const avatarStorage = new SecureStorageService("avatars")
export const documentStorage = new SecureStorageService("documents")
