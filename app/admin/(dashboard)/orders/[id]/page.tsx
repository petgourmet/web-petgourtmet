"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, XCircle } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

      // Obtener detalles del pedido
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles(email, full_name, phone)")
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

      const { error } = await supabase.from("orders").update({ status }).eq("id", order.id)

      if (error) throw error

      // Actualizar el pedido en el estado
      setOrder({ ...order, status })
    } catch (error: any) {
      console.error("Error al actualizar estado del pedido:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
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
            <h1 className="text-2xl font-bold">Pedido #{order.id.substring(0, 8)}</h1>
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
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.variant && <p className="text-sm text-muted-foreground">{item.variant}</p>}
                              </div>
                            </td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            No hay productos en este pedido
                          </td>
                        </tr>
                      )}
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
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateOrderStatus("pending")}
                    disabled={updating || order.status === "pending"}
                    className="inline-flex items-center rounded-md bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 hover:bg-yellow-100 disabled:opacity-50"
                  >
                    <Package className="mr-1 h-4 w-4" /> Pendiente
                  </button>
                  <button
                    onClick={() => updateOrderStatus("processing")}
                    disabled={updating || order.status === "processing"}
                    className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Truck className="mr-1 h-4 w-4" /> Procesando
                  </button>
                  <button
                    onClick={() => updateOrderStatus("completed")}
                    disabled={updating || order.status === "completed"}
                    className="inline-flex items-center rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" /> Completado
                  </button>
                  <button
                    onClick={() => updateOrderStatus("cancelled")}
                    disabled={updating || order.status === "cancelled"}
                    className="inline-flex items-center rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Cancelado
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{order.profiles?.full_name || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.profiles?.email || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{order.profiles?.phone || "No especificado"}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-2 font-medium">Dirección de Envío</h3>
                <div className="rounded-md bg-muted p-3">
                  {order.shipping_address ? (
                    <>
                      <p>{order.shipping_address.street}</p>
                      <p>
                        {order.shipping_address.city}, {order.shipping_address.state}{" "}
                        {order.shipping_address.postal_code}
                      </p>
                      <p>{order.shipping_address.country}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No hay dirección de envío</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
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
