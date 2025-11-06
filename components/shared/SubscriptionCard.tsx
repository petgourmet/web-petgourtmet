import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { User, Shield } from "lucide-react"

interface SubscriptionCardProps {
  subscription: {
    id: string | number
    product?: {
      name?: string
      image?: string
    }
    product_name?: string
    product_image?: string
    user_profile?: {
      full_name?: string
      email?: string
      phone?: string
    }
    mercadopago_subscription_id?: string
    status: string
    frequency?: string
    size?: string
    quantity?: number
    discount_percentage?: number
    created_at: string
    start_date?: string
    cancelled_at?: string
    reason?: string
    metadata?: {
      processed_manually?: boolean
    }
    currency_id?: string
  }
  formatPrice: (price: number) => string
  formatDate: (date: string) => string
  getStatusBadge: (subscription: any) => React.ReactNode
  getFrequencyLabel: (subscription: any) => string
  getDiscountPercentage: (subscription: any) => number
  getOriginalPrice: (subscription: any) => number
  getDiscountAmount: (subscription: any) => number
  getDiscountedPrice: (subscription: any) => number
  getShippingCost: (subscription: any) => number
  getTotalPrice: (subscription: any) => number
  getNextPaymentDate?: (subscription: any) => Date | null
  processImageUrl?: (url: string) => string
}

export function SubscriptionCard({
  subscription,
  formatPrice,
  formatDate,
  getStatusBadge,
  getFrequencyLabel,
  getDiscountPercentage,
  getOriginalPrice,
  getDiscountAmount,
  getDiscountedPrice,
  getShippingCost,
  getTotalPrice,
  getNextPaymentDate,
  processImageUrl
}: SubscriptionCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información Principal */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={processImageUrl ? processImageUrl(subscription.product?.image || subscription.product_image || '') : (subscription.product?.image || subscription.product_image || '/placeholder.svg')}
                  alt={subscription.product?.name || subscription.product_name || 'Producto'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {subscription.product?.name || subscription.product_name || 'Producto no encontrado'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {subscription.user_profile?.full_name || 'Usuario no encontrado'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {subscription.user_profile?.email}
                </p>
                {/* ID de suscripción y MercadoPago */}
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {String(subscription.id).slice(0, 8)}...
                  </p>
                  {subscription.mercadopago_subscription_id && (
                    <p className="text-xs text-blue-600 font-mono">
                      MP: {subscription.mercadopago_subscription_id}
                    </p>
                  )}
                  {subscription.user_profile?.phone && (
                    <p className="text-xs text-gray-500">
                      📱 {subscription.user_profile.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(subscription)}
              <Badge variant="outline">
                {getFrequencyLabel(subscription)}
              </Badge>
              {subscription.size && (
                <Badge variant="outline">
                  {subscription.size}
                </Badge>
              )}
              {subscription.quantity && subscription.quantity > 1 && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  Qty: {subscription.quantity}
                </Badge>
              )}
              {getDiscountPercentage(subscription) > 0 && (
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  -{getDiscountPercentage(subscription)}%
                </Badge>
              )}
              {subscription.metadata?.processed_manually && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  🔧 Manual
                </Badge>
              )}
            </div>
          </div>

          {/* Información de Suscripción */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Precio</p>
                <div className="flex flex-col">
                  <div className="space-y-1">
                    {/* Precio original del producto */}
                    {subscription.discount_percentage && subscription.discount_percentage > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Precio original:</span>
                        <span className="line-through text-gray-500">
                          {formatPrice(getOriginalPrice(subscription))}
                        </span>
                      </div>
                    )}
                    
                    {/* Descuento aplicado */}
                    {getDiscountPercentage(subscription) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">Descuento ({getDiscountPercentage(subscription)}%):</span>
                        <span className="text-green-600">
                          -{formatPrice(getDiscountAmount(subscription))}
                        </span>
                      </div>
                    )}
                    
                    {/* Precio del producto con descuento */}
                    <div className="flex justify-between text-xs">
                      <span>Producto:</span>
                      <span className={getDiscountPercentage(subscription) > 0 ? "text-green-600 font-medium" : ""}>
                        {formatPrice(getDiscountedPrice(subscription))}
                      </span>
                    </div>
                    
                    {/* Envío calculado sobre precio con descuento */}
                    <div className="flex justify-between text-xs">
                      <span>Envío:</span>
                      <span>
                        {getShippingCost(subscription) === 0 ? (
                          <span className="text-green-600">GRATIS</span>
                        ) : (
                          formatPrice(getShippingCost(subscription))
                        )}
                      </span>
                    </div>
                    
                    <div className="border-t pt-1">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatPrice(getTotalPrice(subscription))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-500">Creada</p>
                <p>{formatDate(subscription.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Próximo cobro</p>
                <p className="font-medium">
                  {(() => {
                    if (getNextPaymentDate) {
                      const nextDate = getNextPaymentDate(subscription)
                      if (nextDate && nextDate instanceof Date && !isNaN(nextDate.getTime())) {
                        return formatDate(nextDate.toISOString())
                      }
                    }
                    return "No programado"
                  })()}
                </p>
              </div>
              {subscription.start_date && (
                <div>
                  <p className="text-gray-500">Fecha inicio</p>
                  <p>{formatDate(subscription.start_date)}</p>
                </div>
              )}

              {subscription.status === 'cancelled' && subscription.cancelled_at && (
                <div>
                  <p className="text-gray-500">Cancelada</p>
                  <div className="flex flex-col">
                    <p className="text-red-600">{formatDate(subscription.cancelled_at)}</p>
                    {subscription.reason && (
                      <p className="text-xs text-red-500 mt-1">
                        Motivo: {subscription.reason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Información adicional del metadata */}
            {subscription.metadata?.processed_manually && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Procesada manualmente</span>
                </div>
              </div>
            )}
            
            {subscription.currency_id && subscription.currency_id !== 'MXN' && (
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  Moneda: {subscription.currency_id}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}