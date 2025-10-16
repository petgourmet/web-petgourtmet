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
}

function ExitoSuscripcionContent() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activatedSubscriptions, setActivatedSubscriptions] = useState<ActivatedSubscription[]>([])
  const [isProcessing, setIsProcessing] = useState(true)
  const [emailsSent, setEmailsSent] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)

  const externalReference = searchParams.get('external_reference')
  const preapprovalId = searchParams.get('preapproval_id')
  const status = searchParams.get('status')

  useEffect(() => {
    if (!loading && !user) {
      const currentUrl = `/suscripcion/exito?${searchParams.toString()}`
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      return
    }

    if (user && !processingComplete) {
      processSubscriptionSuccess()
    }
  }, [user, loading, router, processingComplete])

  const processSubscriptionSuccess = async () => {
    if (!user?.id) return

    try {
      setIsProcessing(true)
      
      console.log('🎉 Procesando éxito de suscripción para usuario:', user.id)
      console.log('📋 Parámetros:', { externalReference, preapprovalId, status })

      // Primero intentar buscar suscripciones del usuario (activas o pendientes)
      console.log('🔍 Buscando suscripciones del usuario...')
      const { data: subscriptions, error: fetchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('📊 Suscripciones encontradas:', subscriptions?.length || 0)
      console.log('📦 Detalles:', subscriptions?.map(s => ({
        id: s.id,
        status: s.status,
        product_name: s.product_name,
        mercadopago_subscription_id: s.mercadopago_subscription_id
      })))

      if (fetchError) {
        console.error('❌ Error buscando suscripciones:', fetchError)
      }

      // Si hay suscripciones activas recientes (últimas 24h), mostrarlas directamente
      const recentActiveSubscriptions = subscriptions?.filter(sub => {
        const isRecent = new Date(sub.created_at).getTime() > Date.now() - (24 * 60 * 60 * 1000)
        return (sub.status === 'active' || sub.status === 'pending') && isRecent
      }) || []

      console.log('✅ Suscripciones activas recientes:', recentActiveSubscriptions.length)

      if (recentActiveSubscriptions.length > 0) {
        setActivatedSubscriptions(recentActiveSubscriptions as any)
        
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

      // Si no hay suscripciones activas recientes, intentar activar con el endpoint
      console.log('🔄 No hay suscripciones activas recientes, intentando activar...')
      const response = await fetch('/api/subscriptions/activate-landing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          external_reference: externalReference,
          preapproval_id: preapprovalId,
          status: status
        })
      })

      const result = await response.json()
      console.log('📥 Respuesta del endpoint:', result)

      if (response.ok && result.success) {
        setActivatedSubscriptions(result.activatedSubscriptions || [])
        setEmailsSent(result.emailsSent || false)
        
        toast({
          title: "¡Bienvenido a Pet Gourmet!",
          description: `Se ${result.activatedSubscriptions?.length === 1 ? 'ha activado tu suscripción' : 'han activado ' + (result.activatedSubscriptions?.length || 0) + ' suscripciones'} exitosamente.`,
        })
      } else {
        console.warn('⚠️ No se pudieron activar suscripciones:', result.error)
        
        // Mostrar las suscripciones pendientes de todos modos
        if (recentActiveSubscriptions.length === 0 && subscriptions && subscriptions.length > 0) {
          const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending')
          if (pendingSubscriptions.length > 0) {
            setActivatedSubscriptions(pendingSubscriptions as any)
            toast({
              title: "Pago procesado",
              description: "Tu pago fue recibido. La suscripción se está activando automáticamente.",
            })
          }
        }
      }
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
                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatPrice(subscription.discounted_price)}
                          </p>
                          {subscription.original_price && subscription.original_price > subscription.discounted_price && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(subscription.original_price)}
                              </span>
                              {subscription.discount_percentage && (
                                <Badge variant="destructive" className="text-xs">
                                  -{subscription.discount_percentage}%
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-gray-600">
                            {getFrequencyText(subscription.frequency, subscription.frequency_type)}
                          </p>
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