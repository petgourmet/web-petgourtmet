import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: { order_id?: string; order_number?: string }
}) {
  const orderId = searchParams.order_id
  const orderNumber = searchParams.order_number

  if (!orderId || !orderNumber) {
    redirect("/")
  }

  const supabase = createClient()

  // Obtener detalles del pedido
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("order_number", orderNumber)
    .single()

  if (orderError || !order) {
    redirect("/")
  }

  // Obtener items del pedido
  const { data: orderItems, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", orderId)

  if (itemsError) {
    console.error("Error al obtener los items del pedido:", itemsError)
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>

        <Heading title="¡Gracias por tu compra!" description="Tu pedido ha sido recibido correctamente" />

        <div className="mt-8 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Detalles del pedido</h3>
              <p>
                <strong>Número de pedido:</strong> {order.order_number}
              </p>
              <p>
                <strong>Fecha:</strong> {new Date(order.created_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Estado del pedido:</strong> {order.status === "processing" ? "En proceso" : order.status}
              </p>
              <p>
                <strong>Estado del pago:</strong> {order.payment_status === "paid" ? "Pagado" : order.payment_status}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Información de envío</h3>
              <p>
                <strong>Nombre:</strong> {order.customer_name}
              </p>
              <p>
                <strong>Email:</strong> {order.customer_email}
              </p>
              <p>
                <strong>Teléfono:</strong> {order.customer_phone}
              </p>
              <p>
                <strong>Dirección:</strong> {order.shipping_address.street_name} {order.shipping_address.street_number},{" "}
                {order.shipping_address.city}, {order.shipping_address.state}, {order.shipping_address.zip_code}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <h3 className="text-lg font-semibold mb-4">Resumen del pedido</h3>
          <div className="space-y-4">
            {orderItems &&
              orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    {item.product_image && (
                      <div className="w-16 h-16 rounded-md overflow-hidden mr-4">
                        <img
                          src={item.product_image || "/placeholder.svg"}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        {item.size} x {item.quantity}
                        {item.is_subscription && " (Suscripción)"}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>€{(order.total - (order.shipping_cost || 0) - order.total * 0.21).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Envío</span>
              <span>€{(order.shipping_cost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Impuestos</span>
              <span>€{(order.total * 0.21).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-4">
              <span>Total</span>
              <span>€{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
          <Button asChild className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/">Volver a la tienda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contacto">Contactar con nosotros</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
