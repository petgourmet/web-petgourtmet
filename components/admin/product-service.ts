import { supabase } from "@/lib/supabase/client"
import { getAdminClient } from "@/lib/supabase/admin-client"

// Función para obtener el cliente adecuado según la operación
export async function getProductClient(requireAdmin = false) {
  if (requireAdmin) {
    try {
      // Verificar si el usuario actual es administrador
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) {
        throw new Error("No hay sesión activa")
      }

      const { data: user } = await supabase.auth.getUser()
      const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]

      if (adminEmails.includes(user.user?.email || "")) {
        // Es administrador, usar cliente admin
        return getAdminClient()
      } else {
        // No es administrador, usar cliente normal
        return supabase
      }
    } catch (error) {
      console.error("Error al verificar permisos:", error)
      return supabase
    }
  }

  // Para operaciones que no requieren permisos de administrador
  return supabase
}

// Funciones específicas para operaciones de productos

export async function saveProductSizes(productId: number, sizes: any[]) {
  try {
    const client = await getProductClient(true)

    // Eliminar tamaños existentes
    const { error: deleteError } = await client.from("product_sizes").delete().eq("product_id", productId)

    if (deleteError) {
      console.error("Error al eliminar tamaños:", deleteError)
      throw deleteError
    }

    // Filtrar tamaños válidos
    const validSizes = sizes
      .filter((size) => size.weight && size.weight.trim() !== "")
      .map((size) => ({
        ...size,
        product_id: productId,
      }))

    if (validSizes.length === 0) {
      return { success: true }
    }

    // Insertar nuevos tamaños
    const { error: insertError } = await client.from("product_sizes").insert(validSizes)

    if (insertError) {
      console.error("Error al insertar tamaños:", insertError)
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error en saveProductSizes:", error)
    return { success: false, error }
  }
}

export async function saveProductImages(productId: number, images: any[]) {
  try {
    const client = await getProductClient(true)

    // Eliminar imágenes existentes
    const { error: deleteError } = await client.from("product_images").delete().eq("product_id", productId)

    if (deleteError) {
      console.error("Error al eliminar imágenes:", deleteError)
      throw deleteError
    }

    // Filtrar imágenes válidas
    const validImages = images
      .filter((image) => image.url && image.url.trim() !== "")
      .map((image) => ({
        ...image,
        product_id: productId,
      }))

    if (validImages.length === 0) {
      return { success: true }
    }

    // Insertar nuevas imágenes
    const { error: insertError } = await client.from("product_images").insert(validImages)

    if (insertError) {
      console.error("Error al insertar imágenes:", insertError)
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error en saveProductImages:", error)
    return { success: false, error }
  }
}

export async function saveProductFeatures(productId: number, features: any[]) {
  try {
    const client = await getProductClient(true)

    // Eliminar características existentes
    const { error: deleteError } = await client.from("product_features").delete().eq("product_id", productId)

    if (deleteError) {
      console.error("Error al eliminar características:", deleteError)
      throw deleteError
    }

    // Filtrar características válidas
    const validFeatures = features
      .filter((feature) => feature.name && feature.name.trim() !== "")
      .map((feature) => ({
        ...feature,
        product_id: productId,
      }))

    if (validFeatures.length === 0) {
      return { success: true }
    }

    // Insertar nuevas características
    const { error: insertError } = await client.from("product_features").insert(validFeatures)

    if (insertError) {
      console.error("Error al insertar características:", insertError)
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error en saveProductFeatures:", error)
    return { success: false, error }
  }
}

export async function saveProductReviews(productId: number, reviews: any[]) {
  try {
    const client = await getProductClient(true)

    // Eliminar reseñas existentes
    const { error: deleteError } = await client.from("product_reviews").delete().eq("product_id", productId)

    if (deleteError) {
      console.error("Error al eliminar reseñas:", deleteError)
      throw deleteError
    }

    // Filtrar reseñas válidas
    const validReviews = reviews
      .filter((review) => review.rating)
      .map(({ user_id, ...rest }) => ({
        ...rest,
        product_id: productId,
        created_at: rest.created_at || new Date().toISOString(),
      }))

    if (validReviews.length === 0) {
      return { success: true }
    }

    // Insertar nuevas reseñas
    const { error: insertError } = await client.from("product_reviews").insert(validReviews)

    if (insertError) {
      console.error("Error al insertar reseñas:", insertError)
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error en saveProductReviews:", error)
    return { success: false, error }
  }
}
