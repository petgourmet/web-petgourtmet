import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: "ID del producto requerido" }, { status: 400 })
    }

    // Usar cliente admin con permisos completos
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Configuración de Supabase incompleta" }, { status: 500 })
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Obtener el producto original
    const { data: originalProduct, error: productError } = await supabaseServer
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()

    if (productError || !originalProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    // 2. Crear el producto duplicado
    const { id, created_at, updated_at, ...productDataWithoutId } = originalProduct
    const duplicatedProductData = {
      ...productDataWithoutId,
      name: `${originalProduct.name} - Copia`,
      slug: `${originalProduct.slug}-copia-${Date.now()}`,
    }

    const { data: newProduct, error: insertError } = await supabaseServer
      .from("products")
      .insert([duplicatedProductData])
      .select()
      .single()

    if (insertError || !newProduct) {
      console.error("Error al duplicar producto:", insertError)
      return NextResponse.json({ error: "Error al duplicar el producto" }, { status: 500 })
    }

    const newProductId = newProduct.id

    // 3. Duplicar imágenes del producto
    try {
      const { data: originalImages } = await supabaseServer
        .from("product_images")
        .select("*")
        .eq("product_id", productId)

      if (originalImages && originalImages.length > 0) {
        const duplicatedImages = originalImages.map(img => {
          const { id, created_at, ...imageWithoutId } = img
          return {
            ...imageWithoutId,
            product_id: newProductId,
          }
        })

        await supabaseServer
          .from("product_images")
          .insert(duplicatedImages)
      }
    } catch (error) {
      console.warn("Error al duplicar imágenes:", error)
    }

    // 4. Duplicar características del producto
    try {
      const { data: originalFeatures } = await supabaseServer
        .from("product_features")
        .select("*")
        .eq("product_id", productId)

      if (originalFeatures && originalFeatures.length > 0) {
        const duplicatedFeatures = originalFeatures.map(feature => {
          const { id, created_at, ...featureWithoutId } = feature
          return {
            ...featureWithoutId,
            product_id: newProductId,
          }
        })

        await supabaseServer
          .from("product_features")
          .insert(duplicatedFeatures)
      }
    } catch (error) {
      console.warn("Error al duplicar características:", error)
    }

    // 5. Duplicar tamaños del producto
    try {
      const { data: originalSizes } = await supabaseServer
        .from("product_sizes")
        .select("*")
        .eq("product_id", productId)

      if (originalSizes && originalSizes.length > 0) {
        const duplicatedSizes = originalSizes.map(size => {
          const { id, created_at, ...sizeWithoutId } = size
          return {
            ...sizeWithoutId,
            product_id: newProductId,
          }
        })

        await supabaseServer
          .from("product_sizes")
          .insert(duplicatedSizes)
      }
    } catch (error) {
      console.warn("Error al duplicar tamaños:", error)
    }

    // 6. NO duplicar reseñas (las reseñas son específicas del producto original)

    return NextResponse.json({
      success: true,
      message: "Producto duplicado exitosamente",
      newProductId: newProductId,
      newProduct: newProduct
    })

  } catch (error: any) {
    console.error("Error en duplicate-product:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}