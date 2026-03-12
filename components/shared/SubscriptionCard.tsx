"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, Shield, Mail, Loader2, MapPin, Truck, CheckCircle, XCircle, Clock, ChevronDown, Phone } from "lucide-react"

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
      order_status?: string
    }
    currency_id?: string
    shipping_address?: any
    customer_data?: any
    customer_email?: string
    customer_name?: string
    customer_phone?: string
    order_status?: string
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
  onUpdateOrderStatus?: (status: string) => void
  updatingOrderStatus?: boolean
  defaultExpanded?: boolean
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
  sendingEmail,
  onUpdateOrderStatus,
  updatingOrderStatus,
  defaultExpanded = false
}: SubscriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Parse customer data from multiple sources
  const customerInfo = (() => {
    let name = subscription.user_profile?.full_name || subscription.customer_name || ''
    let email = subscription.user_profile?.email || subscription.customer_email || ''
    let phone = subscription.user_profile?.phone || subscription.customer_phone || ''

    // Try customer_data JSONB
    if (subscription.customer_data) {
      try {
        const cd = typeof subscription.customer_data === 'string'
          ? JSON.parse(subscription.customer_data)
          : subscription.customer_data
        if (!name && cd.name) name = cd.name
        if (!email && cd.email) email = cd.email
        if (!phone && cd.phone) phone = cd.phone
      } catch { /* ignore */ }
    }

    return { name: name || 'Sin nombre', email: email || 'Sin email', phone }
  })()

  // Parse shipping address from multiple sources
  const shippingInfo = (() => {
    try {
      let shippingData = subscription.shipping_address
      if (typeof shippingData === 'string') {
        const parsed = JSON.parse(shippingData)
        shippingData = parsed.shipping || parsed
      } else if (shippingData) {
        shippingData = shippingData.shipping || shippingData
      }

      // Fallback to customer_data.address
      if (!shippingData && subscription.customer_data) {
        const cd = typeof subscription.customer_data === 'string'
          ? JSON.parse(subscription.customer_data)
          : subscription.customer_data
        shippingData = cd.address || cd.shipping || null
      }

      if (shippingData && (shippingData.address || shippingData.street || shippingData.city)) {
        return shippingData
      }
      return null
    } catch {
      return null
    }
  })()

  return (
    <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      {/* HEADER - Always visible, clickable to expand/collapse */}
      <button
        type="button"
        className="w-full text-left p-3 sm:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate leading-tight">
                  {subscription.product?.name || subscription.product_name || 'Producto no encontrado'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-600 truncate">{customerInfo.name}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{customerInfo.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-800">{formatPrice(getTotalPrice(subscription))}</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mt-2 min-w-0 overflow-hidden">
              {getStatusBadge(subscription)}
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {getFrequencyLabel(subscription)}
              </Badge>
              {getDiscountPercentage(subscription) > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-800">
                  -{getDiscountPercentage(subscription)}%
                </Badge>
              )}
              {subscription.size && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{subscription.size}</Badge>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* COLLAPSIBLE BODY */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <CardContent className="p-3 sm:p-5 pt-0 border-t border-gray-100">

          {/* Datos del Cliente */}
          <div className="bg-blue-50/60 rounded-lg p-3 mb-3 mt-3 border border-blue-100">
            <p className="text-[10px] uppercase tracking-widest text-blue-500 font-medium mb-2 flex items-center gap-1">
              <User className="h-3 w-3" /> Datos del Cliente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="font-medium text-gray-800">{customerInfo.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                  <span className="text-gray-600 truncate">{customerInfo.email}</span>
                </div>
                {customerInfo.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="text-gray-600">{customerInfo.phone}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-mono">ID: {String(subscription.id).slice(0, 8)}...</span>
                {subscription.mercadopago_subscription_id && (
                  <p className="text-[10px] text-blue-500 font-mono">MP: {subscription.mercadopago_subscription_id.slice(0, 12)}...</p>
                )}
              </div>
            </div>
          </div>

          {/* Dirección de Envío */}
          <div className="bg-amber-50/60 rounded-lg p-3 mb-3 border border-amber-100">
            <p className="text-[10px] uppercase tracking-widest text-amber-600 font-medium mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Dirección de Envío
            </p>
            {shippingInfo ? (
              <div className="text-xs text-gray-700 space-y-0.5">
                <p className="flex gap-1.5 items-start">
                  <MapPin className="h-3 w-3 shrink-0 text-amber-400 mt-0.5" />
                  <span className="font-medium">{shippingInfo.address || `${shippingInfo.street || ''} ${shippingInfo.number || ''}`.trim()}</span>
                </p>
                {shippingInfo.colonia && (
                  <p className="pl-[18px] text-gray-500">Col. {shippingInfo.colonia}</p>
                )}
                {(shippingInfo.city || shippingInfo.state) && (
                  <p className="pl-[18px] text-gray-500">
                    {shippingInfo.city}{shippingInfo.state ? `, ${shippingInfo.state}` : ''}
                  </p>
                )}
                {(shippingInfo.postalCode || shippingInfo.zip) && (
                  <p className="pl-[18px] text-gray-400 font-mono text-[10px]">CP: {shippingInfo.postalCode || shippingInfo.zip}</p>
                )}
                {shippingInfo.country && (
                  <p className="pl-[18px] text-gray-400 text-[10px] uppercase tracking-wider">{shippingInfo.country}</p>
                )}
                {shippingInfo.references && (
                  <p className="pl-[18px] text-gray-400 text-[10px] italic">Ref: {shippingInfo.references}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-500 italic">Sin dirección registrada</p>
            )}
          </div>

          {/* Additional badges */}
          {(subscription.quantity && subscription.quantity > 1 || subscription.metadata?.processed_manually) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {subscription.quantity && subscription.quantity > 1 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-800">
                  Qty: {subscription.quantity}
                </Badge>
              )}
              {subscription.metadata?.processed_manually && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-800">🔧 Manual</Badge>
              )}
            </div>
          )}

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

          {/* Centro de Logística */}
          {onUpdateOrderStatus && (
            <div className="bg-gray-50/60 rounded-lg p-2.5 mb-3 border border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Centro de Logística (Cambio de Estado)
              </p>
              <p className="text-[10px] text-blue-600 mb-2 flex items-center gap-1">
                <Mail className="h-2.5 w-2.5" />
                Al cambiar el estado se enviará notificación oficial por email al cliente.
              </p>
              {(() => {
                const currentOrderStatus = subscription.order_status || subscription.metadata?.order_status || 'pending'
                return (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onUpdateOrderStatus('processing')}
                      disabled={updatingOrderStatus || currentOrderStatus === 'processing'}
                      className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-800 ring-1 ring-inset ring-blue-600/20 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrderStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Clock className="mr-1 h-3 w-3" />}
                      Procesando
                    </button>
                    <button
                      onClick={() => onUpdateOrderStatus('shipped')}
                      disabled={updatingOrderStatus || currentOrderStatus === 'shipped'}
                      className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-2 py-1.5 text-[11px] font-medium text-indigo-800 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrderStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Truck className="mr-1 h-3 w-3" />}
                      En camino
                    </button>
                    <button
                      onClick={() => onUpdateOrderStatus('completed')}
                      disabled={updatingOrderStatus || currentOrderStatus === 'completed'}
                      className="inline-flex items-center justify-center rounded-md bg-green-50 px-2 py-1.5 text-[11px] font-medium text-green-800 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrderStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                      Entregado
                    </button>
                    <button
                      onClick={() => onUpdateOrderStatus('cancelled')}
                      disabled={updatingOrderStatus || currentOrderStatus === 'cancelled'}
                      className="inline-flex items-center justify-center rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-800 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrderStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
                      Cancelar
                    </button>
                    <button
                      onClick={() => onUpdateOrderStatus('refunded')}
                      disabled={updatingOrderStatus || currentOrderStatus === 'refunded'}
                      className="inline-flex items-center justify-center rounded-md bg-orange-50 px-2 py-1.5 text-[11px] font-medium text-orange-800 ring-1 ring-inset ring-orange-600/20 hover:bg-orange-100 disabled:opacity-50 transition-colors"
                    >
                      {updatingOrderStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Clock className="mr-1 h-3 w-3" />}
                      Reembolsado
                    </button>
                  </div>
                )
              })()}
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
      </div>
    </Card>
  )
}