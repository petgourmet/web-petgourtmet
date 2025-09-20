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
import logger, { LogCategory } from '@/lib/logger'

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
  const [isApproved, setIsApproved] = useState(false)

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
      const collectionId = urlParams.get('collection_id')
      const collectionStatus = urlParams.get('collection_status')
      const paymentId = urlParams.get('payment_id')
      const preferenceId = urlParams.get('preference_id')
      const paymentType = urlParams.get('payment_type')
      const siteId = urlParams.get('site_id')
      
      console.log('🔍 TODOS LOS URL Params detectados:', {
        status,
        preapprovalId,
        externalReference,
        collectionId,
        collectionStatus,
        paymentId,
        preferenceId,
        paymentType,
        siteId,
        fullURL: window.location.href,
        userId: user.id,
        timestamp: new Date().toISOString()
      })
      
      logger.info(LogCategory.SUBSCRIPTION, 'Usuario llegó a página de suscripción', {
        userId: user.id,
        hasPreapprovalId: !!preapprovalId,
        hasExternalReference: !!externalReference,
        status: status || 'no-status',
        userAgent: navigator.userAgent
      })
      
      // Si viene con status=approved O collection_status=approved, marcar como aprobado y activar automáticamente
      if ((status === 'approved' || collectionStatus === 'approved') && externalReference) {
        logger.info(LogCategory.SUBSCRIPTION, 'Status approved detectado, activando automáticamente', {
          userId: user.id,
          externalReference,
          status,
          collectionStatus,
          collectionId,
          paymentId
        })
        console.log('✅ Status APPROVED detectado - Activando suscripción automáticamente')
        console.log('📊 Datos completos para activación:', {
          externalReference,
          collectionId,
          paymentId,
          userId: user.id
        })
        setIsApproved(true)
        activateApprovedSubscription(urlParams).then(() => {
          // Cargar suscripciones después de la activación
          loadUserSubscriptions()
        })
      } else if (collectionId && paymentId && externalReference) {
        // Prioridad 1: Procesar pago con collection_id (flujo de pago único)
        logger.info(LogCategory.SUBSCRIPTION, 'Procesando pago con collection_id', {
          userId: user.id,
          collectionId,
          paymentId,
          externalReference
        })
        console.log('💳 Procesando pago único con collection_id:', collectionId)
        activateApprovedSubscription(urlParams).then(() => {
          loadUserSubscriptions()
        })
      } else if (preapprovalId) {
        // Prioridad 2: Validar suscripción usando preapproval_id
        logger.info(LogCategory.SUBSCRIPTION, 'Procesando preapproval_id', {
          userId: user.id,
          preapprovalId
        })
        console.log('🔄 Validando preapproval:', preapprovalId)
        validatePreapprovalSubscription(preapprovalId)
      } else if (externalReference) {
        // Prioridad 3: Activar suscripción pendiente por external_reference
        logger.info(LogCategory.SUBSCRIPTION, 'Procesando external_reference', {
          userId: user.id,
          externalReference
        })
        console.log('🔄 Activando suscripción pendiente:', externalReference)
        activatePendingSubscription(externalReference)
      } else {
        // Activar automáticamente suscripciones pendientes del usuario
        logger.info(LogCategory.SUBSCRIPTION, 'Activando suscripciones pendientes del usuario', {
          userId: user.id
        })
        console.log('🔄 Buscando suscripciones pendientes del usuario')
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
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            monthly_discount,
            quarterly_discount,
            annual_discount
          )
        `)
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



      // Mapear las suscripciones para incluir la imagen del producto
      const mappedSubscriptions = (subscriptions || []).map(sub => ({
        ...sub,
        product_image: sub.products?.image || sub.product_image
      }))


      setSubscriptions(mappedSubscriptions)
      
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

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripciones pendientes encontradas', {
        userId: user.id,
        pendingCount: pendingSubscriptions.length,
        subscriptionIds: pendingSubscriptions.map(s => s.id)
      })
      
      console.log(`Encontradas ${pendingSubscriptions.length} suscripciones pendientes`)
      
      // VALIDACIÓN ANTI-DUPLICACIÓN: Filtrar suscripciones que ya están activas
      const validPendingSubscriptions = []
      
      for (const pendingSubscription of pendingSubscriptions) {
        // Verificar si ya existe una suscripción activa con el mismo external_reference
        if (pendingSubscription.external_reference) {
          const { data: existingActive } = await supabase
            .from("unified_subscriptions")
            .select("*")
            .eq("external_reference", pendingSubscription.external_reference)
            .eq("status", "active")
          
          if (existingActive && existingActive.length > 0) {
            logger.warn(LogCategory.SUBSCRIPTION, 'DUPLICACIÓN EVITADA: Suscripción ya activa por external_reference', {
              userId: user.id,
              externalReference: pendingSubscription.external_reference,
              existingActiveId: existingActive[0].id,
              pendingId: pendingSubscription.id
            })
            console.log('⚠️ DUPLICACIÓN EVITADA: Ya existe suscripción activa con external_reference:', pendingSubscription.external_reference)
            continue
          }
        }
        
        // Verificar si ya existe una suscripción activa para el mismo producto
        if (pendingSubscription.product_id) {
          const { data: existingProductActive } = await supabase
            .from("unified_subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("product_id", pendingSubscription.product_id)
            .eq("status", "active")
          
          if (existingProductActive && existingProductActive.length > 0) {
            logger.warn(LogCategory.SUBSCRIPTION, 'DUPLICACIÓN EVITADA: Usuario ya tiene suscripción activa para producto', {
              userId: user.id,
              productId: pendingSubscription.product_id,
              existingActiveId: existingProductActive[0].id,
              pendingId: pendingSubscription.id
            })
            console.log('⚠️ DUPLICACIÓN EVITADA: Usuario ya tiene suscripción activa para producto:', pendingSubscription.product_id)
            continue
          }
        }
        
        validPendingSubscriptions.push(pendingSubscription)
      }
      
      if (validPendingSubscriptions.length === 0) {
        logger.info(LogCategory.SUBSCRIPTION, 'Todas las suscripciones ya están activas', {
          userId: user.id,
          totalPending: pendingSubscriptions.length,
          validPending: 0
        })
        console.log('✅ Todas las suscripciones ya están activas, no hay duplicaciones que procesar')
        toast({
          title: "Suscripciones ya activas",
          description: "Todas tus suscripciones ya están activas y funcionando correctamente",
        })
        loadUserSubscriptions()
        return
      }
      
      logger.info(LogCategory.SUBSCRIPTION, 'Procesando suscripciones válidas sin duplicados', {
        userId: user.id,
        totalPending: pendingSubscriptions.length,
        validPending: validPendingSubscriptions.length,
        validSubscriptionIds: validPendingSubscriptions.map(s => s.id)
      })
      
      console.log(`Procesando ${validPendingSubscriptions.length} suscripciones válidas (sin duplicados)`)
      
      // Activar cada suscripción pendiente válida
      for (const pendingSubscription of validPendingSubscriptions) {
        await activateSingleSubscription(pendingSubscription)
      }
      
      // Actualizar perfil del usuario
      await updateUserProfile()
      
      // Enviar email de bienvenida
      await sendWelcomeEmail()
      
      // Mostrar mensaje de éxito
      toast({
        title: "¡Bienvenido a Pet Gourmet!",
        description: `Se ${validPendingSubscriptions.length === 1 ? 'ha activado tu suscripción' : 'han activado ' + validPendingSubscriptions.length + ' suscripciones'} exitosamente`,
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
      
      // Preparar datos de actualización con TODOS los campos obligatorios
      const updateData: any = {
        status: "active",
        next_billing_date: nextBillingDate,
        last_billing_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        // CRÍTICO: Asegurar que el user_id SIEMPRE esté presente
        user_id: pendingSubscription.user_id || user.id
      }
      
      // Validar y llenar campos obligatorios desde cart_items o producto
      if (pendingSubscription.cart_items) {
        try {
          const cartItems = typeof pendingSubscription.cart_items === 'string' 
            ? JSON.parse(pendingSubscription.cart_items) 
            : pendingSubscription.cart_items
          
          if (cartItems && cartItems.length > 0) {
            const item = cartItems[0] // Primer item del carrito
            updateData.product_name = item.product_name || item.name || productInfo?.name || 'Producto Pet Gourmet'
            updateData.product_image = item.image || productInfo?.image || ''
            updateData.base_price = item.price || productInfo?.price || 0
            updateData.size = item.size || 'Estándar'
            updateData.product_id = item.product_id || item.id || pendingSubscription.product_id
          }
        } catch (e) {
          console.warn('Error parseando cart_items:', e)
        }
      }
      
      // Fallback a información del producto si cart_items no está disponible
      if (productInfo && !updateData.product_name) {
        updateData.product_name = productInfo.name || 'Producto Pet Gourmet'
        updateData.product_image = productInfo.image || ''
        updateData.base_price = productInfo.price || 0
        updateData.product_id = productInfo.id || pendingSubscription.product_id
      }
      
      // Si aún no tenemos product_name, usar el que ya existe en la suscripción
      if (!updateData.product_name && pendingSubscription.product_name) {
        updateData.product_name = pendingSubscription.product_name
      }
      if (!updateData.product_image && pendingSubscription.product_image) {
        updateData.product_image = pendingSubscription.product_image
      }
      if (!updateData.base_price && pendingSubscription.base_price) {
        updateData.base_price = pendingSubscription.base_price
      }
      
      // Calcular precio con descuento según el tipo de suscripción
      const basePrice = updateData.base_price || pendingSubscription.base_price || 0
      const discountField = getDiscountField(pendingSubscription.subscription_type)
      let discountPercentage = pendingSubscription.discount_percentage || 0
      
      if (discountField && productInfo?.[discountField]) {
        discountPercentage = productInfo[discountField]
        updateData.discounted_price = basePrice * (1 - discountPercentage / 100)
      } else if (pendingSubscription.discounted_price) {
        updateData.discounted_price = pendingSubscription.discounted_price
      } else {
        updateData.discounted_price = basePrice
      }
      
      updateData.discount_percentage = discountPercentage
      updateData.transaction_amount = pendingSubscription.transaction_amount || updateData.discounted_price
      
      // NUEVA LÓGICA: Recuperar precios faltantes desde múltiples fuentes
      console.log('💰 DIAGNÓSTICO DE PRECIOS - Estado actual:', {
        base_price: updateData.base_price,
        discounted_price: updateData.discounted_price,
        transaction_amount: updateData.transaction_amount,
        pendingSubscription_base_price: pendingSubscription.base_price,
        pendingSubscription_discounted_price: pendingSubscription.discounted_price,
        pendingSubscription_transaction_amount: pendingSubscription.transaction_amount
      })

      // Recuperar precios faltantes desde fuentes alternativas
      if (!updateData.base_price || updateData.base_price === 0) {
        console.log('🔍 RECUPERANDO base_price desde fuentes alternativas...')
        
        // Fuente 1: Desde pendingSubscription
        if (pendingSubscription.base_price && pendingSubscription.base_price > 0) {
          updateData.base_price = pendingSubscription.base_price
          console.log('✅ base_price recuperado desde pendingSubscription:', updateData.base_price)
        }
        // Fuente 2: Desde productInfo
        else if (productInfo?.price && productInfo.price > 0) {
          updateData.base_price = productInfo.price
          console.log('✅ base_price recuperado desde productInfo:', updateData.base_price)
        }
        // Fuente 3: Desde cart_items parseado
        else if (pendingSubscription.cart_items) {
          try {
            const cartItems = typeof pendingSubscription.cart_items === 'string' 
              ? JSON.parse(pendingSubscription.cart_items) 
              : pendingSubscription.cart_items
            if (cartItems && cartItems.length > 0 && cartItems[0].price > 0) {
              updateData.base_price = cartItems[0].price
              console.log('✅ base_price recuperado desde cart_items:', updateData.base_price)
            }
          } catch (e) {
            console.warn('⚠️ Error parseando cart_items para base_price:', e)
          }
        }
      }

      if (!updateData.discounted_price || updateData.discounted_price === 0) {
        console.log('🔍 RECUPERANDO discounted_price desde fuentes alternativas...')
        
        // Fuente 1: Desde pendingSubscription
        if (pendingSubscription.discounted_price && pendingSubscription.discounted_price > 0) {
          updateData.discounted_price = pendingSubscription.discounted_price
          console.log('✅ discounted_price recuperado desde pendingSubscription:', updateData.discounted_price)
        }
        // Fuente 2: Recalcular desde base_price si tenemos descuento
        else if (updateData.base_price > 0 && discountPercentage > 0) {
          updateData.discounted_price = updateData.base_price * (1 - discountPercentage / 100)
          console.log('✅ discounted_price recalculado desde base_price y descuento:', updateData.discounted_price)
        }
        // Fuente 3: Usar base_price si no hay descuento
        else if (updateData.base_price > 0) {
          updateData.discounted_price = updateData.base_price
          console.log('✅ discounted_price igualado a base_price (sin descuento):', updateData.discounted_price)
        }
      }

      if (!updateData.transaction_amount || updateData.transaction_amount === 0) {
        console.log('🔍 RECUPERANDO transaction_amount desde fuentes alternativas...')
        
        // Fuente 1: Desde pendingSubscription
        if (pendingSubscription.transaction_amount && pendingSubscription.transaction_amount > 0) {
          updateData.transaction_amount = pendingSubscription.transaction_amount
          console.log('✅ transaction_amount recuperado desde pendingSubscription:', updateData.transaction_amount)
        }
        // Fuente 2: Usar discounted_price
        else if (updateData.discounted_price > 0) {
          updateData.transaction_amount = updateData.discounted_price
          console.log('✅ transaction_amount igualado a discounted_price:', updateData.transaction_amount)
        }
        // Fuente 3: Usar base_price como último recurso
        else if (updateData.base_price > 0) {
          updateData.transaction_amount = updateData.base_price
          console.log('✅ transaction_amount igualado a base_price como último recurso:', updateData.transaction_amount)
        }
      }

      // Validar campos obligatorios DESPUÉS de intentar recuperarlos
      const requiredFields = ['product_name', 'product_id', 'transaction_amount', 'base_price', 'discounted_price', 'user_id']
      const missingFields = requiredFields.filter(field => !updateData[field] || (typeof updateData[field] === 'number' && updateData[field] === 0))
      
      if (missingFields.length > 0) {
        logger.error(LogCategory.SUBSCRIPTION, 'CRÍTICO: Campos obligatorios aún faltantes después de recuperación', {
          userId: user.id,
          subscriptionId: pendingSubscription.id,
          missingFields,
          providedFields: Object.keys(updateData),
          externalReference: pendingSubscription.external_reference,
          finalPrices: {
            base_price: updateData.base_price,
            discounted_price: updateData.discounted_price,
            transaction_amount: updateData.transaction_amount
          }
        })
        console.error('❌ CRÍTICO: Campos obligatorios aún faltantes después de recuperación:', missingFields)
        
        // Solo llenar campos no-precio con valores por defecto
        if (!updateData.product_name) updateData.product_name = 'Producto Pet Gourmet'
        if (!updateData.product_id) updateData.product_id = pendingSubscription.product_id
        if (!updateData.user_id) updateData.user_id = user.id
        
        // Para precios, lanzar error si no se pudieron recuperar
        if (!updateData.transaction_amount || updateData.transaction_amount === 0) {
          throw new Error(`CRÍTICO: No se pudo recuperar transaction_amount para suscripción ${pendingSubscription.id}`)
        }
        if (!updateData.base_price || updateData.base_price === 0) {
          throw new Error(`CRÍTICO: No se pudo recuperar base_price para suscripción ${pendingSubscription.id}`)
        }
        if (!updateData.discounted_price || updateData.discounted_price === 0) {
          throw new Error(`CRÍTICO: No se pudo recuperar discounted_price para suscripción ${pendingSubscription.id}`)
        }
      }

      console.log('💰 PRECIOS FINALES RECUPERADOS:', {
        base_price: updateData.base_price,
        discounted_price: updateData.discounted_price,
        transaction_amount: updateData.transaction_amount,
        discount_percentage: updateData.discount_percentage
      })
      
      // Agregar customer_data si está disponible
      if (pendingSubscription.customer_data) {
        updateData.customer_data = pendingSubscription.customer_data
      }
      
      // CRÍTICO: Preservar cart_items original
      if (pendingSubscription.cart_items) {
        updateData.cart_items = pendingSubscription.cart_items
      }
      
      console.log('💰 Datos de actualización completos:', updateData)
      console.log('🔍 Verificando campos críticos:', {
        user_id: updateData.user_id,
        product_name: updateData.product_name,
        discount_percentage: updateData.discount_percentage,
        transaction_amount: updateData.transaction_amount,
        customer_data: !!updateData.customer_data
      })
      
      // Actualizar suscripción a activa con toda la información
      const { data: newSubscription, error: createError } = await supabase
        .from("unified_subscriptions")
        .update(updateData)
        .eq("id", pendingSubscription.id)
        .select()
        .single()

      if (createError) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error actualizando suscripción a activa', createError.message, {
          userId: user.id,
          subscriptionId: pendingSubscription.id,
          externalReference: pendingSubscription.external_reference,
          errorCode: createError.code,
          errorDetails: createError.details,
          updateData: {
            productName: updateData.product_name,
            productId: updateData.product_id,
            transactionAmount: updateData.transaction_amount
          }
        })
        console.error("❌ ERROR: Error actualizando suscripción:", createError)
        throw createError
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción activada exitosamente con todos los campos', {
        userId: user.id,
        subscriptionId: newSubscription.id,
        productName: newSubscription.product_name,
        productId: newSubscription.product_id,
        transactionAmount: newSubscription.transaction_amount,
        subscriptionType: newSubscription.subscription_type,
        externalReference: newSubscription.external_reference
      })
      
      console.log("✅ ÉXITO: Suscripción activada con todos los campos:", newSubscription)
      return newSubscription
      
    } catch (error) {
      console.error("❌ ERROR: Error en activateSingleSubscriptionWithProduct:", error)
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

  // Función simplificada para manejar status=approved
  const activateApprovedSubscription = async (urlParams: URLSearchParams) => {
    const externalReference = urlParams.get('external_reference');
    
    console.info('🚀 ACTIVANDO SUSCRIPCIÓN APROBADA:', externalReference);
    
    if (!user?.id || !externalReference) {
      console.error('❌ Faltan datos requeridos:', { userId: user?.id, externalReference });
      return;
    }

    // IDEMPOTENCIA: Evitar múltiples ejecuciones simultáneas
    if (isProcessing) {
      console.log('🔄 Proceso ya en curso, evitando duplicación');
      return;
    }

    try {
      setIsProcessing(true);
      
      // PASO 1: Verificar si ya existe una suscripción activa
      const { data: existingActive, error: activeError } = await supabase
        .from("unified_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .or(`external_reference.eq.${externalReference},mercadopago_subscription_id.eq.${externalReference}`);

      if (activeError) {
        console.error("Error verificando suscripciones activas:", activeError);
        return;
      }

      if (existingActive && existingActive.length > 0) {
        console.log('✅ Ya existe una suscripción activa');
        toast({
          title: "Suscripción ya activa",
          description: "Tu suscripción ya está funcionando correctamente",
        });
        loadUserSubscriptions();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // PASO 2: Buscar el registro pendiente correcto
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
        .eq("user_id", user.id)
        .eq("status", "pending")
        .or(`external_reference.eq.${externalReference},external_reference.ilike.%${user.id}%`)
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error("Error buscando suscripciones pendientes:", pendingError);
        return;
      }

      if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
        console.error("❌ No se encontró suscripción pendiente para activar");
        toast({
          title: "Error",
          description: "No se encontró la suscripción para activar",
          variant: "destructive"
        });
        return;
      }

      // PASO 3: Encontrar el registro más completo
      const completeSubscription = pendingSubscriptions.find(sub => 
        sub.product_name && 
        sub.base_price && 
        parseFloat(sub.base_price) > 0 &&
        sub.customer_data && 
        sub.product_id &&
        sub.cart_items
      ) || pendingSubscriptions[0]; // Usar el más reciente si no hay completos

      console.log('📋 Registro seleccionado para activar:', {
        id: completeSubscription.id,
        product_name: completeSubscription.product_name,
        base_price: completeSubscription.base_price,
        external_reference: completeSubscription.external_reference
      });

      // PASO 4: Eliminar registros duplicados/incompletos del mismo usuario
      const otherSubscriptions = pendingSubscriptions.filter(sub => sub.id !== completeSubscription.id);
      if (otherSubscriptions.length > 0) {
        console.log('🗑️ Eliminando registros duplicados:', otherSubscriptions.length);
        const { error: deleteError } = await supabase
          .from('unified_subscriptions')
          .delete()
          .in('id', otherSubscriptions.map(sub => sub.id));
        
        if (deleteError) {
          console.error('❌ Error eliminando duplicados:', deleteError);
        } else {
          console.log('✅ Duplicados eliminados exitosamente');
        }
      }

      // PASO 5: Activar la suscripción seleccionada
      const updateData = {
        status: 'active',
        mercadopago_subscription_id: externalReference,
        processed_at: new Date().toISOString(),
        last_billing_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', completeSubscription.id);

      if (updateError) {
        console.error('❌ Error activando suscripción:', updateError);
        toast({
          title: "Error",
          description: "No se pudo activar la suscripción",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Suscripción activada exitosamente:', completeSubscription.id);
      
      // Actualizar perfil del usuario si es necesario
      if (completeSubscription.customer_data) {
        try {
          const customerData = typeof completeSubscription.customer_data === 'string' 
            ? JSON.parse(completeSubscription.customer_data) 
            : completeSubscription.customer_data;
          
          if (customerData.phone || customerData.address) {
            await updateUserProfile({
              phone: customerData.phone,
              address: customerData.address
            });
          }
        } catch (error) {
          console.error('Error actualizando perfil:', error);
        }
      }

      // Enviar email de bienvenida
      if (completeSubscription.customer_data) {
        try {
          const customerData = typeof completeSubscription.customer_data === 'string' 
            ? JSON.parse(completeSubscription.customer_data) 
            : completeSubscription.customer_data;
          
          await sendWelcomeEmail({
            email: customerData.email,
            firstName: customerData.firstName,
            productName: completeSubscription.product_name,
            subscriptionType: completeSubscription.subscription_type
          });
        } catch (error) {
          console.error('Error enviando email:', error);
        }
      }

      toast({
        title: "¡Suscripción Activada!",
        description: `Tu suscripción a ${completeSubscription.product_name} está activa`,
      });

      loadUserSubscriptions();
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error) {
      console.error("❌ ERROR CRÍTICO: Error activando suscripción approved:", error)
      toast({
        title: "Error",
        description: "No se pudo activar la suscripción",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const activatePendingSubscription = async (externalReference: string) => {
    if (!user?.id) return

    // IDEMPOTENCIA: Evitar múltiples ejecuciones simultáneas
    if (isProcessing) {
      console.log('🔄 IDEMPOTENCIA: Ya hay un proceso de activación en curso, evitando ejecución duplicada')
      return
    }

    try {
      setIsProcessing(true)
      console.log('🔍 Activando suscripción con external_reference:', externalReference)
      
      // PASO 1: Verificar si ya existe una suscripción activa con este external_reference
      const { data: existingActiveSubscriptions, error: activeError } = await supabase
        .from("unified_subscriptions")
        .select("*")
        .eq("external_reference", externalReference)
        .eq("status", "active")

      if (activeError) {
        console.error("Error verificando suscripciones activas:", activeError)
        loadUserSubscriptions()
        return
      }

      // Si ya existe una suscripción activa, no procesar duplicado
      if (existingActiveSubscriptions && existingActiveSubscriptions.length > 0) {
        console.log('✅ IDEMPOTENCIA: Ya existe una suscripción activa con external_reference:', externalReference)
        toast({
          title: "Suscripción ya activa",
          description: "Tu suscripción ya está activa y funcionando correctamente",
        })
        loadUserSubscriptions()
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      // PASO 2: Buscar y limpiar duplicados antes de activar
      const { data: allSubscriptions } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', externalReference)
        .order('created_at', { ascending: false })
      
      if (allSubscriptions && allSubscriptions.length > 1) {
        console.log('🗑️ Encontrados múltiples registros, limpiando duplicados:', allSubscriptions.length)
        
        // Mantener solo el más completo y reciente con validación robusta
        const completeSubscriptions = allSubscriptions.filter(sub => 
          sub.product_name && 
          sub.base_price && 
          sub.customer_data &&
          sub.user_id && // CRÍTICO: Verificar user_id
          sub.transaction_amount &&
          sub.cart_items
        )
        
        console.log('📊 Análisis de duplicados en pending:', {
          total: allSubscriptions.length,
          completos: completeSubscriptions.length,
          incompletos: allSubscriptions.length - completeSubscriptions.length,
          detalles: allSubscriptions.map(sub => ({
            id: sub.id,
            user_id: !!sub.user_id,
            product_name: !!sub.product_name,
            transaction_amount: !!sub.transaction_amount,
            customer_data: !!sub.customer_data,
            cart_items: !!sub.cart_items
          }))
        })
        
        const targetSubscription = completeSubscriptions.length > 0 
          ? completeSubscriptions[0] 
          : allSubscriptions[0]
        
        // Eliminar los demás
        const idsToDelete = allSubscriptions
          .filter(sub => sub.id !== targetSubscription.id)
          .map(sub => sub.id)
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('unified_subscriptions')
            .delete()
            .in('id', idsToDelete)
          
          if (deleteError) {
            console.error('❌ Error eliminando duplicados:', deleteError)
          } else {
            console.log('✅ Duplicados eliminados exitosamente:', idsToDelete.length)
          }
        }
      }
      
      // PASO 3: Buscar suscripción pendiente por external_reference con información del producto
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
        
        // Buscar cualquier suscripción pendiente del usuario para activar (con validación anti-duplicación)
        const { data: userPendingSubscriptions } = await supabase
          .from("unified_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (userPendingSubscriptions && userPendingSubscriptions.length > 0) {
          const subscription = userPendingSubscriptions[0]
          
          // Verificar que no exista ya una suscripción activa para este usuario con el mismo producto
          const { data: existingUserActive } = await supabase
            .from("unified_subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("product_id", subscription.product_id)
            .eq("status", "active")
          
          if (!existingUserActive || existingUserActive.length === 0) {
            console.log('✅ Encontrada suscripción pendiente del usuario, activando...')
            await activateSingleSubscriptionWithProduct(subscription)
            await updateUserProfile()
            await sendWelcomeEmail(subscription)
            
            toast({
              title: "¡Suscripción activada!",
              description: "Tu suscripción ha sido activada exitosamente",
            })
          } else {
            console.log('✅ IDEMPOTENCIA: Usuario ya tiene suscripción activa para este producto')
            toast({
              title: "Suscripción ya activa",
              description: "Ya tienes una suscripción activa para este producto",
            })
          }
        }
        
        loadUserSubscriptions()
        return
      }

      const pendingSubscription = pendingSubscriptions[0]
      console.log('✅ Suscripción encontrada:', pendingSubscription)
      
      // IDEMPOTENCIA: Verificar que no exista duplicación por producto
      if (pendingSubscription.product_id) {
        const { data: existingProductActive } = await supabase
          .from("unified_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", pendingSubscription.product_id)
          .eq("status", "active")
        
        if (existingProductActive && existingProductActive.length > 0) {
          console.log('✅ IDEMPOTENCIA: Usuario ya tiene suscripción activa para producto:', pendingSubscription.product_id)
          toast({
            title: "Suscripción ya activa",
            description: "Ya tienes una suscripción activa para este producto",
          })
          loadUserSubscriptions()
          window.history.replaceState({}, document.title, window.location.pathname)
          return
        }
      }
      
      console.log("🚀 PROCESANDO: Activando suscripción pendiente:", pendingSubscription)
      
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
      console.error("❌ ERROR: Error activando suscripción:", error)
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

  if (isLoading) {
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
                {isApproved ? (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      ¡Tu suscripción ha sido procesada exitosamente!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Tu suscripción Pet Gourmet está activa y lista. En unos momentos podrás ver todos los detalles.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      ¡Tu suscripción está siendo procesada!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Estamos activando tu suscripción. En unos momentos podrás ver todos los detalles de tu plan Pet Gourmet.
                    </p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  </>
                )}
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