import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, Shield, Mail, Loader2 } from "lucide-react"

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
    subscription_type?: string
    frequency?: number | string
    frequency_type?: string
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
  onSendEmail?: (emailType: 'created' | 'cancelled' | 'reminder') => void
  sendingEmail?: 'created' | 'cancelled' | 'reminder' | null
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
  processImageUrl,
  onSendEmail,
  sendingEmail
}: SubscriptionCardProps) {
  return (
    <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-5">
        {/* Header: imagen + nombre + usuario */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
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
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate leading-tight">
              {subscription.product?.name || subscription.product_name || 'Producto no encontrado'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 truncate">
                {subscription.user_profile?.full_name || 'Usuario no encontrado'}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">{subscription.user_profile?.email}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[10px] text-gray-400 font-mono">ID: {String(subscription.id).slice(0, 8)}...</span>
              {subscription.mercadopago_subscription_id && (
                <span className="text-[10px] text-blue-500 font-mono">MP: {subscription.mercadopago_subscription_id.slice(0, 12)}...</span>
              )}
              {subscription.user_profile?.phone && (
                <span className="text-[10px] text-gray-500">📱 {subscription.user_profile.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3 min-w-0 overflow-hidden">
          {getStatusBadge(subscription)}
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
            {getFrequencyLabel(subscription)}
          </Badge>
          {subscription.size && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{subscription.size}</Badge>
          )}
          {subscription.quantity && subscription.quantity > 1 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-800">
              Qty: {subscription.quantity}
            </Badge>
          )}
          {getDiscountPercentage(subscription) > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-800">
              -{getDiscountPercentage(subscription)}%
            </Badge>
          )}
          {subscription.metadata?.processed_manually && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-800">🔧 Manual</Badge>
          )}
        </div>

        {/* Precios + fechas en grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-gray-50/60 rounded-lg p-2.5 mb-3">
          {/* Columna precios */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Precio</p>
            {subscription.discount_percentage && subscription.discount_percentage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Original:</span>
                <span className="line-through text-gray-400">{formatPrice(getOriginalPrice(subscription))}</span>
              </div>
            )}
            {getDiscountPercentage(subscription) > 0 && (
              <div className="flex justify-between">
                <span className="text-green-600">Desc. ({getDiscountPercentage(subscription)}%):</span>
                <span className="text-green-600">-{formatPrice(getDiscountAmount(subscription))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Producto:</span>
              <span className={getDiscountPercentage(subscription) > 0 ? "text-green-700 font-medium" : ""}>
                {formatPrice(getDiscountedPrice(subscription))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Envío:</span>
              <span>{getShippingCost(subscription) === 0 ? <span className="text-green-600">GRATIS</span> : formatPrice(getShippingCost(subscription))}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1 text-gray-800">
              <span>Total:</span>
              <span>{formatPrice(getTotalPrice(subscription))}</span>
            </div>
          </div>

          {/* Columna fechas */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Creada</p>
            <p className="text-gray-700">{formatDate(subscription.created_at)}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mt-2">Próximo cobro</p>
            <p className="font-medium text-gray-800">
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
            {subscription.start_date && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mt-2">Inicio</p>
                <p className="text-gray-700">{formatDate(subscription.start_date)}</p>
              </>
            )}
            {(subscription.status === 'cancelled' || subscription.status === 'canceled') && subscription.cancelled_at && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-medium mt-2">Cancelada</p>
                <p className="text-red-600">{formatDate(subscription.cancelled_at)}</p>
                {subscription.reason && (
                  <p className="text-[10px] text-red-500">Motivo: {subscription.reason}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Alertas */}
        {subscription.metadata?.processed_manually && (
          <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 mb-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium">Procesada manualmente</span>
            </div>
          </div>
        )}
        {subscription.currency_id && subscription.currency_id !== 'MXN' && (
          <div className="bg-yellow-50 px-2 py-1.5 rounded border border-yellow-200 mb-3">
            <p className="text-xs text-yellow-700">Moneda: {subscription.currency_id}</p>
          </div>
        )}

        {/* Botones de reenvío de correo */}
        {onSendEmail && (
          <div className="pt-2.5 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Reenviar correo:</p>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50 w-full justify-center"
                disabled={sendingEmail === 'created'}
                onClick={() => onSendEmail('created')}
              >
                {sendingEmail === 'created' ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Mail className="h-3 w-3 shrink-0" />}
                <span className="truncate">Bienvenida / Suscripción activa</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 w-full justify-center"
                disabled={sendingEmail === 'reminder'}
                onClick={() => onSendEmail('reminder')}
              >
                {sendingEmail === 'reminder' ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Mail className="h-3 w-3 shrink-0" />}
                <span className="truncate">Recordatorio mensualidad</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5 border-red-300 text-red-600 hover:bg-red-50 w-full justify-center"
                disabled={sendingEmail === 'cancelled'}
                onClick={() => onSendEmail('cancelled')}
              >
                {sendingEmail === 'cancelled' ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Mail className="h-3 w-3 shrink-0" />}
                <span className="truncate">Cancelación</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}