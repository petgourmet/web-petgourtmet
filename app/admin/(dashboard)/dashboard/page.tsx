"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Package, ShoppingBag, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface StatsType {
  totalUsers: number | null
  totalBlogs: number | null
  totalProducts: number | null
  totalOrders: number | null
}

const DashboardPage = () => {
  const [stats, setStats] = useState<StatsType>({
    totalUsers: null,
    totalBlogs: null,
    totalProducts: null,
    totalOrders: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Obtener el número total de usuarios
      const { count: totalUsers, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })

      if (usersError) {
        console.error("Error al cargar usuarios:", usersError)
        setStats((prev) => ({ ...prev, totalUsers: null }))
      } else {
        setStats((prev) => ({ ...prev, totalUsers: totalUsers || 0 }))
      }

      // Obtener el número total de blogs
      const { count: totalBlogs, error: blogsError } = await supabase
        .from("blogs")
        .select("*", { count: "exact", head: true })

      if (blogsError) {
        console.error("Error al cargar blogs:", blogsError)
        setStats((prev) => ({ ...prev, totalBlogs: null }))
      } else {
        setStats((prev) => ({ ...prev, totalBlogs: totalBlogs || 0 }))
      }

      // Obtener el número total de productos
      const { count: totalProducts, error: productsError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })

      if (productsError) {
        console.error("Error al cargar productos:", productsError)
        setStats((prev) => ({ ...prev, totalProducts: null }))
      } else {
        setStats((prev) => ({ ...prev, totalProducts: totalProducts || 0 }))
      }

      // Obtener el número total de pedidos
      const { count: totalOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })

      if (ordersError) {
        console.error("Error al cargar pedidos:", ordersError)
        setStats((prev) => ({ ...prev, totalOrders: null }))
      } else {
        setStats((prev) => ({ ...prev, totalOrders: totalOrders || 0 }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta de Usuarios */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <Users className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats.totalUsers || 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Usuarios registrados</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Blogs */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <FileText className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Blogs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats.totalBlogs || 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Artículos publicados</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Ventas */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <ShoppingBag className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats.totalOrders || 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Pedidos realizados</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Productos */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <Package className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats.totalProducts || 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Productos disponibles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
