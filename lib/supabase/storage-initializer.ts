import { supabaseAdmin } from "./admin-client"

export interface BucketStatus {
  exists: boolean
  isPublic: boolean
  error?: string
}

export async function checkBucketStatus(bucketName: string): Promise<BucketStatus> {
  try {
    if (!supabaseAdmin) {
      return {
        exists: false,
        isPublic: false,
        error: "Admin client not available",
      }
    }

    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      return {
        exists: false,
        isPublic: false,
        error: listError.message,
      }
    }

    const bucket = buckets?.find((b) => b.name === bucketName)

    if (!bucket) {
      return {
        exists: false,
        isPublic: false,
        error: "Bucket not found",
      }
    }

    return {
      exists: true,
      isPublic: bucket.public || false,
    }
  } catch (error) {
    return {
      exists: false,
      isPublic: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function initializeStorage(bucketName = "product-images"): Promise<{
  success: boolean
  message: string
  bucketStatus?: BucketStatus
}> {
  try {
    if (!supabaseAdmin) {
      return {
        success: false,
        message: "Admin client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.",
      }
    }

    // Verificar estado actual del bucket
    const bucketStatus = await checkBucketStatus(bucketName)

    if (bucketStatus.exists) {
      return {
        success: true,
        message: `Bucket '${bucketName}' already exists and is ${bucketStatus.isPublic ? "public" : "private"}`,
        bucketStatus,
      }
    }

    // Crear el bucket si no existe
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      fileSizeLimit: 5242880, // 5MB
    })

    if (error) {
      return {
        success: false,
        message: `Error creating bucket: ${error.message}`,
      }
    }

    // Verificar que se creó correctamente
    const newBucketStatus = await checkBucketStatus(bucketName)

    return {
      success: true,
      message: `Bucket '${bucketName}' created successfully`,
      bucketStatus: newBucketStatus,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export default {
  initializeStorage,
  checkBucketStatus,
}
