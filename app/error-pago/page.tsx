import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default async function ErrorPagoPage({
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

  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-20 w-20 text-red-500" />
        </div>

        <Heading title="Error en el pago" description="Ha ocurrido un problema al procesar tu pago" />

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
                <strong>Estado del pedido:</strong> {order.status === "cancelled" ? "Cancelado" : order.status}
              </p>
              <p>
                <strong>Estado del pago:</strong> {order.payment_status === "failed" ? "Fallido" : order.payment_status}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-700 mb-2">¿Qué ha ocurrido?</h3>
            <p className="text-red-600">Tu pago no ha podido ser procesado. Esto puede deberse a varias razones:</p>
            <ul className="list-disc list-inside mt-2 text-red-600">
              <li>Fondos insuficientes en la tarjeta</li>
              <li>Datos de la tarjeta incorrectos</li>
              <li>La transacción fue rechazada por el banco</li>
              <li>Problemas técnicos con el procesador de pagos</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">¿Qué puedes hacer?</h3>
            <ul className="list-disc list-inside mt-2 text-blue-600">
              <li>Intentar nuevamente con otra tarjeta o método de pago</li>
              <li>Verificar que los datos de tu tarjeta sean correctos</li>
              <li>Contactar con tu banco para asegurarte de que no haya restricciones en tu tarjeta</li>
              <li>Contactar con nuestro servicio de atención al cliente para recibir asistencia</li>
            </ul>
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
