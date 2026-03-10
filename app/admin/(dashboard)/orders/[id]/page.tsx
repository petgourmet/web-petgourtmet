"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, XCircle, Mail, Clock, Calendar, CreditCard, Pause, Play, Square, Users, AlertTriangle } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'

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

      // Obtener detalles del pedido con los items
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            price,
            size
          )
        `)
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
      shipped: "En camino",
      completed: "Entregado",
      cancelled: "Cancelado",
      refunded: "Reembolsado"
    }
    return labels[status] || status
  }

  // Formatear número como moneda
  function formatCurrency(amount: number | null | undefined) {
    // Manejar valores undefined, null o NaN
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }

    // Asegurar que el monto sea un número válido
    const validAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (isNaN(validAmount)) {
      return '$0'
    }

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(validAmount)
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
        <div className="p-3 sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex w-fit items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </button>
              <h1 className="text-2xl font-bold">Pedido #{typeof order.id === 'string' ? order.id.substring(0, 8) : order.id}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
              <button
                onClick={() => fetchOrderDetails(order.id)}
                disabled={loading}
                className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-1 h-4 w-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>

          {/* Resumen de Estado del Pago */}
          <div className="mb-6">
            <Card className={`border-2 ${order.payment_status === 'paid' || order.payment_status === 'approved'
              ? 'border-green-200 bg-green-50'
              : order.payment_status === 'pending' || order.payment_status === 'in_process'
                ? 'border-yellow-200 bg-yellow-50'
                : order.payment_status === 'failed' || order.payment_status === 'rejected'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`p-2 sm:p-3 shrink-0 rounded-full ${order.payment_status === 'paid' || order.payment_status === 'approved'
                      ? 'bg-green-100'
                      : order.payment_status === 'pending' || order.payment_status === 'in_process'
                        ? 'bg-yellow-100'
                        : order.payment_status === 'failed' || order.payment_status === 'rejected'
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}>
                      {order.payment_status === 'paid' || order.payment_status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      ) : order.payment_status === 'pending' || order.payment_status === 'in_process' ? (
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                      ) : order.payment_status === 'failed' || order.payment_status === 'rejected' ? (
                        <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">
                        {order.payment_status === 'paid' || order.payment_status === 'approved'
                          ? '✅ Pago Confirmado'
                          : order.payment_status === 'pending' || order.payment_status === 'in_process'
                            ? '⏳ Pago Pendiente'
                            : order.payment_status === 'failed' || order.payment_status === 'rejected'
                              ? '❌ Pago Fallido'
                              : '❓ Estado Desconocido'
                        }
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {order.payment_status === 'paid' || order.payment_status === 'approved'
                          ? 'El pago ha sido procesado exitosamente'
                          : order.payment_status === 'pending' || order.payment_status === 'in_process'
                            ? 'El pago está siendo procesado o pendiente de confirmación'
                            : order.payment_status === 'failed' || order.payment_status === 'rejected'
                              ? 'El pago no pudo ser procesado'
                              : 'Verificar estado del pago manualmente'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200 w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                    <PaymentStatusBadge status={order.payment_status || 'pending'} />
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold mt-0 sm:mt-2">${order.total}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Total del pedido</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4 text-sm md:text-base">
            {/* Información del pedido */}
            <Card className="lg:col-span-2 xl:col-span-3">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl">Detalles del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 md:col-span-1 p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Fecha del pedido</p>
                    <p className="font-semibold text-gray-900 text-sm leading-snug">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Método de pago</p>
                    <p className="font-semibold text-gray-900 capitalize text-sm">
                      {order.stripe_session_id || order.stripe_payment_intent ? "Stripe" : (order.payment_method || "No especificado")}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Estado del Pago</p>
                    <div className="mt-1"><PaymentStatusBadge status={order.payment_status || 'pending'} /></div>
                  </div>
                </div>

                {/* Información de pago de Stripe */}
                {(order.stripe_session_id || order.stripe_payment_intent) && (
                  <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
                    <h4 className="font-semibold mb-4 text-blue-900 flex items-center gap-2 text-base">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      Bóveda Logística Stripe
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {order.stripe_session_id && (
                        <div className="p-3 bg-white rounded-lg border border-blue-50 shadow-sm min-w-0 overflow-hidden">
                          <p className="text-blue-700/80 font-semibold mb-1 text-xs uppercase tracking-wider">Session ID:</p>
                          <p className="font-mono text-xs font-medium text-blue-900 break-all" title={order.stripe_session_id}>
                            {order.stripe_session_id}
                          </p>
                        </div>
                      )}
                      {order.stripe_payment_intent && (
                        <div className="p-3 bg-white rounded-lg border border-blue-50 shadow-sm min-w-0 overflow-hidden">
                          <p className="text-blue-700/80 font-semibold mb-1 text-xs uppercase tracking-wider">Payment Intent:</p>
                          <p className="font-mono text-xs font-medium text-blue-900 break-all" title={order.stripe_payment_intent}>
                            {order.stripe_payment_intent}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="mb-4 font-semibold text-lg flex items-center gap-2"><Package className="h-5 w-5 text-gray-500" />Productos Comprados</h3>

                  {/* Vista móvil: tarjetas apiladas */}
                  <div className="block sm:hidden space-y-3">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any, index: number) => (
                        <div key={index} className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                          {item.product_image && (
                            <div className="shrink-0 h-16 w-16 overflow-hidden rounded-lg shadow-sm">
                              <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-snug">{item.product_name || "Producto"}</p>
                            {item.size && <span className="text-xs text-muted-foreground bg-gray-100 rounded px-2 py-0.5 inline-block mt-1">Talla: {item.size}</span>}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">× {item.quantity || 1}</span>
                              <span className="font-bold text-sm text-gray-900 font-mono">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-6 text-center text-sm text-muted-foreground">No hay productos en este pedido</p>
                    )}
                    {/* Resumen totales móvil */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatCurrency(order.order_items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Envío</span>
                        <span className="font-mono">{formatCurrency(order.total - (order.order_items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) || 0))}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                        <span className="uppercase text-xs tracking-wide">Total Pagado</span>
                        <span className="font-mono text-base text-primary">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vista desktop: tabla */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50/80">
                          <th className="p-3 text-left font-semibold text-gray-600">Producto</th>
                          <th className="p-3 text-center font-semibold text-gray-600">Cantidad</th>
                          <th className="p-3 text-right font-semibold text-gray-600">Precio Unitario</th>
                          <th className="p-3 text-right font-semibold text-gray-600">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {order.order_items && order.order_items.length > 0 ? (
                          order.order_items.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-4">
                                  {item.product_image && (
                                    <div className="relative h-14 w-14 lg:h-16 lg:w-16 shrink-0 overflow-hidden rounded-lg shadow-sm">
                                      <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate" title={item.product_name}>{item.product_name || "Producto"}</p>
                                    {item.size && <p className="text-xs text-muted-foreground mt-0.5 inline-block bg-gray-100 rounded px-2 py-0.5">Talla: {item.size}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center justify-center bg-gray-100 rounded-full w-8 h-8 font-semibold text-gray-700">{item.quantity || 1}</span>
                              </td>
                              <td className="p-3 text-right font-mono text-gray-600">{formatCurrency(item.price)}</td>
                              <td className="p-3 text-right font-mono font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">No hay productos en este pedido</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50/50">
                        <tr className="border-t">
                          <td colSpan={3} className="p-3 text-right text-gray-600">Subtotal de productos</td>
                          <td className="p-3 text-right font-mono font-medium text-gray-800">{formatCurrency(order.order_items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) || 0)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-3 text-right text-gray-600">Costo de Envío</td>
                          <td className="p-3 text-right font-mono font-medium text-gray-800">{formatCurrency(order.total - (order.order_items?.reduce((s: number, i: any) => s + i.price * i.quantity, 0) || 0))}</td>
                        </tr>
                        <tr className="border-t-2 border-gray-200">
                          <td colSpan={3} className="p-4 text-right font-bold text-lg text-gray-900 uppercase">Total Pagado</td>
                          <td className="p-4 text-right font-mono font-bold text-xl text-primary">{formatCurrency(order.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="mb-4 bg-gray-50/50 p-5 rounded-xl border">
                  <h3 className="mb-1 font-semibold text-base flex items-center gap-2"><Truck className="h-4 w-4 text-gray-500" />Centro de Logística (Cambio de Estado)</h3>
                  <p className="text-xs text-muted-foreground mb-4 bg-white inline-block px-2 py-1 border rounded text-blue-700 border-blue-100">
                    <Mail className="inline h-3 w-3 mr-1" />
                    Al cambiar el estado se enviará notificación oficial por email al cliente.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => updateOrderStatus("processing")}
                      disabled={updating || order.status === "processing"}
                      className="justify-center inline-flex items-center rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 disabled:opacity-50 transition-colors shadow-sm w-full"
                    >
                      {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Loader2 className="mr-1.5 h-4 w-4" />}
                      Procesando
                    </button>
                    <button
                      onClick={() => updateOrderStatus("shipped")}
                      disabled={updating || order.status === "shipped"}
                      className="justify-center inline-flex items-center rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 disabled:opacity-50 transition-colors shadow-sm w-full"
                    >
                      {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Truck className="mr-1.5 h-4 w-4" />}
                      En camino
                    </button>
                    <button
                      onClick={() => updateOrderStatus("completed")}
                      disabled={updating || order.status === "completed"}
                      className="justify-center inline-flex items-center rounded-lg bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-800 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50 transition-colors shadow-sm w-full"
                    >
                      {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                      Entregado
                    </button>
                    <button
                      onClick={() => updateOrderStatus("cancelled")}
                      disabled={updating || order.status === "cancelled"}
                      className="justify-center inline-flex items-center rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 disabled:opacity-50 transition-colors shadow-sm w-full"
                    >
                      {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                      Cancelar
                    </button>
                    <button
                      onClick={() => updateOrderStatus("refunded")}
                      disabled={updating || order.status === "refunded"}
                      className="justify-center inline-flex items-center rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-800 ring-1 ring-inset ring-orange-600/20 hover:bg-orange-100 disabled:opacity-50 transition-colors shadow-sm w-full"
                    >
                      {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Clock className="mr-1.5 h-4 w-4" />}
                      Reembolsado
                    </button>
                  </div>
                </div>

                {/* Botón para confirmar pago en efectivo */}
                {order.payment_status === "pending" && (order.payment_method === "efectivo" || order.payment_method === "cash") && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="mb-3 font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Confirmar Pago Físico (Efectivo)
                    </h3>
                    <div className="rounded-xl border border-green-200 bg-green-50/80 p-5 shadow-sm">
                      <p className="text-sm text-green-800 mb-4 font-medium">
                        Este pedido fue registrado con pago en efectivo y se encuentra actualmente pendiente de liquidación.
                      </p>
                      <button
                        onClick={async () => {
                          if (confirm("¿Confirmas que la empresa ha recibido físicamente el importe total de este pago?")) {
                            try {
                              setUpdating(true)
                              const response = await fetch("/api/admin/confirm-payment", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  orderId: order.id,
                                  paymentMethod: "efectivo",
                                  notes: "Pago en efectivo confirmado manualmente desde panel Admin"
                                })
                              })

                              if (response.ok) {
                                await fetchOrderDetails(order.id)
                                toast.success("Pago liquidado exitosamente")
                              } else {
                                toast.error("Hubo un error al confirmar el depósito")
                              }
                            } catch (error) {
                              console.error("Error:", error)
                              toast.error("Ocurrió un error inesperado al liquidar el pago")
                            } finally {
                              setUpdating(false)
                            }
                          }
                        }}
                        disabled={updating}
                        className="inline-flex w-full sm:w-auto justify-center items-center rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-green-700 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 transition-all"
                      >
                        {updating ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-5 w-5" />
                        )}
                        Liquidar Efectivo Ahora
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información del cliente */}
            <div className="space-y-4 lg:sticky lg:top-6 h-max">
              {/* Encabezado */}
              <div className="flex items-center gap-2 px-1">
                <span className="bg-[#78b7bf]/20 p-2 rounded-lg"><Users className="h-5 w-5 text-[#5a898f]" /></span>
                <h2 className="text-lg font-bold text-gray-800">Expediente de Cliente</h2>
              </div>

              {/* Tarjetas de datos personales en grid 2 columnas en móvil */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Nombre</p>
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{order.customer_name || "Comprador Invitado"}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Correo Electrónico</p>
                  <a
                    href={`mailto:${order.customer_email}`}
                    className="font-medium text-blue-600 text-xs break-all hover:underline leading-snug block"
                  >
                    {order.customer_email || "No provisto"}
                  </a>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Teléfono</p>
                  <p className="font-medium text-gray-900 text-sm">{order.customer_phone || "—"}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Método de Pago</p>
                  <p className="font-medium text-gray-900 text-sm capitalize">
                    {order.stripe_session_id || order.stripe_payment_intent ? "Stripe" : (order.payment_method || "—")}
                  </p>
                </div>
              </div>

              {/* Tarjeta de dirección de envío */}
              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <h3 className="mb-3 font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#5a898f]" /> Destino de Envío
                </h3>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {(() => {
                    try {
                      let shippingData = null
                      if (order.shipping_address) {
                        if (typeof order.shipping_address === 'string') {
                          const parsed = JSON.parse(order.shipping_address)
                          shippingData = parsed.shipping || parsed
                        } else {
                          shippingData = order.shipping_address.shipping || order.shipping_address
                        }
                      }

                      if (shippingData && (shippingData.address || shippingData.street)) {
                        return (
                          <div className="grid grid-cols-1 gap-1.5">
                            <p className="flex gap-2 items-start">
                              <span className="shrink-0">📍</span>
                              <span className="font-medium">{shippingData.address || `${shippingData.street} ${shippingData.number || ''}`}</span>
                            </p>
                            {shippingData.city && (
                              <p className="flex gap-2 items-start">
                                <span className="shrink-0">🏙️</span>
                                <span>{shippingData.city}{shippingData.state ? `, ${shippingData.state}` : ''}</span>
                              </p>
                            )}
                            {shippingData.postalCode && (
                              <p className="flex gap-2 items-center text-gray-500 font-mono text-xs mt-1">
                                <span>🔢</span> CP: {shippingData.postalCode}
                              </p>
                            )}
                            {shippingData.country && (
                              <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mt-1">{shippingData.country}</p>
                            )}
                          </div>
                        )
                      }
                      return (
                        <p className="text-muted-foreground italic flex items-center gap-2 text-xs">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                          Dirección no proporcionada
                        </p>
                      )
                    } catch (e) {
                      return <p className="text-red-500 bg-red-50 p-2 rounded text-xs">Error decodificando dirección</p>
                    }
                  })()}
                </div>
              </div>

              {/* Metadatos Avanzados */}
              {(() => {
                try {
                  let metadata = null
                  if (order.shipping_address) {
                    if (typeof order.shipping_address === 'string') {
                      metadata = JSON.parse(order.shipping_address)
                    } else {
                      metadata = order.shipping_address
                    }
                  }

                  if (metadata && metadata.items) {
                    const subtotal = metadata.items.reduce((sum: number, item: any) =>
                      sum + ((item.price || item.unit_price || 0) * (item.quantity || 1)), 0
                    )

                    return (
                      <div className="p-4 bg-gray-900 rounded-xl shadow-sm">
                        <h3 className="mb-3 font-semibold text-xs text-gray-400 uppercase tracking-wider">Metadatos Internos</h3>
                        <div className="grid grid-cols-1 gap-3 font-mono text-[11px]">
                          <div className="border-b border-gray-800 pb-2">
                            <p className="text-gray-500 mb-1">ID Trazabilidad:</p>
                            <p className="text-green-400 break-all">{order.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Subtotal Neto Calc:</p>
                            <p className="text-yellow-300">{formatCurrency(subtotal)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                } catch (e) {
                  return null
                }
              })()}
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  } catch (renderError: any) {
    console.error("Error rendering order page:", renderError)
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <h2 className="font-bold mb-2">Error al renderizar la página</h2>
          <p>{renderError.message}</p>
          <pre className="mt-2 text-xs overflow-auto">{renderError.stack}</pre>
        </div>
      </div>
    )
  }
}

// Componente para mostrar el estado del pedido
function OrderStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800"
  let icon = null

  switch (status) {
    case "completed":
      bgColor = "bg-green-100 text-green-800 border border-green-200"
      icon = <CheckCircle className="h-3 w-3" />
      break
    case "shipped":
      bgColor = "bg-indigo-100 text-indigo-800 border border-indigo-200"
      icon = <Truck className="h-3 w-3" />
      break
    case "processing":
      bgColor = "bg-blue-100 text-blue-800 border border-blue-200"
      icon = <Clock className="h-3 w-3" />
      break
    case "cancelled":
      bgColor = "bg-red-100 text-red-800 border border-red-200"
      icon = <XCircle className="h-3 w-3" />
      break
    case "refunded":
      bgColor = "bg-orange-100 text-orange-800 border border-orange-200"
      icon = <Clock className="h-3 w-3" />
      break
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 border border-yellow-200"
      icon = <Clock className="h-3 w-3" />
      break
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${bgColor}`}>
      {icon}
      {status === "completed"
        ? "Entregado"
        : status === "shipped"
          ? "En camino"
          : status === "processing"
            ? "Procesando"
            : status === "cancelled"
              ? "Cancelado"
              : status === "refunded"
                ? "Reembolsado"
                : status === "pending"
                  ? "Pendiente"
                  : status}
    </span>
  )
}

// Componente para mostrar el estado del pago
function PaymentStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800 border border-gray-200"
  let icon = null

  switch (status) {
    case "paid":
      bgColor = "bg-green-100 text-green-800 border border-green-200"
      icon = <CheckCircle className="h-3 w-3" />
      break
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 border border-yellow-200"
      icon = <Clock className="h-3 w-3" />
      break
    case "failed":
      bgColor = "bg-red-100 text-red-800 border border-red-200"
      icon = <XCircle className="h-3 w-3" />
      break
    case "approved":
      bgColor = "bg-green-100 text-green-800 border border-green-200"
      icon = <CheckCircle className="h-3 w-3" />
      break
    case "rejected":
      bgColor = "bg-red-100 text-red-800 border border-red-200"
      icon = <XCircle className="h-3 w-3" />
      break
    case "in_process":
      bgColor = "bg-blue-100 text-blue-800 border border-blue-200"
      icon = <Clock className="h-3 w-3" />
      break
    case "refunded":
      bgColor = "bg-gray-100 text-gray-800 border border-gray-200"
      icon = <XCircle className="h-3 w-3" />
      break
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid": return "Pagado"
      case "pending": return "Pendiente"
      case "failed": return "Fallido"
      case "approved": return "Aprobado"
      case "rejected": return "Rechazado"
      case "in_process": return "En Proceso"
      case "refunded": return "Reembolsado"
      default: return status
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${bgColor}`}>
      {icon}
      {getStatusText(status)}
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
        .from('unified_subscriptions')
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
