"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, XCircle, Mail, Clock, Calendar, CreditCard, Pause, Play, Square } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchOrderDetails(params.id as string)
    }
  }, [params.id])

  async function fetchOrderDetails(orderId: string) {
    try {
      setLoading(true)
      setError(null)

      // Obtener detalles del pedido (sin join con profiles que no existe)
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()

      if (error) throw error
      if (!data) throw new Error("Pedido no encontrado")

      setOrder(data)
    } catch (error: any) {
      console.error("Error al cargar detalles del pedido:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(status: string) {
    if (!order) return

    try {
      setUpdating(true)

      // Usar la nueva API que envía emails automáticamente
      const response = await fetch('/api/admin/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          newStatus: status,
          sendEmail: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar estado')
      }

      // Actualizar el pedido en el estado
      setOrder({ ...order, status })
      
      // Mostrar mensaje de éxito con confirmación de email
      toast.success(
        `Estado actualizado a ${getStatusLabel(status)}`,
        {
          description: "✉️ Email de notificación enviado al cliente",
          duration: 5000,
        }
      )

    } catch (error: any) {
      console.error("Error al actualizar estado del pedido:", error)
      toast.error("Error al actualizar estado", {
        description: error.message,
        duration: 5000,
      })
    } finally {
      setUpdating(false)
    }
  }

  // Función auxiliar para obtener el label del estado
  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      processing: "Procesando", 
      completed: "Completado",
      cancelled: "Cancelado"
    }
    return labels[status] || status
  }

  // Formatear número como moneda
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Formatear fecha
  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <p>Error: {error}</p>
          <button
            onClick={() => fetchOrderDetails(params.id as string)}
            className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">
          <p>No se encontró la orden</p>
        </div>
      </div>
    )
  }

  try {
    return (
      <AuthGuard requireAdmin={true}>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </button>
              <h1 className="text-2xl font-bold">Pedido #{typeof order.id === 'string' ? order.id.substring(0, 8) : order.id}</h1>
            </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Información del pedido */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha del pedido</p>
                  <p>{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de pago</p>
                  <p>{order.payment_method || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID de transacción</p>
                  <p>{order.transaction_id || "N/A"}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 font-medium">Productos</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-center">Cantidad</th>
                        <th className="p-2 text-right">Precio</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Intentar obtener items desde shipping_address o desde items directamente
                        let items = []
                        
                        try {
                          if (order.items && Array.isArray(order.items)) {
                            items = order.items
                          } else if (order.shipping_address) {
                            const metadata = JSON.parse(order.shipping_address)
                            items = metadata.items || []
                          } else if (order.items && typeof order.items === 'string') {
                            items = JSON.parse(order.items)
                          }
                        } catch (e) {
                          console.error('Error parsing items:', e)
                          items = []
                        }

                        if (items && items.length > 0) {
                          return items.map((item: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">
                                <div>
                                  <p className="font-medium">{item.title || item.name || "Producto sin nombre"}</p>
                                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                  {item.variant && <p className="text-sm text-muted-foreground">{item.variant}</p>}
                                </div>
                              </td>
                              <td className="p-2 text-center">{item.quantity || 1}</td>
                              <td className="p-2 text-right">{formatCurrency(item.unit_price || item.price || 0)}</td>
                              <td className="p-2 text-right">{formatCurrency((item.unit_price || item.price || 0) * (item.quantity || 1))}</td>
                            </tr>
                          ))
                        } else {
                          return (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                No hay productos en este pedido
                              </td>
                            </tr>
                          )
                        }
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={3} className="p-2 text-right font-medium">
                          Subtotal
                        </td>
                        <td className="p-2 text-right">{formatCurrency(order.subtotal || 0)}</td>
                      </tr>
                      {order.shipping_cost > 0 && (
                        <tr>
                          <td colSpan={3} className="p-2 text-right font-medium">
                            Envío
                          </td>
                          <td className="p-2 text-right">{formatCurrency(order.shipping_cost || 0)}</td>
                        </tr>
                      )}
                      {order.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="p-2 text-right font-medium">
                            Descuento
                          </td>
                          <td className="p-2 text-right">-{formatCurrency(order.discount || 0)}</td>
                        </tr>
                      )}
                      <tr className="border-t">
                        <td colSpan={3} className="p-2 text-right font-bold">
                          Total
                        </td>
                        <td className="p-2 text-right font-bold">{formatCurrency(order.total || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 font-medium">Actualizar Estado</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Al cambiar el estado se enviará una notificación por email al cliente
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateOrderStatus("pending")}
                    disabled={updating || order.status === "pending"}
                    className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                  >
                    {updating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Package className="mr-1 h-4 w-4" />} 
                    Pendiente
                  </button>
                  <button
                    onClick={() => updateOrderStatus("processing")}
                    disabled={updating || order.status === "processing"}
                    className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  >
                    {updating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Truck className="mr-1 h-4 w-4" />} 
                    Procesando
                  </button>
                  <button
                    onClick={() => updateOrderStatus("completed")}
                    disabled={updating || order.status === "completed"}
                    className="inline-flex items-center rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    {updating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />} 
                    Completado
                  </button>
                  <button
                    onClick={() => updateOrderStatus("cancelled")}
                    disabled={updating || order.status === "cancelled"}
                    className="inline-flex items-center rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {updating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />} 
                    Cancelado
                  </button>
                </div>
              </div>

              {/* Botón para confirmar pago en efectivo */}
              {order.payment_status === "pending" && (order.payment_method === "efectivo" || order.payment_method === "cash") && (
                <div className="mb-6">
                  <h3 className="mb-2 font-medium text-green-600">Confirmar Pago en Efectivo</h3>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-700 mb-3">
                      Este pedido está pendiente de confirmación de pago en efectivo.
                    </p>
                    <button
                      onClick={async () => {
                        if (confirm("¿Confirmas que has recibido el pago en efectivo por este pedido?")) {
                          try {
                            setUpdating(true)
                            const response = await fetch("/api/admin/confirm-payment", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                orderId: order.id,
                                paymentMethod: "efectivo",
                                notes: "Pago en efectivo confirmado manualmente"
                              })
                            })
                            
                            if (response.ok) {
                              await fetchOrderDetails(order.id)
                              alert("Pago confirmado exitosamente")
                            } else {
                              alert("Error al confirmar el pago")
                            }
                          } catch (error) {
                            console.error("Error:", error)
                            alert("Error al confirmar el pago")
                          } finally {
                            setUpdating(false)
                          }
                        }
                      }}
                      disabled={updating}
                      className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {updating ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1 h-4 w-4" />
                      )}
                      Confirmar Pago Recibido
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  // Intentar parsear los datos del formulario desde shipping_address
                  let orderMetadata = null
                  let customerData = null
                  
                  try {
                    if (order.shipping_address && typeof order.shipping_address === 'string') {
                      orderMetadata = JSON.parse(order.shipping_address)
                      customerData = orderMetadata?.customer_data || orderMetadata
                    }
                  } catch (e) {
                    console.error('Error parsing order metadata:', e)
                    console.error('shipping_address content:', order.shipping_address)
                  }

                  if (customerData && (customerData.firstName || customerData.customer_name || customerData.email)) {
                    // Mostrar datos del formulario de checkout
                    const fullName = customerData.firstName && customerData.lastName 
                      ? `${customerData.firstName} ${customerData.lastName}`
                      : customerData.customer_name || order.customer_name || "No especificado"

                    return (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre Completo</p>
                          <p className="font-medium">{fullName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{customerData.email || customerData.customer_email || order.user_email || "No especificado"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{customerData.phone || order.customer_phone || "No especificado"}</p>
                        </div>
                        {customerData.address && typeof customerData.address === 'object' && (
                          <>
                            <div className="mt-6">
                              <h3 className="mb-2 font-medium">Dirección de Envío</h3>
                              <div className="rounded-md bg-muted p-3">
                                <p>{customerData.address.street_name} {customerData.address.street_number}</p>
                                {customerData.address.city && <p>{customerData.address.city}, {customerData.address.state} {customerData.address.zip_code}</p>}
                                {customerData.address.country && <p>{customerData.address.country}</p>}
                              </div>
                            </div>
                          </>
                        )}
                        {orderMetadata && orderMetadata.frequency && orderMetadata.frequency !== 'none' && (
                          <>
                            <SubscriptionInfo 
                              orderId={order.id}
                              frequency={orderMetadata.frequency}
                              orderNumber={orderMetadata.order_number}
                            />
                          </>
                        )}
                      </>
                    )
                  } else {
                    // Fallback a datos básicos de la orden
                    return (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{order.customer_name || "Cliente anónimo"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{order.user_email || "No especificado"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{order.customer_phone || "No especificado"}</p>
                        </div>
                      </>
                    )
                  }
                })()}
              </div>

              <div className="mt-6">
                <h3 className="mb-2 font-medium">Dirección de Envío</h3>
                <div className="rounded-md bg-muted p-3">
                  {(() => {
                    try {
                      if (!order.shipping_address) {
                        return <p className="text-muted-foreground">No hay dirección de envío</p>
                      }

                      let metadata = null
                      if (typeof order.shipping_address === 'string' && order.shipping_address.startsWith('{')) {
                        metadata = JSON.parse(order.shipping_address)
                      }

                      const address = metadata?.customer_data?.address || metadata?.address

                      if (address && typeof address === 'object') {
                        return (
                          <>
                            <p>{address.street_name || ''} {address.street_number || ''}</p>
                            {(address.city || address.state || address.zip_code) && (
                              <p>{address.city || ''}{address.state ? `, ${address.state}` : ''} {address.zip_code || ''}</p>
                            )}
                            {address.country && <p>{address.country}</p>}
                          </>
                        )
                      } else if (typeof order.shipping_address === 'string' && !order.shipping_address.startsWith('{')) {
                        return <p>{order.shipping_address}</p>
                      } else {
                        return <p className="text-muted-foreground">No hay dirección de envío</p>
                      }
                    } catch (e) {
                      console.error('Error parsing shipping address:', e)
                      return <p className="text-muted-foreground">Error al cargar dirección</p>
                    }
                  })()}
                </div>
              </div>

              {/* Sección para mostrar datos completos del formulario */}
              {(() => {
                let metadata = null
                try {
                  metadata = order.shipping_address ? JSON.parse(order.shipping_address) : null
                } catch (e) {
                  console.error('Error parsing metadata:', e)
                }

                if (metadata && metadata.items) {
                  return (
                    <div className="mt-6">
                      <h3 className="mb-2 font-medium">Datos Completos del Pedido</h3>
                      <div className="rounded-md bg-muted p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">Número de Orden:</p>
                            <p>{metadata.order_number}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Subtotal:</p>
                            <p>${metadata.subtotal}</p>
                          </div>
                        </div>
                        {metadata.items && metadata.items.length > 0 && (
                          <div className="mt-4">
                            <p className="font-medium text-muted-foreground mb-2">Productos:</p>
                            <div className="space-y-2">
                              {metadata.items.map((item: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{item.title}</span> - 
                                  Cantidad: {item.quantity} - 
                                  Precio: ${item.unit_price}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Información de suscripción si aplica */}
              {(() => {
                let formData = null
                try {
                  formData = order.notes ? JSON.parse(order.notes) : null
                } catch (e) {
                  console.error("Error parsing form data:", e)
                }
                
                const isSubscription = formData?.frequency && formData?.frequency !== "none"
                
                if (isSubscription) {
                  return (
                    <div className="mb-6">
                      <h3 className="mb-3 font-medium text-blue-600">Información de Suscripción</h3>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Frecuencia</p>
                            <p className="text-blue-700">
                              {formData.frequency === "weekly" ? "Semanal" :
                               formData.frequency === "monthly" ? "Mensual" :
                               formData.frequency === "quarterly" ? "Trimestral" :
                               formData.frequency === "annual" ? "Anual" : formData.frequency}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Estado</p>
                            <p className="text-blue-700">
                              {order.payment_status === "approved" ? "Activa" : "Pendiente de activación"}
                            </p>
                          </div>
                          {formData.subscriptionStartDate && (
                            <div>
                              <p className="text-sm text-blue-600 font-medium">Fecha de inicio</p>
                              <p className="text-blue-700">{new Date(formData.subscriptionStartDate).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 rounded bg-blue-100 p-3">
                          <p className="text-sm text-blue-700">
                            <strong>Nota:</strong> Este pedido generará una suscripción automática que se procesará 
                            según la frecuencia seleccionada una vez que el pago sea confirmado.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
  } catch (renderError) {
    console.error('Error rendering order details:', renderError)
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <p>Error al cargar los detalles del pedido</p>
          <p className="text-sm mt-2">Por favor, intenta recargar la página.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
          >
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}

// Componente para mostrar el estado del pedido
function OrderStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800"

  switch (status) {
    case "completed":
      bgColor = "bg-green-100 text-green-800"
      break
    case "processing":
      bgColor = "bg-blue-100 text-blue-800"
      break
    case "cancelled":
      bgColor = "bg-red-100 text-red-800"
      break
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800"
      break
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgColor}`}>
      {status === "completed"
        ? "Completado"
        : status === "processing"
          ? "Procesando"
          : status === "cancelled"
            ? "Cancelado"
            : status === "pending"
              ? "Pendiente"
              : status}
    </span>
  )
}

// Componente para mostrar el estado del pago
function PaymentStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800"

  switch (status) {
    case "paid":
      bgColor = "bg-green-100 text-green-800"
      break
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800"
      break
    case "failed":
      bgColor = "bg-red-100 text-red-800"
      break
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgColor}`}>
      {status === "paid" ? "Pagado" : status === "pending" ? "Pendiente" : status === "failed" ? "Fallido" : status}
    </span>
  )
}

// Componente para información de suscripción con temporizador
function SubscriptionInfo({ orderId, frequency, orderNumber }: { orderId: number, frequency: string, orderNumber?: string }) {
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<string>("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
  }, [orderId])

  // Actualizar countdown cada minuto
  useEffect(() => {
    if (subscriptionData?.next_payment_date) {
      updateCountdown()
      const interval = setInterval(updateCountdown, 60000) // Cada minuto
      return () => clearInterval(interval)
    }
  }, [subscriptionData?.next_payment_date])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      
      // Buscar suscripción relacionada con esta orden
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          products (
            name,
            description,
            images
          )
        `)
        .or(`order_id.eq.${orderId},external_reference.like.%${orderId}%,external_reference.like.%${orderNumber}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching subscription:', error)
      } else {
        setSubscriptionData(subscription)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCountdown = () => {
    if (!subscriptionData?.next_payment_date) return
    
    const now = new Date()
    const nextPayment = new Date(subscriptionData.next_payment_date)
    const diffTime = nextPayment.getTime() - now.getTime()
    
    if (diffTime <= 0) {
      setCountdown("¡Pago vencido!")
      return
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      setCountdown("¡Mañana!")
    } else if (diffDays <= 3) {
      setCountdown(`¡En ${diffDays} días!`)
    } else if (diffDays <= 7) {
      setCountdown(`En ${diffDays} días`)
    } else {
      setCountdown(`En ${diffDays} días`)
    }
  }

  const handleSubscriptionAction = async (action: 'cancel' | 'pause' | 'reactivate') => {
    if (!subscriptionData?.user_id) return
    
    try {
      setUpdating(true)
      
      const response = await fetch(`/api/subscriptions/user/${subscriptionData.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscriptionData.id,
          action
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Suscripción ${action === 'cancel' ? 'cancelada' : action === 'pause' ? 'pausada' : 'reactivada'} exitosamente`)
        fetchSubscriptionData() // Actualizar datos
      } else {
        throw new Error(result.error || 'Error procesando acción')
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      'weekly': 'Semanal',
      'monthly': 'Mensual', 
      'quarterly': 'Trimestral',
      'annual': 'Anual'
    }
    return labels[freq] || freq
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'paused': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="mb-2 font-medium text-blue-600">Información de Suscripción</h3>
        <div className="rounded-md bg-blue-50 p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Cargando información de suscripción...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-medium text-blue-600 flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        Información de Suscripción
      </h3>
      
      <div className="space-y-4">
        {/* Información básica */}
        <div className="rounded-md bg-blue-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Frecuencia:</strong> {getFrequencyLabel(frequency)}</p>
              {subscriptionData && (
                <>
                  <p className="flex items-center gap-2">
                    <strong>Estado:</strong> 
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(subscriptionData.status)}`}>
                      {subscriptionData.status === 'authorized' ? 'Activa' :
                       subscriptionData.status === 'pending' ? 'Pendiente' :
                       subscriptionData.status === 'cancelled' ? 'Cancelada' :
                       subscriptionData.status === 'paused' ? 'Pausada' : subscriptionData.status}
                    </span>
                  </p>
                  <p><strong>Cobros realizados:</strong> {subscriptionData.charges_made || 0}</p>
                </>
              )}
            </div>
            
            {subscriptionData && (
              <div>
                <p><strong>Monto:</strong> ${subscriptionData.amount?.toFixed(2) || '0.00'} MXN</p>
                <p><strong>Último pago:</strong> {
                  subscriptionData.last_payment_date 
                    ? formatDate(subscriptionData.last_payment_date)
                    : 'Ninguno'
                }</p>
              </div>
            )}
          </div>
        </div>

        {/* Temporizador de próximo pago */}
        {subscriptionData?.next_payment_date && subscriptionData.status === 'authorized' && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">Próximo Pago</p>
                  <p className="text-sm text-amber-600">
                    {formatDate(subscriptionData.next_payment_date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-800">{countdown}</p>
                <p className="text-xs text-amber-600">hasta el cobro</p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones de suscripción */}
        {subscriptionData && (
          <div className="flex gap-2 pt-2">
            {subscriptionData.status === 'authorized' && (
              <>
                <button
                  onClick={() => handleSubscriptionAction('pause')}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 disabled:opacity-50"
                >
                  <Pause className="w-3 h-3" />
                  {updating ? 'Pausando...' : 'Pausar'}
                </button>
                <button
                  onClick={() => handleSubscriptionAction('cancel')}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  <Square className="w-3 h-3" />
                  {updating ? 'Cancelando...' : 'Cancelar'}
                </button>
              </>
            )}
            {subscriptionData.status === 'paused' && (
              <button
                onClick={() => handleSubscriptionAction('reactivate')}
                disabled={updating}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200 disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                {updating ? 'Reactivando...' : 'Reactivar'}
              </button>
            )}
          </div>
        )}

        {/* Mensaje si no hay suscripción activa */}
        {!subscriptionData && (
          <div className="rounded-md bg-gray-50 p-3 text-center text-gray-600">
            <p>No se encontró suscripción activa para esta orden.</p>
            <p className="text-sm mt-1">La suscripción puede estar pendiente de activación o haber sido cancelada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
