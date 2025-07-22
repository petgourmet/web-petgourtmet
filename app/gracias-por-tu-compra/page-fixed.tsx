import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, Package, Clock, CreditCard, Heart, Star, Gift } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GraciasPorTuCompraProps {
  searchParams: { 
    order_id?: string
    order_number?: string
    payment_id?: string 
  }
}

export default async function GraciasPorTuCompraPage({
  searchParams,
}: GraciasPorTuCompraProps) {
  const orderId = searchParams.order_id
  const orderNumber = searchParams.order_number
  const paymentId = searchParams.payment_id

  if (!orderId) {
    redirect("/")
  }

  const supabase = await createClient()

  // Obtener detalles del pedido
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, profiles(email, full_name, phone)")
    .eq("id", orderId)
    .single()

  if (orderError || !order) {
    redirect("/")
  }

  // Parsear datos del pedido
  let orderData = null
  try {
    orderData = order.shipping_address ? JSON.parse(order.shipping_address) : null
  } catch (e) {
    console.error("Error parsing order data:", e)
  }

  const customerName = orderData?.customer_data?.firstName && orderData?.customer_data?.lastName 
    ? `${orderData.customer_data.firstName} ${orderData.customer_data.lastName}`
    : order.customer_name || order.profiles?.full_name || "Cliente"

  const customerEmail = orderData?.customer_data?.email || order.profiles?.email || "No especificado"

  // Determinar si es una suscripción
  const isSubscription = orderData?.frequency && orderData?.frequency !== "none"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container max-w-5xl py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-green-400 rounded-full opacity-25"></div>
              <CheckCircle className="h-24 w-24 text-green-500 relative z-10" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            ¡Gracias por tu compra, {customerName}! 
            <Heart className="inline h-8 w-8 text-red-500 ml-2" />
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Tu pedido ha sido procesado exitosamente y ya estamos preparando todo con amor para tu mascota
          </p>
          <div className="flex justify-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Información del pedido */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-6 w-6" />
                Detalles del pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between">
                <strong>Número de pedido:</strong> 
                <Badge variant="outline" className="font-mono">#{order.id}</Badge>
              </div>
              <div className="flex justify-between">
                <strong>Fecha:</strong> 
                <span>{new Date(order.created_at).toLocaleDateString('es-MX', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex justify-between">
                <strong>Total:</strong> 
                <span className="text-2xl font-bold text-green-600">${order.total} MXN</span>
              </div>
              <div className="flex justify-between items-center">
                <strong>Estado:</strong> 
                <Badge className={
                  order.status === "processing" ? "bg-green-500" :
                  order.status === "pending" ? "bg-yellow-500" :
                  "bg-gray-500"
                }>
                  {order.status === "processing" ? "✅ En proceso" : 
                   order.status === "pending" ? "⏳ Pendiente" : order.status}
                </Badge>
              </div>
              {paymentId && (
                <div className="flex justify-between">
                  <strong>ID de pago:</strong> 
                  <span className="font-mono text-sm">{paymentId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-6 w-6" />
                Información del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between">
                <strong>Nombre:</strong> 
                <span>{customerName}</span>
              </div>
              <div className="flex justify-between">
                <strong>Email:</strong> 
                <span className="text-sm">{customerEmail}</span>
              </div>
              {(orderData?.customer_data?.phone || order.customer_phone || order.profiles?.phone) && (
                <div className="flex justify-between">
                  <strong>Teléfono:</strong> 
                  <span>{orderData?.customer_data?.phone || order.customer_phone || order.profiles?.phone}</span>
                </div>
              )}
              {orderData?.customer_data?.address && (
                <div>
                  <strong>Dirección de envío:</strong>
                  <div className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                    {orderData.customer_data.address.street_name} {orderData.customer_data.address.street_number}<br/>
                    {orderData.customer_data.address.city}, {orderData.customer_data.address.state}<br/>
                    CP: {orderData.customer_data.address.zip_code}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Próximos pasos */}
        <Card className="mt-8 shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-6 w-6" />
              ¿Qué sigue ahora?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">Preparamos tu pedido</h4>
                <p className="text-sm text-gray-600">Nuestro equipo está seleccionando cuidadosamente cada producto</p>
              </div>
              <div className="text-center">
                <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h4 className="font-semibold mb-2">Procesamos y enviamos</h4>
                <p className="text-sm text-gray-600">Te notificaremos por email cuando tu pedido esté en camino</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">¡Tu mascota disfruta!</h4>
                <p className="text-sm text-gray-600">Nutrición premium para una vida más saludable y feliz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
              <Link href="/productos">
                <Package className="mr-2 h-5 w-5" />
                Continuar Comprando
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/perfil">
                Ver Mis Pedidos
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mt-6">
            ¿Tienes alguna pregunta? <Link href="/contacto" className="text-blue-600 hover:underline">Contáctanos</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
