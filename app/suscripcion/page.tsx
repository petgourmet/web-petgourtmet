"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Calendar, Package, CreditCard, ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

interface UserSubscription {
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
}

export default function SuscripcionPage() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/suscripcion")
      return
    }

    if (user) {
      // Verificar si viene de MercadoPago y procesar suscripción
      const urlParams = new URLSearchParams(window.location.search)
      const preapprovalId = urlParams.get('preapproval_id')
      const externalReference = urlParams.get('external_reference')
      const status = urlParams.get('status')
      
      console.log('URL params:', { preapprovalId, externalReference, status })
      
      if (preapprovalId) {
        // Prioridad 1: Validar suscripción usando preapproval_id
        console.log('Procesando preapproval_id:', preapprovalId)
        validatePreapprovalSubscription(preapprovalId)
      } else if (externalReference && status === 'approved') {
        // Prioridad 2: Activar suscripción pendiente por external_reference
        console.log('Procesando external_reference:', externalReference)
        activatePendingSubscription(externalReference)
      } else {
        // Activar automáticamente suscripciones pendientes del usuario
        activateUserPendingSubscriptions()
      }
    }
  }, [user, loading, router])

  const loadUserSubscriptions = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      
      const { data: subscriptions, error } = await supabase
        .from("unified_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error al cargar suscripciones:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las suscripciones",
          variant: "destructive",
        })
        return
      }

      setSubscriptions(subscriptions || [])
      
      // Si el usuario tiene suscripciones activas, actualizar su perfil
      if (subscriptions && subscriptions.length > 0) {
        await updateUserProfile()
      }
    } catch (error) {
      console.error("Error al cargar suscripciones:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const activateUserPendingSubscriptions = async () => {
    if (!user?.id) return

    try {
      setIsProcessing(true)
      
      // Buscar todas las suscripciones pendientes del usuario
      const { data: pendingSubscriptions, error: pendingError } = await supabase
        .from("unified_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .not('mercadopago_subscription_id', 'is', null)

      if (pendingError) {
        console.error("Error buscando suscripciones pendientes:", pendingError)
        loadUserSubscriptions()
        return
      }

      if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
        console.log("No se encontraron suscripciones pendientes")
        loadUserSubscriptions()
        return
      }

      console.log(`Encontradas ${pendingSubscriptions.length} suscripciones pendientes`)
      
      // Activar cada suscripción pendiente
      for (const pendingSubscription of pendingSubscriptions) {
        await activateSingleSubscription(pendingSubscription)
      }
      
      // Actualizar perfil del usuario
      await updateUserProfile()
      
      // Enviar email de bienvenida
      await sendWelcomeEmail()
      
      // Mostrar mensaje de éxito
      toast({
        title: "¡Bienvenido a Pet Gourmet!",
        description: `Se ${pendingSubscriptions.length === 1 ? 'ha activado tu suscripción' : 'han activado ' + pendingSubscriptions.length + ' suscripciones'} exitosamente`,
      })
      
      // Cargar suscripciones actualizadas
      loadUserSubscriptions()
      
    } catch (error) {
      console.error("Error activando suscripciones pendientes:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al activar las suscripciones",
        variant: "destructive",
      })
      loadUserSubscriptions()
    } finally {
      setIsProcessing(false)
    }
  }

  const activateSingleSubscription = async (pendingSubscription: any) => {
    if (!user?.id) return

    try {
      // Calcular próxima fecha de pago basada en el tipo de suscripción
      const nextBillingDate = calculateNextBillingDate(pendingSubscription.subscription_type)
      
      // Actualizar suscripción a activa
      const { data: newSubscription, error: createError } = await supabase
        .from("unified_subscriptions")
        .update({
          status: "active",
          next_billing_date: nextBillingDate,
          last_billing_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", pendingSubscription.id)
        .select()
        .single()

      if (createError) {
        console.error("Error creando suscripción activa:", createError)
        throw createError
      }

      console.log("Suscripción activada exitosamente:", newSubscription)
      
    } catch (error) {
      console.error("Error activando suscripción individual:", error)
      throw error
    }
  }

  const activateSingleSubscriptionWithProduct = async (pendingSubscription: any) => {
    if (!user?.id) return

    try {
      console.log('🔧 Activando suscripción con información del producto:', pendingSubscription.id)
      
      // Obtener información del producto si no está disponible
      let productInfo = pendingSubscription.products
      
      if (!productInfo && pendingSubscription.product_id) {
        console.log('📦 Obteniendo información del producto:', pendingSubscription.product_id)
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', pendingSubscription.product_id)
          .single()
        
        if (!productError && product) {
          productInfo = product
          console.log('✅ Producto encontrado:', product.name)
        }
      }
      
      // Calcular próxima fecha de pago basada en el tipo de suscripción
      const nextBillingDate = calculateNextBillingDate(pendingSubscription.subscription_type)
      
      // Preparar datos de actualización
      const updateData: any = {
        status: "active",
        next_billing_date: nextBillingDate,
        last_billing_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Agregar información del producto si está disponible
      if (productInfo) {
        updateData.product_name = productInfo.name
        updateData.price = productInfo.price
        
        // Calcular precio con descuento según el tipo de suscripción
        const discountField = getDiscountField(pendingSubscription.subscription_type)
        if (discountField && productInfo[discountField]) {
          const discountPercentage = productInfo[discountField]
          updateData.discounted_price = productInfo.price * (1 - discountPercentage / 100)
        } else {
          updateData.discounted_price = productInfo.price
        }
        
        console.log(`💰 Precio calculado: ${productInfo.price} -> ${updateData.discounted_price}`)
      }
      
      // Actualizar suscripción a activa con toda la información
      const { data: newSubscription, error: createError } = await supabase
        .from("unified_subscriptions")
        .update(updateData)
        .eq("id", pendingSubscription.id)
        .select()
        .single()

      if (createError) {
        console.error("Error activando suscripción:", createError)
        throw createError
      }

      console.log("✅ Suscripción activada exitosamente con información completa:", newSubscription)
      
    } catch (error) {
      console.error("Error activando suscripción con producto:", error)
      throw error
    }
  }

  const getDiscountField = (subscriptionType: string) => {
    switch (subscriptionType) {
      case 'biweekly':
        return 'biweekly_discount'
      case 'monthly':
        return 'monthly_discount'
      case 'quarterly':
        return 'quarterly_discount'
      case 'annual':
        return 'annual_discount'
      default:
        return 'monthly_discount'
    }
  }

  const sendWelcomeEmail = async (subscriptionData?: any) => {
    if (!user?.email) return

    try {
      // Preparar detalles de la suscripción para el email
      const subscriptionDetails = subscriptionData || {
        product_name: 'Plan Pet Gourmet',
        frequency_text: 'Mensual',
        discounted_price: '0.00',
        next_billing_date: null
      }

      const response = await fetch('/api/subscriptions/send-thank-you-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          subscription_id: subscriptionData?.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email,
          subscription_details: subscriptionDetails,
          send_admin_notification: true // Enviar también a administradores
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log("✅ Emails de bienvenida enviados exitosamente (usuario y admin)")
      } else {
        console.error("❌ Error enviando emails de bienvenida:", result.error)
      }
      
    } catch (error) {
      console.error("❌ Error enviando emails de bienvenida:", error)
    }
  }

  const activatePendingSubscription = async (externalReference: string) => {
    if (!user?.id) return

    try {
      setIsProcessing(true)
      console.log('🔍 Activando suscripción con external_reference:', externalReference)
      
      // Buscar suscripción pendiente por external_reference con información del producto
      const { data: pendingSubscriptions, error: pendingError } = await supabase
        .from("unified_subscriptions")
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .eq("external_reference", externalReference)
        .eq("status", "pending")

      if (pendingError) {
        console.error("Error buscando suscripción:", pendingError)
        loadUserSubscriptions()
        return
      }

      if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
        console.log("❌ No se encontraron suscripciones pendientes con external_reference:", externalReference)
        
        // Buscar cualquier suscripción pendiente del usuario para activar
        const { data: userPendingSubscriptions } = await supabase
          .from("unified_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (userPendingSubscriptions && userPendingSubscriptions.length > 0) {
          console.log('✅ Encontrada suscripción pendiente del usuario, activando...')
          const subscription = userPendingSubscriptions[0]
          await activateSingleSubscriptionWithProduct(subscription)
          await updateUserProfile()
          await sendWelcomeEmail(subscription)
          
          toast({
            title: "¡Suscripción activada!",
            description: "Tu suscripción ha sido activada exitosamente",
          })
        }
        
        loadUserSubscriptions()
        return
      }

      const pendingSubscription = pendingSubscriptions[0]
      console.log('✅ Suscripción encontrada:', pendingSubscription)
      
      // Activar la suscripción con información del producto
      await activateSingleSubscriptionWithProduct(pendingSubscription)
      
      // Actualizar perfil del usuario
      await updateUserProfile()
      
      // Enviar email de bienvenida con datos de la suscripción
      await sendWelcomeEmail(pendingSubscription)
      
      // Mostrar mensaje de éxito
      toast({
        title: "¡Suscripción activada!",
        description: "Tu suscripción ha sido activada exitosamente",
      })
      
      // Cargar suscripciones actualizadas
      loadUserSubscriptions()
      
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
    } catch (error) {
      console.error("Error activando suscripción:", error)
      toast({
        title: "Error",
        description: "No se pudo activar la suscripción",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const validatePreapprovalSubscription = async (preapprovalId: string) => {
    if (!user?.id) return

    try {
      setIsProcessing(true)
      console.log('Validando preapproval_id:', preapprovalId, 'para usuario:', user.id)
      
      // Primero verificar si ya existe una suscripción con este preapproval_id
      const { data: existingPending, error: pendingError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', preapprovalId)
        .eq('user_id', user.id)
        .single()

      if (existingPending && existingPending.status === 'active') {
        console.log('Suscripción ya activa, cargando suscripciones activas')
        loadUserSubscriptions()
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      // Si no existe suscripción, crear una nueva entrada
      if (!existingPending) {
        console.log('Creando suscripción para preapproval_id:', preapprovalId)
        const { error: insertError } = await supabase
          .from('unified_subscriptions')
          .insert({
            user_id: user.id,
            mercadopago_subscription_id: preapprovalId,
            external_reference: preapprovalId,
            status: 'pending',
            subscription_type: 'monthly', // Default, se actualizará con webhook
            product_name: 'Producto Pet Gourmet',
            discounted_price: 0,
            frequency: '1',
            frequency_type: 'months',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error creando suscripción:', insertError)
        } else {
          console.log('Suscripción creada exitosamente')
        }
      }
      
      // Llamar al endpoint para validar la suscripción
      const response = await fetch('/api/validate-preapproval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preapproval_id: preapprovalId,
          user_id: user.id
        })
      })

      const result = await response.json()
      console.log('Resultado de validación:', result)

      if (response.ok && result.success) {
        toast({
          title: "¡Suscripción procesada!",
          description: result.message || "Tu suscripción ha sido procesada exitosamente",
        })
        
        // Cargar suscripciones actualizadas
        loadUserSubscriptions()
        
        // Limpiar URL para evitar revalidaciones
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        console.error("Error validando suscripción:", result.error)
        
        // Mostrar mensaje informativo en lugar de error
        toast({
          title: "Suscripción registrada",
          description: "Tu suscripción ha sido registrada y será procesada automáticamente cuando se confirme el pago.",
        })
        
        // Cargar suscripciones normalmente
        loadUserSubscriptions()
        
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
      
    } catch (error) {
      console.error("Error validando preapproval:", error)
      toast({
        title: "Suscripción registrada",
        description: "Tu suscripción ha sido registrada y será procesada automáticamente.",
      })
      
      // Cargar suscripciones normalmente
      loadUserSubscriptions()
      
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateNextBillingDate = (subscriptionType: string): string => {
    const now = new Date()
    
    switch (subscriptionType) {
      case "weekly":
        now.setDate(now.getDate() + 7)
        break
      case "biweekly":
        now.setDate(now.getDate() + 14)
        break
      case "monthly":
        now.setMonth(now.getMonth() + 1)
        break
      case "quarterly":
        now.setMonth(now.getMonth() + 3)
        break
      case "annual":
        now.setFullYear(now.getFullYear() + 1)
        break
      default:
        now.setMonth(now.getMonth() + 1) // Default mensual
    }
    
    return now.toISOString()
  }

  const getFrequencyFromType = (subscriptionType: string): string => {
    switch (subscriptionType) {
      case "weekly": return "1"
      case "biweekly": return "2"
      case "monthly": return "1"
      case "quarterly": return "3"
      case "annual": return "12"
      default: return "1"
    }
  }

  const updateUserProfile = async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          has_active_subscription: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      if (error) {
        console.error("Error al actualizar perfil:", error)
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error)
    }
  }

  const getFrequencyText = (subscription: UserSubscription) => {
    const frequency = subscription.frequency
    const type = subscription.frequency_type
    
    if (type === 'weeks') {
      if (frequency === '1') return 'Semanal'
      if (frequency === '2') return 'Quincenal'
      return `Cada ${frequency} semanas`
    } else if (type === 'months') {
      if (frequency === '1') return 'Mensual'
      if (frequency === '3') return 'Trimestral'
      if (frequency === '12') return 'Anual'
      return `Cada ${frequency} meses`
    }
    return `Cada ${frequency} ${type}`
  }

  const getSubscriptionTypeText = (type: string) => {
    switch (type) {
      case 'weekly': return 'Semanal'
      case 'biweekly': return 'Quincenal'
      case 'monthly': return 'Mensual'
      case 'quarterly': return 'Trimestral'
      case 'annual': return 'Anual'
      default: return type
    }
  }

  const handleManageSubscription = (subscriptionId: number) => {
    router.push(`/perfil?tab=subscriptions&highlight=${subscriptionId}`)
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isProcessing ? 'Procesando tu suscripción...' : 'Verificando tu suscripción...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500 mr-4" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ¡Bienvenido a Pet Gourmet!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Tu suscripción ha sido activada exitosamente
              </p>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        {subscriptions.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Tus Suscripciones Activas
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id} className="overflow-hidden">
                  <CardHeader className="bg-primary/10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {subscription.product_image && (
                          <img
                            src={subscription.product_image}
                            alt={subscription.product_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{subscription.product_name}</CardTitle>
                          <CardDescription>
                            {subscription.size && `Tamaño: ${subscription.size}`}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500">
                        ✅ Activa
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Frecuencia:
                          </span>
                        </div>
                        <Badge variant="outline">
                          {getSubscriptionTypeText(subscription.subscription_type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Precio:
                          </span>
                        </div>
                        <span className="font-semibold text-lg">
                          ${subscription.discounted_price?.toFixed(2)} MXN
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Próxima entrega:
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {new Date(subscription.next_billing_date).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                      
                      <Button
                        onClick={() => handleManageSubscription(subscription.id)}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        Gestionar Suscripción
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  ¡Tu suscripción está siendo procesada!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Estamos activando tu suscripción. En unos momentos podrás ver todos los detalles de tu plan Pet Gourmet.
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="max-w-4xl mx-auto mt-8 flex justify-between items-center">
          <Link href="/">
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al inicio</span>
            </Button>
          </Link>
          
          <Link href="/perfil">
            <Button className="bg-primary hover:bg-primary/90">
              Ver mi perfil
            </Button>
          </Link>
        </div>

        {/* Information Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">¿Necesitas ayuda con tu suscripción?</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Si tienes alguna pregunta sobre tu suscripción o necesitas hacer cambios, 
                nuestro equipo de soporte está aquí para ayudarte.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" asChild>
                  <a href="mailto:contacto@petgourmet.mx">
                    Contactar Soporte
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/terminos">
                    Términos y Condiciones
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}