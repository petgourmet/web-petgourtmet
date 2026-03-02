"use client"

/**
 * admin/orders/page.tsx — Refactorizado con TanStack Query
 *
 * QUÉ CAMBIÓ: useEffect+fetchOrders manual → useOrders() hook con cache
 * QUÉ NO CAMBIÓ:
 *   - UI completa (tabla, badges, paginación, filtros, búsqueda)
 *   - AuthGuard y protección de ruta
 *   - Componentes OrderStatusBadge y PaymentStatusBadge
 *   - Todos los helpers (formatCurrency, formatDate)
 *   - Links a /admin/orders/[id]
 *
 * MEJORA KEY: Realtime ya no hace fetchOrders() directo en cada evento.
 * Ahora invalida el cache con 500ms debounce → evita cascada de re-fetches.
 */

import type React from "react"
import { useState } from "react"
import { Loader2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import Link from "next/link"
import { useOrders } from "@/lib/query/hooks/use-orders"

const ordersPerPage = 10

export default function OrdersAdminPage() {
  // Estado local UI (filtros, búsqueda, paginación — no son data fetching)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // ── TanStack Query ────────────────────────────────────────────────
  // useOrders incluye:
  //   - Cache de 30 segundos
  //   - Supabase Realtime con debounce 500ms (no re-fetch en cada evento)
  //   - placeholderData para no perder el scroll al re-fetch en background
  const {
    data,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useOrders({
    page: currentPage,
    status: statusFilter,
    search: searchTerm,
    enableRealtime: true,
  })

  const allOrders = data?.orders ?? []
  const totalOrders = data?.total ?? 0

  // Paginación (los datos ya vienen filtrados desde el hook)
  const from = (currentPage - 1) * ordersPerPage
  const orders = allOrders.slice(from, from + ordersPerPage)
  const totalPages = Math.ceil(totalOrders / ordersPerPage)

  // ── Handlers (preservados del original) ──────────────────────────

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setCurrentPage(1) // Reset a primera página al buscar
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value)
    setCurrentPage(1) // Reset a primera página al cambiar filtro
  }

  // ── Helpers (preservados 100% del original) ───────────────────────

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

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

  // ── UI (preservada 100% del original) ────────────────────────────

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
              onChange={(e) => handleStatusChange(e.target.value)}
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
        ) : isError ? (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p>Error al cargar pedidos: {(error as Error)?.message ?? 'Error desconocido'}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <>
            {/* Tabla de pedidos */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-semibold">ID</th>
                    <th className="p-3 text-left font-semibold">Cliente</th>
                    <th className="p-3 text-left font-semibold">Email</th>
                    <th className="p-3 text-left font-semibold">Fecha</th>
                    <th className="p-3 text-center font-semibold">Estado del Pago</th>
                    <th className="p-3 text-center font-semibold">Estado del Pedido</th>
                    <th className="p-3 text-right font-semibold">Total</th>
                    <th className="p-3 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No se encontraron pedidos
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium">#{order.id}</td>
                          <td className="p-3">
                            <div className="font-medium text-gray-900">
                              {order.customer_name || "Cliente anónimo"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-gray-600 text-xs">
                              {order.customer_email || "No especificado"}
                            </div>
                          </td>
                          <td className="p-3 text-xs text-gray-600">{formatDate(order.created_at)}</td>
                          <td className="p-3 text-center">
                            <PaymentStatusBadge status={order.payment_status || 'pending'} />
                          </td>
                          <td className="p-3 text-center">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(order.total || 0)}</td>
                          <td className="p-3 text-center">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center rounded-md bg-[#78b7bf] hover:bg-[#6aa5ad] px-3 py-1.5 text-xs font-medium text-white transition-colors"
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

// ── Componentes de badge (preservados 100% del original) ─────────────

function OrderStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-800 border border-gray-300"
  let icon = ""

  switch (status) {
    case "completed":
      bgColor = "bg-[#78b7bf]/20 text-[#5c9ca4] border border-[#78b7bf]/40"
      icon = "✅"
      break
    case "processing":
      bgColor = "bg-blue-100 text-blue-800 border border-blue-300"
      icon = "🔄"
      break
    case "cancelled":
      bgColor = "bg-red-100 text-red-800 border border-red-300"
      icon = "❌"
      break
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 border border-yellow-300"
      icon = "⏳"
      break
  }

  const statusText =
    status === "completed" ? "Completado" :
      status === "processing" ? "Procesando" :
        status === "cancelled" ? "Cancelado" :
          status === "pending" ? "Pendiente" : status

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${bgColor}`}>
      <span>{icon}</span>
      <span>{statusText}</span>
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  let bgColor = "bg-gray-100 text-gray-700 border border-gray-300"
  let icon = "💳"

  switch (status) {
    case "paid":
    case "approved":
      bgColor = "bg-[#78b7bf]/20 text-[#5c9ca4] border border-[#78b7bf]/40"
      icon = "✅"
      break
    case "pending":
    case "in_process":
      bgColor = "bg-orange-100 text-orange-800 border border-orange-300"
      icon = "⏰"
      break
    case "failed":
    case "rejected":
    case "cancelled":
      bgColor = "bg-rose-100 text-rose-800 border border-rose-300"
      icon = "❌"
      break
    case "refunded":
      bgColor = "bg-purple-100 text-purple-800 border border-purple-300"
      icon = "↩️"
      break
  }

  const statusText =
    status === "paid" || status === "approved" ? "Pagado" :
      status === "pending" || status === "in_process" ? "Pendiente" :
        status === "failed" || status === "rejected" ? "Fallido" :
          status === "cancelled" ? "Cancelado" :
            status === "refunded" ? "Reembolsado" : status

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${bgColor}`}>
      <span>{icon}</span>
      <span>{statusText}</span>
    </span>
  )
}
