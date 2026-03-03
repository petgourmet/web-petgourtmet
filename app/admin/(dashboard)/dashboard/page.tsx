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
    <div className="container mx-auto py-6 md:py-10 px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">Panel de Administración</h1>

      {/* Estado del Sistema */}
      <div className="mb-6 md:mb-8">
        <SystemStatus />
      </div>

      <div className="-mx-4 px-4 pb-2 md:mx-0 md:px-0 md:pb-0 overflow-x-auto hide-scrollbar">
        <div className="flex flex-nowrap md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 min-w-max md:min-w-0">
          {/* Tarjeta de Usuarios */}
          <Card className="w-[160px] md:w-auto shrink-0 shadow-sm md:shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-medium text-gray-700 flex items-center">
                <Users className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-[#7BBDC5]" />
                Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
              {isLoading ? (
                <Skeleton className="h-8 md:h-12 w-16 md:w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-[#7BBDC5]">{stats?.totalUsers ?? 0}</div>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Usuarios registrados</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Blogs */}
          <Card className="w-[160px] md:w-auto shrink-0 shadow-sm md:shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-medium text-gray-700 flex items-center">
                <FileText className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-[#7BBDC5]" />
                Blogs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
              {isLoading ? (
                <Skeleton className="h-8 md:h-12 w-16 md:w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-[#7BBDC5]">{stats?.totalBlogs ?? 0}</div>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Artículos publicados</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Ventas */}
          <Card className="w-[160px] md:w-auto shrink-0 shadow-sm md:shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-medium text-gray-700 flex items-center">
                <ShoppingBag className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-[#7BBDC5]" />
                Ventas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
              {isLoading ? (
                <Skeleton className="h-8 md:h-12 w-16 md:w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-[#7BBDC5]">{stats?.totalOrders ?? 0}</div>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Pedidos realizados</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Productos */}
          <Card className="w-[160px] md:w-auto shrink-0 shadow-sm md:shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-medium text-gray-700 flex items-center">
                <Package className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-[#7BBDC5]" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
              {isLoading ? (
                <Skeleton className="h-8 md:h-12 w-16 md:w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-[#7BBDC5]">{stats?.totalProducts ?? 0}</div>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Productos disponibles</p>
            </CardContent>
          </Card>

          {/* Tarjeta de Suscripciones Activas */}
          <Card className="w-[160px] md:w-auto shrink-0 shadow-sm md:shadow-md hover:shadow-lg transition-shadow border-primary/20 bg-primary/5">
            <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-medium text-gray-700 flex items-center">
                <RefreshCw className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-[#7BBDC5]" />
                Suscripciones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
              {isLoading ? (
                <Skeleton className="h-8 md:h-12 w-16 md:w-24" />
              ) : (
                <div className="text-2xl md:text-3xl font-bold text-[#7BBDC5]">{stats?.activeSubscriptions ?? 0}</div>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Suscripciones activas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
