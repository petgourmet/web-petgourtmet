"use client"

/**
 * Dashboard Admin — Refactorizado con TanStack Query
 *
 * ANTES: 5 queries secuenciales en useEffect sin cache (60+ líneas de boilerplate)
 * AHORA: useAdminStats() devuelve todo con cache de 2 minutos
 */

import { useAdminStats } from "@/lib/query/hooks/use-admin-stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Package, ShoppingBag, FileText, RefreshCw } from "lucide-react"
import SystemStatus from "@/components/admin/SystemStatus"

const DashboardPage = () => {
  const { data: stats, isLoading, refetch } = useAdminStats()

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

      {/* Estado del Sistema */}
      <div className="mb-8">
        <SystemStatus />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Tarjeta de Usuarios */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <Users className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats?.totalUsers ?? 0}</div>
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
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats?.totalBlogs ?? 0}</div>
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
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats?.totalOrders ?? 0}</div>
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
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats?.totalProducts ?? 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Productos disponibles</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Suscripciones Activas */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
              <RefreshCw className="mr-2 h-5 w-5 text-[#7BBDC5]" />
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-[#7BBDC5]">{stats?.activeSubscriptions ?? 0}</div>
            )}
            <p className="text-sm text-gray-500 mt-1">Suscripciones activas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
