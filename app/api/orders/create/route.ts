import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { total, status, user_id, items, metadata } = body

    const supabase = await createClient()

    // Crear el pedido usando el cliente del servidor (evita problemas de RLS)
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        total,
        status,
        user_id,
      })
      .select("id")
      .single()

    if (orderError) {
      console.error("Error al crear el pedido:", orderError)
      return NextResponse.json({ error: "Error al crear el pedido: " + orderError.message }, { status: 500 })
    }

    const orderId = orderData.id

    // Insertar los items del pedido
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) {
        console.error("Error al crear los items del pedido:", itemsError)
        // No fallar completamente si los items no se pueden insertar
      }
    }

    // Guardar metadata si se proporciona
    if (metadata) {
      try {
        const orderMetadata = {
          order_id: orderId,
          ...metadata,
        }
        await supabase.from("order_metadata").insert(orderMetadata)
      } catch (metadataError) {
        console.log("No se pudo guardar metadata adicional:", metadataError)
        // No fallar si no se puede guardar metadata
      }
    }

    return NextResponse.json({ orderId, success: true })
  } catch (error) {
    console.error("Error en create order route:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
