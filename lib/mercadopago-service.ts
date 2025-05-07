import { createClient } from "@/lib/supabase/client"
import type { CartItem } from "@/components/cart-context"

// Tipos para Mercado Pago
export type MercadoPagoPreference = {
  id: string
  init_point: string
  sandbox_init_point: string
}

export type MercadoPagoItem = {
  id: string
  title: string
  description: string
  picture_url: string
  category_id: string
  quantity: number
  currency_id: string
  unit_price: number
}

export interface ShippingAddress {
  street_name: string
  street_number: string
  zip_code: string
  city: string
  state: string
  country: string
}

export interface OrderDetails {
  items: CartItem[]
  customer: {
    name: string
    email: string
    phone: string
  }
  shipping: {
    address: ShippingAddress
    cost: number
    method: string
  }
  notes: string
  total: number
  userId?: string
}

// Función para crear una preferencia de pago en Mercado Pago
export async function createMercadoPagoPreference(orderDetails: OrderDetails) {
  try {
    // Crear el pedido en la base de datos primero
    const supabase = createClient()

    // Preparar los datos del pedido
    const orderData = {
      user_id: orderDetails.userId || null,
      total: orderDetails.total,
      shipping_address: orderDetails.shipping.address,
      status: "pending",
      payment_status: "pending",
      customer_name: orderDetails.customer.name,
      customer_email: orderDetails.customer.email,
      customer_phone: orderDetails.customer.phone,
      shipping_method: orderDetails.shipping.method,
      shipping_cost: orderDetails.shipping.cost,
      notes: orderDetails.notes,
    }

    // Insertar el pedido y obtener el ID
    const { data: orderData_, error: orderError } = await supabase.rpc("create_order_with_number", orderData)

    if (orderError) {
      console.error("Error al crear el pedido:", orderError)
      throw new Error("Error al crear el pedido")
    }

    const orderId = orderData_.id
    const orderNumber = orderData_.order_number

    // Insertar los items del pedido
    const orderItems = orderDetails.items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      product_name: item.name,
      product_image: item.image,
      quantity: item.quantity,
      price: item.isSubscription ? item.price * 0.9 : item.price,
      size: item.size,
      is_subscription: item.isSubscription || false,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) {
      console.error("Error al crear los items del pedido:", itemsError)
      throw new Error("Error al crear los items del pedido")
    }

    // Crear la preferencia de pago en Mercado Pago
    const response = await fetch("/api/mercadopago/create-preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: orderDetails.items.map((item) => ({
          id: item.id,
          title: item.name,
          description: `${item.size}${item.isSubscription ? " (Suscripción)" : ""}`,
          picture_url: item.image,
          quantity: item.quantity,
          unit_price: item.isSubscription ? item.price * 0.9 : item.price,
        })),
        payer: {
          name: orderDetails.customer.name.split(" ")[0],
          surname: orderDetails.customer.name.split(" ").slice(1).join(" "),
          email: orderDetails.customer.email,
          phone: {
            number: orderDetails.customer.phone,
          },
          address: {
            street_name: orderDetails.shipping.address.street_name,
            street_number: orderDetails.shipping.address.street_number,
            zip_code: orderDetails.shipping.address.zip_code,
          },
        },
        shipments: {
          cost: orderDetails.shipping.cost,
          mode: "custom",
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/gracias-por-tu-compra?order_id=${orderId}&order_number=${orderNumber}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/error-pago?order_id=${orderId}&order_number=${orderNumber}`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/pago-pendiente?order_id=${orderId}&order_number=${orderNumber}`,
        },
        auto_return: "approved",
        external_reference: orderId,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al crear la preferencia de pago")
    }

    const preference = await response.json()

    // Actualizar el pedido con el ID de preferencia
    const { error: updateError } = await supabase
      .from("orders")
      .update({ mercadopago_preference_id: preference.id })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error al actualizar el pedido con el ID de preferencia:", updateError)
    }

    return preference
  } catch (error) {
    console.error("Error en createMercadoPagoPreference:", error)
    throw error
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await fetch(`/api/mercadopago/payment-status?payment_id=${paymentId}`)

    if (!response.ok) {
      throw new Error("Error al obtener el estado del pago")
    }

    return await response.json()
  } catch (error) {
    console.error("Error en getPaymentStatus:", error)
    throw error
  }
}
