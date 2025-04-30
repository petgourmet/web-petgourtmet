"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingBag, Users, TrendingUp } from "lucide-react"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        // Obtener total de productos
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true })

        // Obtener total de usuarios
        const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

        // En un sistema real, aquí obtendrías datos de pedidos y ventas
        // Por ahora usamos datos de ejemplo

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: 24, // Ejemplo
          totalUsers: usersCount || 0,
          totalRevenue: 1250.75, // Ejemplo
        })
      } catch (error) {
        console.error("Error al cargar estadísticas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Productos",
      value: stats.totalProducts,
      icon: <Package className="h-6 w-6 text-blue-500" />,
      description: "Total de productos",
    },
    {
      title: "Pedidos",
      value: stats.totalOrders,
      icon: <ShoppingBag className="h-6 w-6 text-green-500" />,
      description: "Pedidos realizados",
    },
    {
      title: "Usuarios",
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6 text-purple-500" />,
      description: "Usuarios registrados",
    },
    {
      title: "Ingresos",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: <TrendingUp className="h-6 w-6 text-amber-500" />,
      description: "Ingresos totales",
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                ) : (
                  card.value
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aquí podrías añadir más secciones como gráficos, actividad reciente, etc. */}
    </div>
  )
}
