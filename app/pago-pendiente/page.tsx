import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Clock } from "lucide-react"

export default async function PagoPendientePage({
  searchParams,
}: {
  searchParams: { order_id?: string; order_number?: string }
}) {
  const orderId = searchParams.order_id
  const orderNumber = searchParams.order_number

  if (!orderId || !orderNumber) {
    redirect("/")
  }

  const supabase = await createClient()

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
          <Clock className="h-20 w-20 text-yellow-500" />
        </div>

        <Heading title="Pago en proceso">
          Pago en proceso
        </Heading>
        <p className="text-gray-600 mt-2">Tu pago está siendo procesado</p>

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
                <strong>Estado del pedido:</strong> {order.status === "pending" ? "Pendiente" : order.status}
              </p>
              <p>
                <strong>Estado del pago:</strong>{" "}
                {order.payment_status === "pending" ? "En proceso" : order.payment_status}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">¿Qué significa esto?</h3>
            <p className="text-yellow-600">Tu pago está siendo procesado por Mercado Pago. Esto puede deberse a:</p>
            <ul className="list-disc list-inside mt-2 text-yellow-600">
              <li>Verificaciones adicionales de seguridad</li>
              <li>Procesamiento por parte del banco</li>
              <li>Métodos de pago que requieren confirmación adicional</li>
              <li>Pago en efectivo pendiente de confirmación</li>
            </ul>
          </div>

          {/* Instrucciones específicas para pago en efectivo */}
          {order.payment_method === "efectivo" || order.payment_method === "cash" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Pago en Efectivo - Instrucciones</h3>
              <div className="text-blue-600 space-y-2">
                <p><strong>¡Tu pedido está confirmado!</strong> Solo necesitas completar el pago en efectivo.</p>
                <p><strong>¿Qué debes hacer?</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Realiza el pago en efectivo por <strong>${order.total} MXN</strong></li>
                  <li>Una vez realizado el pago, comunícate con nosotros para confirmar</li>
                  <li>Envía tu comprobante de pago al WhatsApp: <strong>+52 123 456 7890</strong></li>
                  <li>Incluye tu número de pedido: <strong>{order.order_number}</strong></li>
                </ul>
                <div className="bg-blue-100 rounded p-3 mt-3">
                  <p className="font-semibold">Datos para transferencia bancaria:</p>
                  <p>Banco: BBVA Bancomer</p>
                  <p>Cuenta: 1234567890</p>
                  <p>CLABE: 012345678901234567</p>
                  <p>Titular: PetGourmet S.A. de C.V.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">¿Qué debes hacer?</h3>
              <p className="text-blue-600">
                No es necesario que hagas nada en este momento. Te notificaremos por email cuando el pago se haya
                completado.
              </p>
              <p className="text-blue-600 mt-2">
                Si después de 24 horas no has recibido confirmación, por favor contacta con nuestro servicio de atención
                al cliente.
              </p>
            </div>
          )}
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
