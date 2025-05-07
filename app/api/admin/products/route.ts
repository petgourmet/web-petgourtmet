import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { action, productId, data } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Cliente de administrador no disponible. Verifica la clave de servicio." },
        { status: 500 },
      )
    }

    // Verificar autenticación (esto debería mejorarse con middleware)
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !userData.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const adminEmails = ["admin@petgourmet.com", "cristoferscalante@gmail.com"]
    if (!adminEmails.includes(userData.user.email || "")) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Procesar la acción solicitada
    switch (action) {
      case "getSizes":
        if (!productId) {
          return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 })
        }
        const { data: sizes, error: sizesError } = await supabaseAdmin
          .from("product_sizes")
          .select("*")
          .eq("product_id", productId)

        if (sizesError) {
          return NextResponse.json({ error: sizesError.message }, { status: 500 })
        }
        return NextResponse.json({ sizes })

      case "saveSizes":
        if (!productId || !data || !Array.isArray(data)) {
          return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
        }

        // Eliminar tamaños existentes
        const { error: deleteError } = await supabaseAdmin.from("product_sizes").delete().eq("product_id", productId)
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // Insertar nuevos tamaños
        const sizesWithProductId = data
          .filter((size) => size.weight && size.weight.trim() !== "")
          .map((size) => ({
            ...size,
            product_id: productId,
          }))

        if (sizesWithProductId.length > 0) {
          const { error: insertError } = await supabaseAdmin.from("product_sizes").insert(sizesWithProductId)
          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
          }
        }

        return NextResponse.json({ success: true })

      // Agregar más acciones según sea necesario

      default:
        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error en API de productos:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
