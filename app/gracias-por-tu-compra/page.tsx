import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, Package, Clock, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function GraciasPorTuCompraPage({
  searchParams,
}: {
  searchParams: { order_id?: string; order_number?: string; payment_id?: string }
}) {
  const orderId = searchParams.order_id
  const orderNumber = searchParams.order_number
  const paymentId = searchParams.payment_id

  if (!orderId || !orderNumber) {
    redirect("/")
  }

  const supabase = await createClient()

  // Obtener detalles del pedido
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, profiles(email, full_name, phone)")
    .eq("id", orderId)
    .eq("order_number", orderNumber)
    .single()

  if (orderError || !order) {
    redirect("/")
  }

  // Parsear datos del formulario si existen
  let formData = null
  try {
    formData = order.notes ? JSON.parse(order.notes) : null
  } catch (e) {
    console.error("Error parsing form data:", e)
  }

  const customerName = formData?.firstName && formData?.lastName 
    ? `${formData.firstName} ${formData.lastName}`
    : order.customer_name || order.profiles?.full_name || "Cliente"

  const customerEmail = formData?.email || order.profiles?.email || "No especificado"

  // Determinar si es una suscripción
  const isSubscription = formData?.frequency && formData?.frequency !== "none"

  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          <Heading title="¡Gracias por tu compra!">
            ¡Gracias por tu compra!
          </Heading>
          <p className="text-gray-600 mt-2">Tu pedido ha sido procesado exitosamente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información del pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Detalles del pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong>Número de pedido:</strong> {order.order_number}
              </div>
              <div>
                <strong>Fecha:</strong> {new Date(order.created_at).toLocaleDateString()}
              </div>
              <div>
                <strong>Total:</strong> ${order.total} MXN
              </div>
              <div>
                <strong>Estado:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  order.status === "processing" ? "bg-green-100 text-green-700" :
                  order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {order.status === "processing" ? "En proceso" : 
                   order.status === "pending" ? "Pendiente" : order.status}
                </span>
              </div>
              {paymentId && (
                <div>
                  <strong>ID de pago:</strong> {paymentId}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Información del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong>Nombre:</strong> {customerName}
              </div>
              <div>
                <strong>Email:</strong> {customerEmail}
              </div>
              {(formData?.phone || order.customer_phone || order.profiles?.phone) && (
                <div>
                  <strong>Teléfono:</strong> {formData?.phone || order.customer_phone || order.profiles?.phone}
                </div>
              )}
              {order.shipping_address && (
                <div>
                  <strong>Dirección de envío:</strong>
                  <div className="text-sm text-gray-600 mt-1">
                    {order.shipping_address}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información de suscripción si aplica */}
        {isSubscription && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                Detalles de suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong>Frecuencia:</strong> 
                <span className="ml-2">
                  {formData.frequency === "weekly" ? "Semanal" :
                   formData.frequency === "monthly" ? "Mensual" :
                   formData.frequency === "quarterly" ? "Trimestral" :
                   formData.frequency === "annual" ? "Anual" : formData.frequency}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-700 mb-2">¡Has activado una suscripción!</h4>
                <p className="text-blue-600 text-sm">
                  Tu próximo pedido se procesará automáticamente según la frecuencia seleccionada. 
                  Puedes gestionar tu suscripción desde tu perfil de usuario.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        {/* Estado del pago y próximos pasos */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-700 mb-3">¿Qué sigue ahora?</h3>
          <div className="space-y-2 text-green-600">
            <p>✅ Recibirás un correo electrónico de confirmación con todos los detalles</p>
            <p>✅ Te notificaremos cuando tu pedido esté listo para envío</p>
            <p>✅ Podrás hacer seguimiento del estado desde tu perfil de usuario</p>
            {isSubscription && (
              <p>✅ Tu suscripción está activa y se renovará automáticamente</p>
            )}
          </div>
        </div>

        {/* Estado específico del pago */}
        {order.payment_status === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-yellow-700 mb-2">Pago en proceso</h4>
            <p className="text-yellow-600 text-sm">
              Tu pago está siendo procesado. Te notificaremos cuando se complete la transacción.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
          <Button asChild className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/">Continuar comprando</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/perfil">Ver mis pedidos</Link>
          </Button>
          {isSubscription && (
            <Button asChild variant="outline">
              <Link href="/perfil?tab=subscriptions">Gestionar suscripción</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
