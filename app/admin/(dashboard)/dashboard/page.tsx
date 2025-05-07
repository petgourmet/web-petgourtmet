"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { Loader2, DollarSign, ShoppingBag, Users, Package } from "lucide-react"
import { AuthGuard } from "@/components/admin/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Tipos para las estadísticas
interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalUsers: number
  recentOrders: any[]
  monthlySales: { month: string; revenue: number }[]
  topProducts: { name: string; sales: number }[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month")
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [isMounted, setIsMounted] = useState(false)

  // Memoizar la función fetchStats para evitar recreaciones innecesarias
  const fetchStats = useCallback(
    async (forceRefresh = false) => {
      // Evitar múltiples solicitudes en un corto período de tiempo (5 segundos)
      const now = Date.now()
      if (!forceRefresh && now - lastFetchTime < 5000) {
        return
      }

      try {
        setLoading(true)
        setError(null)
        setLastFetchTime(now)

        // Obtener fecha límite según el rango seleccionado
        const startDate = new Date()

        if (timeRange === "week") {
          startDate.setDate(startDate.getDate() - 7)
        } else if (timeRange === "month") {
          startDate.setMonth(startDate.getMonth() - 1)
        } else if (timeRange === "year") {
          startDate.setFullYear(startDate.getFullYear() - 1)
        }

        const startDateStr = startDate.toISOString()

        // Realizar todas las consultas en paralelo para mejorar el rendimiento
        const [ordersResponse, recentOrdersResponse, productsResponse, usersResponse, orderItemsResponse] =
          await Promise.all([
            // Obtener pedidos
            supabase
              .from("orders")
              .select("id, created_at, total, payment_status, status")
              .order("created_at", { ascending: false }),

            // Obtener pedidos recientes (limitados)
            supabase
              .from("orders")
              .select("id, created_at, total, status")
              .order("created_at", { ascending: false })
              .limit(5),

            // Obtener productos (solo campos necesarios)
            supabase
              .from("products")
              .select("id, name"),

            // Obtener usuarios (solo conteo)
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true }),

            // Obtener items de pedidos
            supabase
              .from("order_items")
              .select("order_id, product_id, quantity"),
          ])

        // Manejar errores de las consultas
        if (ordersResponse.error) throw ordersResponse.error
        if (recentOrdersResponse.error) throw recentOrdersResponse.error
        if (productsResponse.error) throw productsResponse.error
        if (usersResponse.error) throw usersResponse.error
        if (orderItemsResponse.error) throw orderItemsResponse.error

        const orders = ordersResponse.data || []
        const recentOrders = recentOrdersResponse.data || []
        const products = productsResponse.data || []
        const orderItems = orderItemsResponse.data || []

        // Calcular ingresos totales (solo de pedidos pagados)
        const totalRevenue = orders
          .filter((order) => order.payment_status === "paid")
          .reduce((sum, order) => sum + (order.total || 0), 0)

        // Generar datos para el gráfico de ventas mensuales
        const monthlySales = generateMonthlySalesData(orders)

        // Generar datos para productos más vendidos usando orderItems
        const topProducts = generateTopProductsData(orderItems, products)

        setStats({
          totalRevenue,
          totalOrders: orders.length,
          totalProducts: products.length,
          totalUsers: usersResponse.count || 0,
          recentOrders,
          monthlySales,
          topProducts,
        })
      } catch (error: any) {
        console.error("Error al cargar estadísticas:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    },
    [timeRange, lastFetchTime],
  )

  // Cargar datos solo cuando cambie el rango de tiempo o al montar el componente
  useEffect(() => {
    setIsMounted(true)

    // Configurar suscripciones a cambios en la base de datos
    const ordersSubscription = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        console.log("Cambios detectados en órdenes, actualizando datos...")
        fetchStats(true)
      })
      .subscribe()

    const productsSubscription = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        console.log("Cambios detectados en productos, actualizando datos...")
        fetchStats(true)
      })
      .subscribe()

    const orderItemsSubscription = supabase
      .channel("order-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        console.log("Cambios detectados en items de órdenes, actualizando datos...")
        fetchStats(true)
      })
      .subscribe()

    // Cargar datos iniciales
    fetchStats()

    // Configurar intervalo para actualizar datos periódicamente
    const intervalId = setInterval(() => {
      fetchStats()
    }, 60000) // Actualizar cada minuto

    // Limpiar suscripciones y intervalo al desmontar
    return () => {
      clearInterval(intervalId)
      ordersSubscription.unsubscribe()
      productsSubscription.unsubscribe()
      orderItemsSubscription.unsubscribe()
    }
  }, [fetchStats])

  // Efecto para actualizar datos cuando cambia el rango de tiempo
  useEffect(() => {
    if (isMounted) {
      fetchStats(true)
    }
  }, [timeRange, fetchStats, isMounted])

  // Función para generar datos de ventas mensuales
  function generateMonthlySalesData(orders: any[]) {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const monthlySales = Array(12)
      .fill(0)
      .map((_, i) => ({ month: months[i], revenue: 0 }))

    orders
      .filter((order) => order.payment_status === "paid")
      .forEach((order) => {
        const date = new Date(order.created_at)
        const month = date.getMonth()
        monthlySales[month].revenue += order.total || 0
      })

    return monthlySales
  }

  // Función para generar datos de productos más vendidos
  function generateTopProductsData(orderItems: any[], products: any[]) {
    const productSales: Record<string, number> = {}

    // Inicializar contador para cada producto
    products.forEach((product) => {
      productSales[product.id] = 0
    })

    // Contar ventas por producto
    orderItems.forEach((item) => {
      if (productSales[item.product_id] !== undefined) {
        productSales[item.product_id] += item.quantity || 0
      }
    })

    // Convertir a array y ordenar
    const topProducts = products
      .map((product) => ({
        name: product.name,
        sales: productSales[product.id] || 0,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)

    return topProducts
  }

  // Memoizar funciones de formato para evitar recálculos innecesarios
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      }).format(amount)
    }
  }, [])

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    }
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Error al cargar estadísticas</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => fetchStats(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Intentar nuevamente
        </button>
      </div>
    )
  }

  return (
    <AuthGuard requireAdmin={true}>
      <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <button
            onClick={() => fetchStats(true)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1 transition-colors"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshIcon className="h-3 w-3" />}
            Actualizar
          </button>
        </div>

        <div className="mb-6">
          <Tabs defaultValue="month" onValueChange={(value) => setTimeRange(value as any)}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Resumen</h2>
              <TabsList>
                <TabsTrigger value="week">Última semana</TabsTrigger>
                <TabsTrigger value="month">Último mes</TabsTrigger>
                <TabsTrigger value="year">Último año</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="week" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Ingresos Totales"
                  value={formatCurrency(stats?.totalRevenue || 0)}
                  icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Pedidos"
                  value={stats?.totalOrders.toString() || "0"}
                  icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Productos"
                  value={stats?.totalProducts.toString() || "0"}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Usuarios"
                  value={stats?.totalUsers.toString() || "0"}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Ingresos Totales"
                  value={formatCurrency(stats?.totalRevenue || 0)}
                  icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Pedidos"
                  value={stats?.totalOrders.toString() || "0"}
                  icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Productos"
                  value={stats?.totalProducts.toString() || "0"}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Usuarios"
                  value={stats?.totalUsers.toString() || "0"}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </TabsContent>

            <TabsContent value="year" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Ingresos Totales"
                  value={formatCurrency(stats?.totalRevenue || 0)}
                  icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Pedidos"
                  value={stats?.totalOrders.toString() || "0"}
                  icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Productos"
                  value={stats?.totalProducts.toString() || "0"}
                  icon={<Package className="h-4 w-4 text-muted-foreground" />}
                />
                <StatsCard
                  title="Usuarios"
                  value={stats?.totalUsers.toString() || "0"}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Gráfico de ventas mensuales */}
          <Card className="col-span-2 transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle>Ventas Mensuales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <MonthlySalesChart data={stats?.monthlySales || []} />
              </div>
            </CardContent>
          </Card>

          {/* Productos más vendidos */}
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} unidades</p>
                    </div>
                    <div className="ml-auto font-medium">
                      {(
                        (product.sales /
                          Math.max(
                            stats.topProducts.reduce((sum, p) => sum + p.sales, 0),
                            1,
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pedidos recientes */}
        <div className="mt-6">
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Estado</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No hay pedidos recientes
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-2">#{typeof order.id === "string" ? order.id.substring(0, 8) : order.id}</td>
                          <td className="p-2">{formatDate(order.created_at)}</td>
                          <td className="p-2">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="p-2 text-right">{formatCurrency(order.total || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}

// Componente para tarjetas de estadísticas
function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="transition-all duration-300 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <span className="text-2xl font-bold">{value}</span>
          </div>
          <div className="rounded-full bg-muted p-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para el gráfico de ventas mensuales (simplificado sin imágenes)
function MonthlySalesChart({ data }: { data: { month: string; revenue: number }[] }) {
  const maxRevenue = Math.max(...data.map((item) => item.revenue), 1)

  return (
    <div className="flex h-full items-end gap-2">
      {data.map((item, index) => {
        const height = `${Math.max((item.revenue / maxRevenue) * 100, 5)}%`

        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t bg-primary transition-all duration-500 ease-out" style={{ height }}></div>
            <span className="text-xs">{item.month}</span>
          </div>
        )
      })}
    </div>
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

// Icono de actualización simple
function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  )
}
