"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Calendar, Package, CreditCard, ArrowLeft, Gift, Mail, Heart, Clock } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { trackPurchase, initializeDataLayer, pushProductDataLayer } from '@/utils/analytics'

interface ActivatedSubscription {
  id: number
  product_name: string
  subscription_type: string
  status: string
  next_billing_date: string
  discounted_price: number
  frequency: string
  frequency_type: string
  product_image?: string
  size?: string
  discount_percentage?: number
  original_price?: number
  base_price?: number
}

function ExitoSuscripcionContent() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activatedSubscriptions, setActivatedSubscriptions] = useState<ActivatedSubscription[]>([])
  const [isProcessing, setIsProcessing] = useState(true)
  const [emailsSent, setEmailsSent] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!loading && !user) {
      const currentUrl = `/suscripcion/exito?${searchParams.toString()}`
      router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    if (user && !processingComplete && sessionId) {
      processSubscriptionSuccess()
    }
  }, [user, loading, router, processingComplete, sessionId])

  const processSubscriptionSuccess = async () => {
    if (!user?.id || !sessionId) return

    try {
      setIsProcessing(true)
      
      console.log('🎉 Procesando éxito de suscripción para usuario:', user.id)
      console.log('📋 Session ID:', sessionId)

      // Paso 1: Sincronizar suscripción con Stripe (crea o retorna existente)
      console.log('🔄 Sincronizando suscripción con Stripe...')
      const syncResponse = await fetch('/api/subscriptions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      let syncedSubscription = null
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        syncedSubscription = syncData.subscription
        console.log(`✅ Suscripción ${syncData.isNew ? 'creada' : 'ya existía'}:`, syncedSubscription?.id)
      } else {
        const errData = await syncResponse.json().catch(() => ({}))
        console.warn('⚠️ Error en sync:', errData.error || syncResponse.status)
      }

      // Paso 2: Buscar suscripciones del usuario (incluye la recién sincronizada)
      console.log('🔍 Buscando suscripciones del usuario...')
      const { data: subscriptions, error: fetchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('📊 Suscripciones encontradas:', subscriptions?.length || 0)

      if (fetchError) {
        console.error('❌ Error buscando suscripciones:', fetchError)
      }

      // Filtrar suscripciones activas recientes (últimas 24h)
      const recentActiveSubscriptions = (subscriptions as any[])?.filter(sub => {
        const isRecent = new Date(sub.created_at).getTime() > Date.now() - (24 * 60 * 60 * 1000)
        return (sub.status === 'active' || sub.status === 'pending') && isRecent
      }) || []

      // Si no se encontraron por user_id pero el sync retornó una, usarla
      if (recentActiveSubscriptions.length === 0 && syncedSubscription) {
        recentActiveSubscriptions.push(syncedSubscription)
      }

      console.log('✅ Suscripciones activas recientes:', recentActiveSubscriptions.length)

      if (recentActiveSubscriptions.length > 0) {
        setActivatedSubscriptions(recentActiveSubscriptions as any)
        
        // ===== TRACKING DE GTM PARA SUSCRIPCIONES =====
        console.log('🔵 [GTM] Iniciando tracking de suscripción')
        
        // Inicializar Data Layer con session_id como order ID
        if (sessionId) {
          initializeDataLayer(sessionId)
        }
        
        // Preparar items para el tracking
        const subscriptionItems = recentActiveSubscriptions.map((sub: any) => {
          const basePrice = sub.original_price || sub.base_price || sub.discounted_price || 0
          const discountPercentage = sub.discount_percentage || 0
          const discountAmount = basePrice * (discountPercentage / 100)
          const priceAfterDiscount = basePrice - discountAmount
          const shippingCost = basePrice >= 1000 ? 0 : 100
          const totalPerPeriod = priceAfterDiscount + shippingCost
          
          return {
            id: sub.id,
            product_id: sub.id,
            name: sub.product_name,
            price: totalPerPeriod,
            quantity: 1,
            category: 'Suscripción',
            subcategory: getSubscriptionTypeText(sub.subscription_type),
            brand: 'PET GOURMET',
            variant: sub.size || 'Standard'
          }
        })
        
        // Calcular totales
        const subtotal = subscriptionItems.reduce((sum: number, item: any) => sum + item.price, 0)
        const shipping = 0 // Ya incluido en el precio
        const total = subtotal
        
        // Push de datos del primer producto al Data Layer
        if (subscriptionItems.length > 0) {
          const firstItem = subscriptionItems[0]
          pushProductDataLayer({
            productCategory: firstItem.category,
            productCategoryC: firstItem.category,
            productName: firstItem.name,
            productNameC: firstItem.name,
            productPrice: firstItem.price,
            productPriceC: firstItem.price,
            productQuantityC: firstItem.quantity,
            productSKUC: String(firstItem.product_id),
            productos: subscriptionItems.length
          })
        }
        
        // Trackear como purchase (suscripción = compra recurrente)
        trackPurchase({
          orderId: sessionId || `sub_${Date.now()}`,
          orderNumber: sessionId ? `SUB-${sessionId.substring(0, 8)}` : `SUB-${Date.now()}`,
          total: total,
          subtotal: subtotal,
          shipping: shipping,
          tax: 0,
          affiliation: 'PetGourmet Suscripciones',
          items: subscriptionItems,
          customerEmail: user.email || '',
          customerName: user.user_metadata?.full_name || user.email || 'Cliente',
        })
        
        console.log('🟢 [GTM] Tracking de suscripción completado')
        console.log('📊 [GTM] Data Layer:', window.dataLayer)
        
        toast({
          title: recentActiveSubscriptions.some(s => s.status === 'pending') 
            ? "¡Pago recibido!" 
            : "¡Bienvenido a Pet Gourmet!",
          description: recentActiveSubscriptions.some(s => s.status === 'pending')
            ? "Tu pago fue procesado exitosamente. Tu suscripción se activará en los próximos minutos."
            : "Tu suscripción está activa y lista para usar.",
        })
        
        setIsProcessing(false)
        setProcessingComplete(true)
        return
      }

      // La sincronización ya garantiza que la suscripción existe
      // Si aún así no se encontró, mostrar mensaje genérico
      toast({
        title: "Pago procesado",
        description: "Tu pago fue recibido. La suscripción se está activando automáticamente.",
      })
    } catch (error) {
      console.error('❌ Error procesando éxito de suscripción:', error)
      toast({
        title: "Información",
        description: "Tu pago fue procesado. Verifica tu suscripción en tu perfil.",
        variant: "default",
      })
    } finally {
      setIsProcessing(false)
      setProcessingComplete(true)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const getFrequencyText = (frequency: string, frequencyType: string) => {
    const num = parseInt(frequency)
    if (frequencyType === 'months') {
      return num === 1 ? 'Mensual' : `Cada ${num} meses`
    }
    return `Cada ${num} ${frequencyType}`
  }

  const getSubscriptionTypeText = (type: string) => {
    switch (type) {
      case 'weekly': return 'Semanal'
      case 'biweekly': return 'Quincenal'
      case 'monthly': return 'Mensual'
      case 'bimonthly': return 'Bimestral'
      case 'quarterly': return 'Trimestral'
      case 'semiannual': return 'Semestral'
      case 'annual': return 'Anual'
      default: return type
    }
  }

  if (loading || isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7AB8BF] mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Verificando tu suscripción...</h3>
            <p className="text-gray-600">Estamos comprobando el estado de tu pago y suscripción.</p>
            <p className="text-sm text-gray-500 mt-2">Esto solo toma unos segundos...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header de éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ¡Gracias por suscribirte a Pet Gourmet!
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Tu suscripción ha sido activada exitosamente
          </p>
          {emailsSent && (
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Correos de confirmación enviados</span>
            </div>
          )}
        </div>

        {/* Suscripciones activadas */}
        {activatedSubscriptions.length > 0 && (
          <div className="grid gap-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              {activatedSubscriptions.length === 1 ? 'Tu Suscripción Activa' : 'Tus Suscripciones Activas'}
            </h2>
            
            {activatedSubscriptions.map((subscription) => (
              <Card key={subscription.id} className="overflow-hidden border-2 border-[#7AB8BF]/20">
                <CardHeader className="bg-gradient-to-r from-[#7AB8BF] to-[#5A9EA6] text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{subscription.product_name}</CardTitle>
                      <CardDescription className="text-blue-100">
                        Suscripción {getSubscriptionTypeText(subscription.subscription_type)}
                      </CardDescription>
                    </div>
                    {subscription.status === 'active' ? (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-white border-yellow-300/30">
                        <Clock className="w-4 h-4 mr-1" />
                        Activando...
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-[#7AB8BF]" />
                        <div className="w-full">
                          {(() => {
                            const basePrice = subscription.original_price || subscription.base_price || 0
                            const discountPercentage = subscription.discount_percentage || 0
                            const discountAmount = basePrice * (discountPercentage / 100)
                            const priceAfterDiscount = basePrice - discountAmount
                            const shippingCost = basePrice >= 1000 ? 0 : 100
                            const totalPerPeriod = priceAfterDiscount + shippingCost
                            
                            return (
                              <>
                                <p className="font-semibold text-gray-900 text-lg">
                                  {formatPrice(totalPerPeriod)}
                                </p>
                                <p className="text-sm text-gray-600 mb-2">
                                  Cada {subscription.frequency} {subscription.frequency_type === 'weeks' ? 'semana(s)' : 'mes(es)'}
                                </p>
                                
                                {/* Desglose de precio */}
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-xs">
                                  {basePrice > 0 && (
                                    <>
                                      <div className="flex justify-between text-gray-600">
                                        <span>Precio base:</span>
                                        <span>{formatPrice(basePrice)}</span>
                                      </div>
                                      {discountPercentage > 0 && (
                                        <div className="flex justify-between text-green-600">
                                          <span>Descuento ({discountPercentage}%):</span>
                                          <span>-{formatPrice(discountAmount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between text-gray-600">
                                        <span>Envío:</span>
                                        <span>{shippingCost === 0 ? <span className="text-green-600">Gratis</span> : formatPrice(shippingCost)}</span>
                                      </div>
                                      <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-300">
                                        <span>Total:</span>
                                        <span className="text-[#7AB8BF]">{formatPrice(totalPerPeriod)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#7AB8BF]" />
                        <div>
                          <p className="font-semibold text-gray-900">Próximo pago</p>
                          <p className="text-sm text-gray-600">
                            {new Date(subscription.next_billing_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-[#7AB8BF]" />
                        <div>
                          <p className="font-semibold text-gray-900">Beneficios incluidos</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Nutrición premium para tu mascota</li>
                            <li>• Entrega automática cada mes</li>
                            <li>• Descuentos exclusivos de suscriptor</li>
                            <li>• Soporte prioritario</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                ¿Qué sigue?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Recibirás un correo con todos los detalles de tu suscripción</li>
                <li>• Tu primer envío llegará en los próximos días</li>
                <li>• Puedes gestionar tu suscripción desde tu perfil</li>
                <li>• Te notificaremos antes de cada pago automático</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                ¿Necesitas ayuda?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Nuestro equipo está aquí para ayudarte con cualquier pregunta sobre tu suscripción.
              </p>
              <Link href="/contacto">
                <Button variant="outline" size="sm">
                  Contactar soporte
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/perfil">
            <Button className="bg-[#7AB8BF] hover:bg-[#5A9EA6] text-white">
              Ver mi perfil
            </Button>
          </Link>
          <Link href="/productos">
            <Button variant="outline">
              Explorar productos
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ExitoSuscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7AB8BF] mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Cargando...</h3>
            <p className="text-gray-600">Preparando tu página de éxito.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ExitoSuscripcionContent />
    </Suspense>
  )
}