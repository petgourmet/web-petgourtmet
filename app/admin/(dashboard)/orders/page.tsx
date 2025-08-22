"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import Link from "next/link"
import { fetchOptimizedOrdersAdmin, invalidateOrdersCache } from '@/lib/query-optimizations'
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const ordersPerPage = 10

  useEffect(() => {
    fetchOrders()
    
    // ✅ IMPLEMENTAR TIEMPO REAL: Suscribirse a cambios en orders
    const ordersChannel = supabase
      .channel('admin_orders_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('[ADMIN] Cambio en orders detectado:', payload)
        
        // Refrescar órdenes automáticamente
        fetchOrders()
        
        // Mostrar notificación para nuevas órdenes
        if (payload.eventType === 'INSERT') {
          console.log('Nueva orden recibida')
        }
      })
      .subscribe()

    // También escuchar cambios en order_items para actualizaciones de productos
    const orderItemsChannel = supabase
      .channel('admin_order_items_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, (payload) => {
        console.log('[ADMIN] Cambio en order_items detectado:', payload)
        fetchOrders()
      })
      .subscribe()

    // Cleanup: Desuscribirse cuando el componente se desmonte
    return () => {
      ordersChannel.unsubscribe()
      orderItemsChannel.unsubscribe()
    }
  }, [currentPage, statusFilter])

  async function fetchOrders() {
    console.log('🚀 Iniciando fetchOrders...')
    
    try {
      setLoading(true)
      setError(null)

      // Usar función optimizada para admin (todas las órdenes)
      const optimizedOrders = await fetchOptimizedOrdersAdmin(supabase)
      
      // Aplicar filtro de estado si no es "all"
      let filteredOrders = optimizedOrders
      if (statusFilter !== "all") {
        filteredOrders = optimizedOrders.filter(order => order.status === statusFilter)
      }

      // Aplicar búsqueda si hay término de búsqueda
      if (searchTerm.trim()) {
        filteredOrders = filteredOrders.filter(order => 
          order.id.toString().includes(searchTerm) ||
          order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Aplicar paginación
      const from = (currentPage - 1) * ordersPerPage
      const to = from + ordersPerPage
      const paginatedOrders = filteredOrders.slice(from, to)

      setOrders(paginatedOrders)
      setTotalOrders(filteredOrders.length)
      
    } catch (error: any) {
      console.error("❌ Error al cargar pedidos:", {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      setError(error?.message || 'Error desconocido al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Función para buscar pedidos
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    // Implementar búsqueda (podría ser por ID, email, etc.)
    // Por ahora, filtramos los pedidos ya cargados
    fetchOrders()
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Calcular número total de páginas
  const totalPages = Math.ceil(totalOrders / ordersPerPage)

  return (
    <AuthGuard requireAdmin={true}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Gestión de Pedidos</h1>

        {/* Filtros y búsqueda */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="processing">Procesando</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm text-white"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p>Error al cargar pedidos: {error}</p>
            <button
              onClick={fetchOrders}
              className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <>
            {/* Tabla de pedidos */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Cliente</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Fecha</th>
                    <th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No se encontraron pedidos
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      // Usar funciones utilitarias para extraer información del cliente
                      const customerEmail = extractCustomerEmail(order)
                      const customerName = extractCustomerName(order)
                      
                      // Extraer información adicional del shipping_address si está disponible
                      let customerInfo = {
                        name: customerName,
                        email: customerEmail,
                        phone: 'No especificado',
                        orderNumber: `#${order.id}`
                      }
                      
                      try {
                        if (order.shipping_address) {
                          const parsedShipping = JSON.parse(order.shipping_address)
                          if (parsedShipping.customer_data) {
                            customerInfo.phone = order.customer_phone || parsedShipping.customer_data.phone || 'No especificado'
                            customerInfo.orderNumber = parsedShipping.order_number || `#${order.id}`
                          }
                        }
                      } catch (e) {
                        // Si no se puede parsear, usar valores por defecto
                        console.warn('Error parsing shipping_address:', e)
                      }

                      return (
                        <tr key={order.id} className="border-b">
                          <td className="p-3">#{customerInfo?.orderNumber || order.id}</td>
                          <td className="p-3">{customerInfo?.name || "Cliente anónimo"}</td>
                          <td className="p-3">{customerInfo?.email || order.user_email || "No especificado"}</td>
                          <td className="p-3">{formatDate(order.created_at)}</td>
                          <td className="p-3">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="p-3 text-right">{formatCurrency(order.total || 0)}</td>
                          <td className="p-3 text-center">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white"
                            >
                              Ver detalles
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * ordersPerPage + 1} a{" "}
                  {Math.min(currentPage * ordersPerPage, totalOrders)} de {totalOrders} pedidos
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
