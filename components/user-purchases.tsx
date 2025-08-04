'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Calendar, Package, Truck, Eye, Star } from 'lucide-react'
import { toast } from 'sonner'

interface PurchaseItem {
  id: string | number
  order_number: string
  total: number
  payment_status: string
  created_at: string
  items: any[]
  customer_data?: any
  shipping_status?: string
  tracking_number?: string
  estimated_delivery?: string
  subscription_info?: any
}

interface UserPurchasesProps {
  userId: string
  userEmail?: string
}

export default function UserPurchases({ userId, userEmail }: UserPurchasesProps) {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all')

  useEffect(() => {
    if (userId || userEmail) {
      fetchPurchases()
    }
  }, [userId, userEmail])

  const fetchPurchases = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/purchases/user/${userId}${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`)
      const result = await response.json()
      
      if (result.success) {
        setPurchases(result.purchases || [])
      } else {
        console.warn('No se pudieron cargar las compras')
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase() || '') {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase() || '') {
      case 'completed':
        return 'Completado'
      case 'processing':
        return 'Procesando'
      case 'pending':
        return 'Pendiente'
      case 'failed':
        return 'Falló'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getShippingStatusColor = (status?: string) => {
    if (!status) return 'text-gray-600 bg-gray-100'
    
    switch (status?.toLowerCase() || '') {
      case 'delivered':
        return 'text-green-600 bg-green-100'
      case 'shipped':
      case 'in_transit':
        return 'text-blue-600 bg-blue-100'
      case 'preparing':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getShippingStatusText = (status?: string) => {
    if (!status) return 'Sin información'
    
    switch (status?.toLowerCase() || '') {
      case 'delivered':
        return 'Entregado'
      case 'shipped':
        return 'Enviado'
      case 'in_transit':
        return 'En tránsito'
      case 'preparing':
        return 'Preparando'
      default:
        return status
    }
  }

  const filteredPurchases = purchases.filter(purchase => {
    if (filter === 'all') return true
    return purchase.payment_status?.toLowerCase() === filter
  })

  const handleViewPurchase = (purchase: PurchaseItem) => {
    setSelectedPurchase(purchase)
  }

  const handleReorder = async (purchaseId: string | number) => {
    try {
      toast.info('Funcionalidad de reordenar disponible próximamente')
    } catch (error) {
      console.error('Error reordering:', error)
      toast.error('Error al reordenar')
    }
  }

  const handleRateProduct = (productId: string) => {
    toast.info('Sistema de calificaciones disponible próximamente')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32 w-full"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Mis Compras
        </h2>
        
        <div className="flex items-center gap-4">
          {/* Filtros */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">Todas las compras</option>
            <option value="completed">Completadas</option>
            <option value="processing">Procesando</option>
            <option value="pending">Pendientes</option>
            <option value="cancelled">Canceladas</option>
          </select>
          
          <button
            onClick={fetchPurchases}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Actualizar
          </button>
        </div>
      </div>

      {filteredPurchases.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No tienes compras registradas' : `No tienes compras ${filter === 'completed' ? 'completadas' : filter}`}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'Cuando realices una compra, aparecerá aquí tu historial'
              : 'Cambia el filtro para ver otras compras'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">
                      Orden #{purchase.order_number}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.payment_status)}`}>
                      {getStatusText(purchase.payment_status)}
                    </span>
                    {purchase.subscription_info?.isSubscription && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
                        🔄 Suscripción
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(purchase.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Package className="h-4 w-4" />
                      <span>${purchase.total.toFixed(2)} MXN</span>
                    </div>
                    
                    {purchase.shipping_status && (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-600" />
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getShippingStatusColor(purchase.shipping_status)}`}>
                          {getShippingStatusText(purchase.shipping_status)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Productos */}
                  {purchase.items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="space-y-2">
                        {purchase.items.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="h-10 w-10 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {item.name || 'Producto'}
                              </div>
                              <div className="text-xs text-gray-600">
                                Cantidad: {item.quantity} • ${(item.price || 0).toFixed(2)} c/u
                              </div>
                            </div>
                            {purchase.payment_status?.toLowerCase() === 'completed' && (
                              <button
                                onClick={() => handleRateProduct(item.id)}
                                className="text-yellow-500 hover:text-yellow-600 p-1"
                                title="Calificar producto"
                              >
                                <Star className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {purchase.items.length > 2 && (
                          <div className="text-xs text-gray-500 text-center pt-1">
                            +{purchase.items.length - 2} producto{purchase.items.length - 2 !== 1 ? 's' : ''} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Información de envío */}
                  {purchase.tracking_number && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Número de seguimiento:</span> {purchase.tracking_number}
                    </div>
                  )}

                  {purchase.estimated_delivery && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Entrega estimada:</span> {new Date(purchase.estimated_delivery).toLocaleDateString('es-MX')}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto">
                  <button
                    onClick={() => handleViewPurchase(purchase)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </button>

                  {purchase.payment_status?.toLowerCase() === 'completed' && (
                    <>
                      {/* Botón temporalmente oculto */}
                      {false && (
                        <button
                          onClick={() => handleReorder(purchase.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Package className="h-4 w-4" />
                          Reordenar
                        </button>
                      )}

                      {purchase.tracking_number && (
                        <button
                          onClick={() => window.open(`https://tracking-example.com/${purchase.tracking_number}`, '_blank')}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Truck className="h-4 w-4" />
                          Rastrear
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle de compra */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                Detalle de Compra #{selectedPurchase.order_number}
              </h3>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Estado de la orden */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedPurchase.payment_status)}`}>
                  Pago: {getStatusText(selectedPurchase.payment_status)}
                </span>
                {selectedPurchase.shipping_status && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getShippingStatusColor(selectedPurchase.shipping_status)}`}>
                    Envío: {getShippingStatusText(selectedPurchase.shipping_status)}
                  </span>
                )}
                {selectedPurchase.subscription_info?.isSubscription && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-purple-600 bg-purple-100">
                    🔄 Suscripción {selectedPurchase.subscription_info.frequency}
                  </span>
                )}
              </div>

              {/* Información general */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Fecha de compra:</span>
                  <div className="text-gray-900">
                    {new Date(selectedPurchase.created_at).toLocaleDateString('es-MX')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total:</span>
                  <div className="text-gray-900 font-semibold">
                    ${selectedPurchase.total.toFixed(2)} MXN
                  </div>
                </div>
                {selectedPurchase.tracking_number && (
                  <div>
                    <span className="font-medium text-gray-700">Seguimiento:</span>
                    <div className="text-gray-900">
                      {selectedPurchase.tracking_number}
                    </div>
                  </div>
                )}
                {selectedPurchase.estimated_delivery && (
                  <div>
                    <span className="font-medium text-gray-700">Entrega estimada:</span>
                    <div className="text-gray-900">
                      {new Date(selectedPurchase.estimated_delivery).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                )}
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
                <div className="space-y-3">
                  {selectedPurchase.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="h-16 w-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.name || 'Producto'}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          Cantidad: {item.quantity} • Precio unitario: ${(item.price || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                        </div>
                        {selectedPurchase.payment_status?.toLowerCase() === 'completed' && (
                          <button
                            onClick={() => handleRateProduct(item.id)}
                            className="text-yellow-500 hover:text-yellow-600 mt-1 text-sm flex items-center gap-1"
                          >
                            <Star className="h-4 w-4" />
                            Calificar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
              {selectedPurchase.payment_status?.toLowerCase() === 'paid' && (
                <button
                  onClick={() => {
                    handleReorder(selectedPurchase.id)
                    setSelectedPurchase(null)
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Reordenar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
