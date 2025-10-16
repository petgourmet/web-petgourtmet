"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, CreditCard, Loader2, User, Lock } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import crypto from "crypto"
import { logger, LogCategory } from '@/lib/logger'
import { SubscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { makeExternalReference, makeExternalReferenceWithoutPreapproval } from '@/utils/external-reference-generator'

// Type definitions
interface Profile {
  id: string
  full_name?: string
  phone?: string
  shipping_address?: string | object
  [key: string]: any
}

interface ErrorLike {
  message?: string
  stack?: string
  name?: string
  [key: string]: any
}

// Extended CartItem type with additional properties
interface ExtendedCartItem {
  id: number
  name: string
  price: number
  image: string
  size: string
  quantity: number
  isSubscription: boolean
  subscriptionType?: string
  subscriptionDiscount?: number
  category?: string

  monthly_mercadopago_url?: string
  quarterly_mercadopago_url?: string
  annual_mercadopago_url?: string
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
}

// Instancia del servicio de deduplicación
const deduplicationService = SubscriptionDeduplicationService.getInstance()

// Helper functions for type-safe error handling
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Error desconocido'
}

const getErrorDetails = (error: unknown): ErrorLike => {
  if (error && typeof error === 'object') {
    return {
      message: 'message' in error ? String(error.message) : 'Error desconocido',
      stack: 'stack' in error ? String(error.stack) : undefined,
      name: 'name' in error ? String(error.name) : undefined
    }
  }
  return { message: 'Error desconocido' }
}

// Función para generar external_reference determinístico usando el generador oficial estandarizado
const generateDeterministicReference = (userId: string, planId: string, subscriptionType: string) => {
  return makeExternalReferenceWithoutPreapproval(userId, planId, subscriptionType)
}

// Función para validar registros existentes con múltiples criterios
const checkExistingSubscription = async (userId: string, planId: string, externalReference?: string) => {
  try {
    let query = supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'active', 'processing'])
      .order('created_at', { ascending: false })

    // Buscar por product_id O external_reference para detectar duplicados
    if (externalReference) {
      query = query.or(`product_id.eq.${planId},external_reference.eq.${externalReference}`)
    } else {
      query = query.eq('product_id', planId)
    }

    const { data: existingSubscriptions, error } = await query.limit(5)

    if (error) {
      console.error('Error checking existing subscriptions:', error)
      logger.error(LogCategory.SUBSCRIPTION, 'Error verificando suscripciones existentes', getErrorMessage(error), {
        userId,
        planId,
        externalReference
      })
      return null
    }

    return existingSubscriptions?.[0] || null
  } catch (error) {
    console.error('Error in checkExistingSubscription:', error)
    logger.error(LogCategory.SUBSCRIPTION, 'Error crítico en checkExistingSubscription', getErrorMessage(error), {
      userId,
      planId,
      externalReference
    })
    return null
  }
}

export function CheckoutModal() {
  const { cart, calculateCartTotal, setShowCheckout, clearCart, showCheckout } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
  const [userProfile, setUserProfile] = useState<any>(null)
  const [lastProcessTime, setLastProcessTime] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const DEBOUNCE_TIME = 3000 // 3 segundos de debounce mejorado



  // Estados para el formulario
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  const [shippingInfo, setShippingInfo] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "México",
  })



  // Cargar datos del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          // Obtener perfil del usuario
          const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          if (error) {
            console.error("Error al cargar el perfil del usuario:", getErrorDetails(error))
            return
          }

          if (profile) {
            setUserProfile(profile as Profile)

            // Autocompletar información del cliente si hay datos disponibles
            const typedProfile = profile as Profile
            if (typedProfile.full_name) {
              const nameParts = typedProfile.full_name.split(" ")
              setCustomerInfo({
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: user?.email || "",
                phone: typedProfile.phone || "",
              })
            } else if (user?.email) {
              // Si no hay perfil completo pero sí email del usuario
              setCustomerInfo(prev => ({
                ...prev,
                email: user.email || ""
              }))
            }

            // Autocompletar información de envío si existe
            if (typedProfile.shipping_address) {
              try {
                const address =
                  typeof typedProfile.shipping_address === "string"
                    ? JSON.parse(typedProfile.shipping_address)
                    : typedProfile.shipping_address

                setShippingInfo({
                  address: `${address.street_name} ${address.street_number}`,
                  city: address.city || "",
                  state: address.state || "",
                  postalCode: address.zip_code || "",
                  country: address.country || "México",
                })
              } catch (e) {
                console.error("Error al parsear la dirección de envío:", getErrorDetails(e))
              }
            }
          }
        } catch (error) {
          console.error("Error al cargar datos del usuario:", getErrorDetails(error))
        }
      }
    }

    loadUserProfile()
  }, [user])

  // Función para detectar si hay suscripciones en el carrito
  const hasSubscriptions = () => {
    return cart.some(item => item.isSubscription)
  }

  // Función para obtener el tipo de suscripción predominante
  const getSubscriptionType = () => {
    const subscriptionItems = cart.filter(item => item.isSubscription)
    if (subscriptionItems.length === 0) return null
    
    // Retornar el tipo de suscripción del primer item (se puede mejorar para manejar múltiples tipos)
    return subscriptionItems[0].subscriptionType || 'monthly'
  }

  // Función para obtener el enlace de suscripción según el tipo
  // Esta función ya no es necesaria con el nuevo sistema de suscripciones dinámicas
  // Las suscripciones se crean directamente a través del endpoint /api/subscriptions/create-dynamic

  // Función para obtener el descuento dinámico del producto según la frecuencia
  const getProductSubscriptionDiscount = (item: any, subscriptionType: string): number => {
    if (!item.isSubscription) return 0
    
    switch (subscriptionType) {
      case 'weekly':
        return (item.weekly_discount || 0) / 100
      case 'biweekly':
        return (item.biweekly_discount || 0) / 100
      case 'monthly':
        return (item.monthly_discount || 0) / 100
      case 'quarterly':
        return (item.quarterly_discount || 0) / 100
      case 'annual':
        return (item.annual_discount || 0) / 100
      default:
        return 0
    }
  }

  // Función auxiliar para obtener URL específica del producto
  const getProductSpecificUrl = (item: any, type: string) => {
    switch (type) {
      case 'weekly':
        return item.monthly_mercadopago_url
      case "biweekly":
        return item.monthly_mercadopago_url
      case 'monthly':
        return item.monthly_mercadopago_url
      case 'quarterly':
        return item.quarterly_mercadopago_url
      case 'annual':
        return item.annual_mercadopago_url
      default:
        return null
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    if (id === "firstName" || id === "lastName" || id === "email" || id === "phone") {
      setCustomerInfo((prev) => ({ ...prev, [id]: value }))
    } else {
      setShippingInfo((prev) => ({ ...prev, [id]: value }))
    }
  }

  // Función para simular un pago exitoso
  const simulateSuccessfulPayment = async (orderId: string) => {
    try {
      // En modo de prueba, simplemente retornamos true sin actualizar la base de datos
      // para evitar problemas de tipos con Supabase
      console.log(`Simulando pago exitoso para orden: ${orderId}`)
      return true
    } catch (error) {
      console.error("Error en simulateSuccessfulPayment:", getErrorDetails(error))
      return false
    }
  }

  const handleCreateOrder = async () => {
    // Limpiar error previo
    setError(null)

    // Verificar términos y condiciones
    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones para continuar")
      return
    }

    // Validación básica del formulario
    if (!customerInfo.firstName.trim()) {
      setError("Por favor ingresa tu nombre")
      return
    }

    if (!customerInfo.lastName.trim()) {
      setError("Por favor ingresa tus apellidos")
      return
    }

    if (!customerInfo.email.trim()) {
      setError("Por favor ingresa tu email")
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerInfo.email)) {
      setError("Por favor ingresa un email válido")
      return
    }

    if (!customerInfo.phone.trim()) {
      setError("Por favor ingresa tu teléfono")
      return
    }

    if (!shippingInfo.address.trim()) {
      setError("Por favor ingresa tu dirección")
      return
    }

    if (!shippingInfo.city.trim()) {
      setError("Por favor ingresa tu ciudad")
      return
    }

    if (!shippingInfo.state.trim()) {
      setError("Por favor ingresa tu provincia")
      return
    }

    if (!shippingInfo.postalCode.trim()) {
      setError("Por favor ingresa tu código postal")
      return
    }

    // Implementar debounce mejorado para evitar múltiples clics
    const currentTime = Date.now()
    
    // Verificar si ya está procesando
    if (isProcessing) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Intento de procesamiento bloqueado - ya procesando', {
        userId: user?.id,
        isProcessing: true
      })
      setError("Ya se está procesando tu solicitud. Por favor espera.")
      return
    }
    
    // Verificar debounce time
    if (currentTime - lastProcessTime < DEBOUNCE_TIME) {
      const remainingTime = Math.ceil((DEBOUNCE_TIME - (currentTime - lastProcessTime)) / 1000)
      logger.warn(LogCategory.SUBSCRIPTION, 'Intento de procesamiento bloqueado por debounce', {
        timeSinceLastProcess: currentTime - lastProcessTime,
        debounceTime: DEBOUNCE_TIME,
        remainingTime,
        userId: user?.id
      })
      setError(`Por favor espera ${remainingTime} segundos antes de intentar nuevamente.`)
      return
    }
    
    // Marcar como procesando y actualizar tiempo
    setLastProcessTime(currentTime)
    setIsProcessing(true)
    setIsLoading(true)
    
    logger.info(LogCategory.SUBSCRIPTION, 'Iniciando procesamiento de checkout', {
      userId: user?.id,
      hasSubscriptions: hasSubscriptions(),
      cartItems: cart.length,
      externalReference: hasSubscriptions() && user ? generateDeterministicReference(user.id, String(cart.find(item => item.isSubscription)?.id || 'unknown'), getSubscriptionType() || 'monthly') : 'N/A'
    })

    try {
      console.log("Creando orden...")

      // Calcular el total
      const subtotal = calculateCartTotal()
      const shipping = subtotal >= 1000 ? 0 : 100 // Envío gratis por compras mayores a $1000 MXN
      const total = subtotal + shipping

      // Generar un número de orden único
      const orderNumber = `PG-${Date.now().toString().slice(-6)}`

      // Preparar la dirección de envío como JSON
      const shippingAddress = JSON.stringify({
        street_name: shippingInfo.address.split(" ").slice(0, -1).join(" ") || shippingInfo.address,
        street_number: shippingInfo.address.split(" ").pop() || "0",
        zip_code: shippingInfo.postalCode,
        city: shippingInfo.city,
        state: shippingInfo.state,
        country: shippingInfo.country,
      })

      // TODO: Remover esta sección que crea orden duplicada
      // Solo mantener el flujo de MercadoPago que ya crea la orden completa
      /*
      // Usar la API route para crear el pedido (evita problemas de RLS)
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          total: total,
          status: "pending",
          user_id: user?.id || null,
          items: cart.map((item) => {
            let finalPrice = item.price
            
            if (item.isSubscription) {
              const subscriptionType = item.subscriptionType || getSubscriptionType() || 'monthly'
              const discount = getProductSubscriptionDiscount(item, subscriptionType)
              finalPrice = item.price * (1 - discount)
            }
            
            return {
              product_id: item.id,
              quantity: item.quantity,
              price: finalPrice,
            }
          }),
          metadata: {
            customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            customer_phone: customerInfo.phone,
            shipping_address: shippingAddress,
            order_number: orderNumber,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear el pedido")
      }

      const { orderId } = await response.json()
      */

      // Verificar si hay suscripciones en el carrito
      const hasSubscriptionItems = hasSubscriptions()
      const subscriptionType = getSubscriptionType()

      // Variable para controlar si se debe continuar con el procesamiento
      let shouldContinueProcessing = true
      let externalReference = `${orderNumber}_${Date.now()}`
      
      if (hasSubscriptionItems && user) {
        const userId = user.id
        const planId = String(cart.find(item => item.isSubscription)?.id || 'unknown')
        const subscriptionItem = cart.find(item => item.isSubscription)
        
        // Usar el servicio de deduplicación para validación robusta
        const validationResult = await deduplicationService.validateBeforeCreate({
          userId,
          planId,
          amount: subscriptionItem?.price,
          currency: 'MXN',
          additionalData: { subscriptionType: subscriptionType || 'monthly' }
        })
        
        logger.info(LogCategory.SUBSCRIPTION, 'Resultado de validación de deduplicación', {
          userId,
          planId,
          isValid: validationResult.isValid,
          reason: validationResult.reason,
          existingSubscriptionStatus: validationResult.existingSubscription?.status
        })
        
        if (!validationResult.isValid) {
          // VALIDACIÓN CRÍTICA MEJORADA: Verificar suscripciones activas ANTES de proceder
          if (validationResult.existingSubscription?.status === 'active') {
            const activeSub = validationResult.existingSubscription
            const createdDate = new Date(activeSub.created_at).toLocaleDateString('es-ES')
            
            logger.warn(LogCategory.SUBSCRIPTION, 'Suscripción activa detectada - bloqueando creación', {
              userId,
              productId: planId,
              activeSubscriptionId: activeSub.id,
              createdDate
            })

            setError(`Ya tienes una suscripción activa para este producto (creada el ${createdDate}). Puedes gestionar tus suscripciones desde tu perfil.`)
            
            // Redirigir a la página de suscripciones después de un delay
            setTimeout(() => {
              router.push('/suscripcion')
            }, 3000)
            
            return
          }

          // Para suscripciones pendientes, limpiar duplicadas antes de continuar
          if (validationResult.existingSubscription?.status === 'pending') {
            try {
              const cleanupResponse = await fetch('/api/subscriptions/cleanup-pending', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: userId,
                  product_id: planId,
                  keep_latest: false // Eliminar todas las pendientes para empezar limpio
                })
              })

              if (cleanupResponse.ok) {
                const cleanupResult = await cleanupResponse.json()
                if (cleanupResult.cleaned_count > 0) {
                  logger.info(LogCategory.SUBSCRIPTION, 'Suscripciones pendientes limpiadas antes de crear nueva', {
                    userId,
                    productId: planId,
                    cleanedCount: cleanupResult.cleaned_count
                  })
                  console.log(`✅ Se limpiaron ${cleanupResult.cleaned_count} suscripciones pendientes duplicadas`)
                }
              }
            } catch (cleanupError) {
              logger.warn(LogCategory.SUBSCRIPTION, 'Error en limpieza de suscripciones pendientes', cleanupError instanceof Error ? cleanupError.message : 'Error desconocido', {
                userId,
                productId: planId
              })
            }
          } else {
            // Para otros tipos de error de validación
            logger.warn(LogCategory.SUBSCRIPTION, 'Validación de deduplicación falló', {
              userId,
              planId,
              reason: validationResult.reason,
              externalReference: validationResult.externalReference
            })
            
            setError(validationResult.reason || 'Error en validación de suscripción')
            return
          }
        }
        
        // CONTINUAR CON PROCESAMIENTO NORMAL DESPUÉS DE VALIDACIÓN EXITOSA
        // Generar external_reference único para evitar conflictos
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        externalReference = `${userId}_${planId}_${subscriptionType}_${timestamp}_${randomSuffix}`
        
        logger.info(LogCategory.SUBSCRIPTION, 'Generando nueva suscripción con external_reference único', {
          userId,
          planId,
          subscriptionType,
          externalReference,
          timestamp
        })
      }

      // Si hay suscripciones, redirigir al enlace de suscripción de Mercado Pago
      // Las suscripciones SIEMPRE redirigen a MercadoPago (sandbox en modo prueba, producción en modo normal)
      if (hasSubscriptionItems && subscriptionType) {
        console.log("Procesando suscripción con tipo:", subscriptionType)
        
        // Validar que el usuario esté autenticado para suscripciones
        if (!user) {
          setError("Debes iniciar sesión para crear una suscripción")
          return
        }

        // Validar que solo haya una suscripción en el carrito
        const subscriptionItems = cart.filter(item => item.isSubscription)
        logger.info(LogCategory.SUBSCRIPTION, 'Validando carrito de suscripción', {
          totalItems: cart.length,
          subscriptionItems: subscriptionItems.length,
          userId: user.id,
          externalReference
        })
        
        if (subscriptionItems.length > 1) {
          logger.warn(LogCategory.SUBSCRIPTION, 'Múltiples suscripciones detectadas en carrito', {
            subscriptionCount: subscriptionItems.length,
            userId: user.id
          })
          setError("Solo puedes procesar una suscripción por vez. Por favor, mantén solo un producto de suscripción en tu carrito.")
          return
        }

        // Crear registro de suscripción en la base de datos con todos los campos obligatorios
        try {
          const subscriptionItem = cart.find(item => item.isSubscription) as ExtendedCartItem
          if (!subscriptionItem) {
            logger.error(LogCategory.SUBSCRIPTION, 'No se encontró producto de suscripción en carrito', undefined, {
              cartItems: cart.length,
              userId: user.id,
              externalReference
            })
            setError("No se encontró producto de suscripción en el carrito")
            return
          }
          
          logger.info(LogCategory.SUBSCRIPTION, 'Producto de suscripción encontrado', {
            productId: subscriptionItem.id,
            productName: subscriptionItem.name,
            subscriptionType,
            userId: user.id,
            externalReference
          })

          // Calcular precio con descuento CORRECTAMENTE
          // El subscriptionItem.price ya viene con descuento aplicado desde el carrito
          // Necesitamos calcular el precio base original para mostrar el descuento correctamente
          const discount = getProductSubscriptionDiscount(subscriptionItem, subscriptionType)
          
          // Si hay descuento, el precio actual ya está descontado, calculamos el precio base original
          let basePrice: number
          let discountedPrice: number
          
          if (discount > 0) {
            // El precio actual ya tiene descuento aplicado, calculamos el precio original
            basePrice = subscriptionItem.price / (1 - discount)
            discountedPrice = subscriptionItem.price // Ya viene con descuento
          } else {
            // Sin descuento, el precio es el mismo
            basePrice = subscriptionItem.price
            discountedPrice = subscriptionItem.price
          }
          
          const discountPercentage = discount * 100
          const transactionAmount = discountedPrice * subscriptionItem.quantity

          // Calcular frequency y frequency_type basado en subscription_type
          let frequency = 1
          let frequency_type = 'months'
          
          switch (subscriptionType) {
            case 'monthly':
              frequency = 1
              frequency_type = 'months'
              break
            case 'quarterly':
              frequency = 3
              frequency_type = 'months'
              break
            case 'annual':
              frequency = 12
              frequency_type = 'months'
              break
            case 'biweekly':
              frequency = 2
              frequency_type = 'weeks'
              break
            default:
              frequency = 1
              frequency_type = 'months'
          }

          const currentDate = new Date()
          const startDate = currentDate.toISOString()
          
          // Calcular next_billing_date basado en frequency
          const nextBillingDate = new Date(currentDate)
          if (frequency_type === 'months') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + frequency)
          } else if (frequency_type === 'weeks') {
            nextBillingDate.setDate(nextBillingDate.getDate() + (frequency * 7))
          }

          const subscriptionData = {
            user_id: user.id,
            product_id: subscriptionItem.id,
            product_name: subscriptionItem.name,
            product_image: subscriptionItem.image,
            subscription_type: subscriptionType,
            status: 'pending',
            external_reference: externalReference,
            base_price: basePrice,
            discounted_price: discountedPrice,
            discount_percentage: discountPercentage,
            transaction_amount: transactionAmount,
            size: subscriptionItem.size || 'Standard',
            quantity: subscriptionItem.quantity,
            frequency: frequency,
            frequency_type: frequency_type,
            currency_id: 'MXN',
            start_date: startDate,
            next_billing_date: nextBillingDate.toISOString(),
            back_url: `${window.location.origin}/suscripcion`,
            reason: `Suscripción ${subscriptionType} - ${subscriptionItem.name} (${subscriptionItem.size || 'Standard'})`,
            version: 1,
            collector_id: null, // Se asignará desde MercadoPago
            charges_made: 0, // Inicializar en 0
            application_id: null, // Se asignará desde MercadoPago
            preapproval_plan_id: null, // Se asignará si se usa plan
            init_point: null, // Se asignará desde MercadoPago
            end_date: null, // Suscripción sin fecha de fin por defecto
            mercadopago_subscription_id: null, // Se asignará desde webhook
            // ELIMINADO: mercadopago_plan_id ya no se usa en el nuevo sistema
            // mercadopago_plan_id: null, // Se asignará si se usa plan
            last_billing_date: null, // Se actualizará con el primer pago
            cancelled_at: null,
            paused_at: null,
            resumed_at: null,
            expired_at: null,
            suspended_at: null,
            last_sync_at: null,
            processed_at: new Date().toISOString(),
            free_trial: null, // Sin trial por defecto
            notes: `Suscripción creada desde checkout - ${subscriptionType}`,
            metadata: {
              subscription_type: subscriptionType,
              product_category: (subscriptionItem as any).category || 'pet-food',
              discount_applied: discountPercentage > 0,
              original_price: basePrice,
              final_price: discountedPrice,
              size: subscriptionItem.size || 'Standard',
              created_from: 'checkout_modal',
              user_agent: navigator.userAgent,
              timestamp: currentDate.toISOString(),
              billing_cycle: `${frequency} ${frequency_type}`,
              product_details: {
                id: subscriptionItem.id,
                name: subscriptionItem.name,
                image: subscriptionItem.image,
                category: (subscriptionItem as any).category || 'pet-food'
              }
            },
            customer_data: {
              firstName: customerInfo.firstName,
              lastName: customerInfo.lastName,
              email: user.email,
              phone: customerInfo.phone,
              address: shippingAddress
            },
            cart_items: cart.map(item => ({
              product_id: item.id,
              product_name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              isSubscription: item.isSubscription,
              subscriptionType: item.subscriptionType
            }))
          }

          logger.info(LogCategory.SUBSCRIPTION, 'Creando registro de suscripción pendiente', {
            userId: user.id,
            productId: subscriptionItem.id,
            productName: subscriptionItem.name,
            subscriptionType,
            externalReference,
            transactionAmount,
            basePrice,
            discountedPrice,
            discountPercentage
          })
          
          console.log('Datos completos de suscripción:', subscriptionData)

          // Logging detallado antes del upsert
          logger.info(LogCategory.SUBSCRIPTION, 'Realizando upsert en unified_subscriptions', {
            userId: user.id,
            externalReference,
            tableName: 'unified_subscriptions',
            conflictColumns: 'user_id,product_id,external_reference'
          })

          // Crear nueva suscripción pendiente (las validaciones previas ya evitaron duplicados activos)
          const insertResult = await supabase
            .from('unified_subscriptions')
            .insert(subscriptionData as any)
            .select()

          const insertedData = insertResult.data
          const subscriptionError = insertResult.error

          // Logging después del upsert
          if (!subscriptionError && insertedData) {
            logger.info(LogCategory.SUBSCRIPTION, 'Upsert exitoso en unified_subscriptions', {
              userId: user.id,
              externalReference,
              recordsAffected: insertedData.length,
              operation: 'upsert_completed'
            })
          }

          if (subscriptionError) {
            logger.error(LogCategory.SUBSCRIPTION, 'Error procesando suscripción', subscriptionError, {
              userId: user.id,
              externalReference,
              errorCode: subscriptionError.code,
              errorDetails: subscriptionError.details,
              errorHint: subscriptionError.hint,
              operation: 'insert',
              subscriptionData: {
                productId: subscriptionItem.id,
                productName: subscriptionItem.name,
                subscriptionType,
                transactionAmount
              }
            })
            
            console.error('Error al procesar suscripción:', getErrorDetails(subscriptionError))
            
            // Manejo específico de errores
            let errorMessage = 'Error al procesar la suscripción. Por favor, inténtalo de nuevo.'
            
            if (subscriptionError.code === '23503') {
              errorMessage = 'Error de datos. Por favor, verifica tu información e inténtalo de nuevo.'
            } else if (subscriptionError.message?.includes('permission')) {
              errorMessage = 'Error de permisos. Por favor, inicia sesión nuevamente.'
            }
            
            setError(errorMessage)
            
            toast({
              title: "Error al procesar suscripción",
              description: errorMessage,
              variant: "destructive"
            })
            
            return
          }

          logger.info(LogCategory.SUBSCRIPTION, 'Suscripción pendiente guardada exitosamente', {
            subscriptionId: (insertedData as any)?.[0]?.id,
            userId: user.id,
            externalReference,
            productId: subscriptionItem.id,
            productName: subscriptionItem.name,
            subscriptionType,
            transactionAmount
          })
          
          console.log('✅ Suscripción pendiente guardada exitosamente:', insertedData)

          // Mostrar mensaje de confirmación
          toast({
            title: "Suscripción guardada",
            description: "Tu suscripción ha sido registrada. Redirigiendo a Mercado Pago...",
            duration: 2000,
          })

          // Esperar un momento para asegurar que la suscripción se guardó
          await new Promise(resolve => setTimeout(resolve, 1500))

          // Validar que tenemos el ID de la suscripción
          if (!insertedData || insertedData.length === 0 || !(insertedData as any)[0]?.id) {
            logger.error(LogCategory.SUBSCRIPTION, 'No se obtuvo ID de suscripción después de guardar', {
              userId: user.id,
              externalReference,
              insertedData
            })
            
            toast({
              title: "Error al procesar suscripción",
              description: "No se pudo crear la suscripción. Inténtalo de nuevo.",
              variant: "destructive"
            })
            return
          }

          const subscriptionId = (insertedData as any)[0].id

          // FLUJO CORRECTO: Crear preferencia de pago normal (NO preapproval)
          // El preapproval se creará en MercadoPago solo después de confirmar el pago vía webhook
          console.log('🔄 Creando preferencia de pago para suscripción')
          
          logger.info(LogCategory.SUBSCRIPTION, 'Creando preferencia de pago para suscripción', {
            userId: user.id,
            externalReference,
            subscriptionType,
            subscriptionId,
            transactionAmount
          })

          try {
            // Crear preferencia de pago normal con metadata de suscripción
            const preferenceResponse = await fetch('/api/mercadopago/create-preference', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: subscriptionId,
                userId: user.id, // Agregar userId para auto-asignación
                items: [{
                  id: String(subscriptionItem.id),
                  title: `${subscriptionItem.name} - Suscripción ${subscriptionType}`,
                  description: `Primer pago de suscripción ${subscriptionType}`,
                  quantity: subscriptionItem.quantity,
                  unit_price: discountedPrice,
                  currency_id: 'MXN'
                }],
                // Enviar customerData en formato esperado por el endpoint
                customerData: {
                  firstName: customerInfo.firstName,
                  lastName: customerInfo.lastName,
                  email: user.email,
                  phone: customerInfo.phone,
                  address: {
                    street_name: shippingInfo.address.split(' ').slice(0, -1).join(' ') || shippingInfo.address,
                    street_number: shippingInfo.address.split(' ').pop() || 'S/N',
                    zip_code: shippingInfo.postalCode,
                    city: shippingInfo.city,
                    state: shippingInfo.state,
                    country: shippingInfo.country || 'México'
                  }
                },
                externalReference: externalReference,
                backUrls: {
                  success: `${window.location.origin}/suscripcion/exito`,
                  failure: `${window.location.origin}/error-pago`,
                  pending: `${window.location.origin}/pago-pendiente`
                },
                metadata: {
                  // Metadata crítica para que el webhook identifique que es una suscripción
                  is_subscription: true,
                  subscription_id: subscriptionId,
                  subscription_type: subscriptionType,
                  frequency: frequency,
                  frequency_type: frequency_type,
                  user_id: user.id,
                  product_id: subscriptionItem.id,
                  first_payment: true // Indica que es el primer pago de la suscripción
                }
              })
            })

            if (!preferenceResponse.ok) {
              const errorData = await preferenceResponse.json()
              console.error('❌ Error creando preferencia de pago:', errorData)
              
              logger.error(LogCategory.SUBSCRIPTION, 'Error en API de preferencia de pago', errorData.error, {
                userId: user.id,
                externalReference,
                statusCode: preferenceResponse.status,
                errorDetails: errorData
              })
              
              toast({
                title: "Error al procesar pago",
                description: "No se pudo crear la preferencia de pago. Inténtalo de nuevo.",
                variant: "destructive"
              })
              return
            }

            const preferenceData = await preferenceResponse.json()
            
            // Extraer init_point (camelCase o snake_case)
            const initPoint = preferenceData.sandboxInitPoint || preferenceData.initPoint || 
                             preferenceData.sandbox_init_point || preferenceData.init_point
            
            logger.info(LogCategory.SUBSCRIPTION, 'Preferencia de pago creada exitosamente', {
              userId: user.id,
              preferenceId: preferenceData.preferenceId || preferenceData.id,
              init_point: initPoint,
              externalReference
            })

            console.log('✅ Preferencia de pago creada correctamente:', {
              preference_id: preferenceData.preferenceId || preferenceData.id,
              init_point: initPoint,
              sandboxInitPoint: preferenceData.sandboxInitPoint,
              initPoint: preferenceData.initPoint
            })

            // Verificar si hay init_point para redirigir a MercadoPago
            if (initPoint) {
              console.log('🔄 Redirigiendo a MercadoPago para completar el pago:', initPoint)
              
              logger.info(LogCategory.SUBSCRIPTION, 'Iniciando redirección a MercadoPago', {
                userId: user.id,
                subscriptionId,
                init_point: initPoint,
                externalReference
              })
              
              // Limpiar carrito antes de redirigir
              clearCart()
              setShowCheckout(false)
              
              // Mostrar mensaje de redirección
              toast({
                title: "Redirigiendo a MercadoPago",
                description: "Te estamos llevando a completar tu pago...",
                duration: 3000,
              })
              
              // Pequeño delay para asegurar que el toast se muestre
              setTimeout(() => {
                console.log('🚀 Ejecutando redirección a:', initPoint)
                window.location.href = initPoint
              }, 500)
              
              return
            } else {
              // Si no hay init_point, algo salió mal
              console.error('⚠️ Preferencia creada sin init_point')
              
              logger.error(LogCategory.SUBSCRIPTION, 'Preferencia creada sin init_point', undefined, {
                userId: user.id,
                preferenceData,
                externalReference
              })
              
              toast({
                title: "Error de configuración",
                description: "No se pudo generar el enlace de pago. Contacta a soporte.",
                variant: "destructive"
              })
              
              return
            }

          } catch (apiError: any) {
            const errorDetails = getErrorDetails(apiError)
            
            logger.error(LogCategory.SUBSCRIPTION, 'Error crítico en API de preferencia de pago', errorDetails.message, {
              userId: user.id,
              externalReference,
              errorStack: errorDetails.stack
            })
            
            console.error('❌ Error en API de preferencia de pago:', errorDetails)
            
            toast({
              title: "Error al procesar pago",
              description: "Error de conexión con el servidor. Inténtalo de nuevo.",
              variant: "destructive"
            })
            return
          }
        } catch (error) {
          const errorDetails = getErrorDetails(error)
          logger.error(LogCategory.SUBSCRIPTION, 'Error crítico procesando suscripción', errorDetails.message, {
            userId: user.id,
            externalReference,
            subscriptionType,
            errorStack: errorDetails.stack,
            errorName: errorDetails.name,
            cartItems: cart.length
          })
          
          console.error('Error al procesar suscripción:', errorDetails)
          
          const errorMessage = errorDetails.message || 'Error al procesar la suscripción. Por favor, inténtalo de nuevo.'
          setError(errorMessage)
          
          toast({
            title: "Error al procesar suscripción",
            description: errorMessage,
            variant: "destructive"
          })
          
          return // Salir completamente de la función en caso de error
        }
      }

      // Si llegamos aquí, NO hay suscripciones en el carrito, proceder con orden normal

      if (isTestMode && !hasSubscriptionItems) {
        // En modo de pruebas, crear orden usando el endpoint de MercadoPago
        // pero sin redirección real - SOLO para productos normales, NO suscripciones
        console.log("Modo de pruebas: Creando orden completa para productos normales...")

        // Preparar los datos como se haría para MercadoPago
        const items = cart.map((item) => {
          let finalPrice = item.price
          
          // No debería haber suscripciones aquí, pero por seguridad
          if (item.isSubscription) {
            const subscriptionType = item.subscriptionType || getSubscriptionType() || 'monthly'
            const discount = getProductSubscriptionDiscount(item, subscriptionType)
            finalPrice = item.price * (1 - discount)
          }
          
          return {
            id: item.id,
            name: item.name,
            title: item.name,
            description: `${item.size || "Standard"}${item.isSubscription ? " (Suscripción)" : ""}`,
            image: item.image,
            picture_url: item.image,
            quantity: item.quantity,
            price: finalPrice,
            unit_price: finalPrice,
          }
        })

        const customerData = {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: {
            street_name: shippingInfo.address.split(" ").slice(0, -1).join(" ") || shippingInfo.address,
            street_number: shippingInfo.address.split(" ").pop() || "0",
            zip_code: shippingInfo.postalCode,
            city: shippingInfo.city,
            state: shippingInfo.state,
            country: shippingInfo.country,
          },
        }

        // Crear preferencia de prueba que guardará la orden
        const testResponse = await fetch("/api/mercadopago/create-preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items,
            customerData,
            externalReference,
            backUrls: {
              success: `${window.location.origin}/processing-payment`,
              failure: `${window.location.origin}/error-pago`,
              pending: `${window.location.origin}/pago-pendiente`,
            },
            testMode: true, // Indicar que es modo de prueba
          }),
        })

        const testData = await testResponse.json()
        if (!testResponse.ok) {
          throw new Error(testData.error || "Error al crear orden de prueba")
        }

        console.log("Orden de prueba creada:", testData)

        // Simular pago exitoso
        if (testData.orderId) {
          await simulateSuccessfulPayment(testData.orderId)
        }

        // Limpiar el carrito
        clearCart()

        // Mostrar mensaje de éxito
        toast({
          title: "¡Compra simulada con éxito!",
          description: `Tu pedido ha sido procesado en modo de pruebas.`,
          duration: 5000,
        })

        // Redirigir a la página de agradecimiento
        router.push(`/gracias-por-tu-compra?order_id=${testData.orderId || 'test'}`)

      } else if (!hasSubscriptionItems) {
        // En modo normal, crear preferencia de pago en Mercado Pago - SOLO para productos normales
        console.log("Creando preferencia de pago en Mercado Pago para productos normales...")

        // Preparar los datos para la API
        const items = cart.map((item) => {
          let finalPrice = item.price
          
          // No debería haber suscripciones aquí, pero por seguridad
          if (item.isSubscription) {
            const subscriptionType = item.subscriptionType || getSubscriptionType() || 'monthly'
            const discount = getProductSubscriptionDiscount(item, subscriptionType)
            finalPrice = item.price * (1 - discount)
          }
          
          return {
            id: item.id,
            name: item.name,
            title: item.name,
            description: `${item.size || "Standard"}${item.isSubscription ? " (Suscripción)" : ""}`,
            image: item.image,
            picture_url: item.image,
            quantity: item.quantity,
            price: finalPrice,
            unit_price: finalPrice,
          }
        })

        const customerData = {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: {
            street_name: shippingInfo.address.split(" ").slice(0, -1).join(" ") || shippingInfo.address,
            street_number: shippingInfo.address.split(" ").pop() || "0",
            zip_code: shippingInfo.postalCode,
            city: shippingInfo.city,
            state: shippingInfo.state,
            country: shippingInfo.country,
          },
        }

        // Llamar a la API para crear la preferencia
        const mpResponse = await fetch("/api/mercadopago/create-preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items,
            customerData,
            externalReference,
            backUrls: {
              success: `${window.location.origin}/processing-payment`,
              failure: `${window.location.origin}/error-pago`,
              pending: `${window.location.origin}/pago-pendiente`,
            },
          }),
        })

        const mpData = await mpResponse.json()

        if (!mpResponse.ok) {
          // Si hay errores de validación específicos, mostrarlos
          if (mpData.details && Array.isArray(mpData.details)) {
            const validationErrors = mpData.details.join('\n• ')
            throw new Error(`Por favor corrige los siguientes errores:\n• ${validationErrors}`)
          }
          throw new Error(mpData.error || "Error al crear la preferencia de pago")
        }

        console.log("Preferencia creada:", mpData)

        // Limpiar el carrito antes de redirigir al SDK de MercadoPago
        clearCart()

        // Cerrar el modal antes de la redirección
        setShowCheckout(false)

        // Redirigir al usuario a la página de pago de Mercado Pago
        if (mpData.initPoint) {
          // Agregar un pequeño delay para asegurar que el estado se actualice
          setTimeout(() => {
            window.location.href = mpData.initPoint
          }, 100)
        } else {
          throw new Error("No se recibió la URL de pago de Mercado Pago")
        }
      }
    } catch (error) {
      console.error("Error al procesar el pedido:", error)
      
      const errorDetails = getErrorDetails(error)
      logger.error(LogCategory.SUBSCRIPTION, 'Error general en procesamiento de checkout', errorDetails.message, {
        userId: user?.id,
        hasSubscriptions: hasSubscriptions(),
        cartItems: cart.length,
        errorStack: errorDetails.stack,
        errorName: errorDetails.name
      })
      
      setError(
        errorDetails.message || "Ha ocurrido un error al procesar tu pedido. Por favor, inténtalo de nuevo."
      );
      
      toast({
        title: "Error al procesar pedido",
        description: errorDetails.message || "Error desconocido",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsProcessing(false)
      
      logger.info(LogCategory.SUBSCRIPTION, 'Finalizando procesamiento de checkout', {
        userId: user?.id,
        isLoading: false,
        isProcessing: false
      })
    }
  }

  if (!showCheckout) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary font-display">Finalizar Compra</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowCheckout(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {user && (
            <div className="mb-6 p-4 bg-primary/10 rounded-lg flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              <p className="text-sm">
                Comprando como <span className="font-medium">{user.email}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Información de Envío</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      placeholder="Tu nombre"
                      value={customerInfo.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellidos</Label>
                    <Input
                      id="lastName"
                      placeholder="Tus apellidos"
                      value={customerInfo.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={customerInfo.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="Tu teléfono"
                    value={customerInfo.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Calle y número"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      placeholder="Tu ciudad"
                      value={shippingInfo.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input
                      id="postalCode"
                      placeholder="12345"
                      value={shippingInfo.postalCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="Tu estado"
                    value={shippingInfo.state}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Resumen del Pedido</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                <div className="space-y-3 mb-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <div className="text-sm text-gray-500">
                          {item.size} x {item.quantity}
                          {item.isSubscription && " (Suscripción)"}
                        </div>
                      </div>
                      <div className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)} MXN
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>${calculateCartTotal().toFixed(2)} MXN</span>
                  </div>
                  
                  {/* Mensaje de envío gratis */}
                   {calculateCartTotal() < 1000 && (
                     <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                       <div className="text-center">
                         <p className="text-sm text-primary font-medium">
                           🚚 ¡Envío GRATIS en compras mayores a $1,000 MXN!
                         </p>
                         <p className="text-xs text-primary/80">
                           Te faltan ${(1000 - calculateCartTotal()).toFixed(2)} MXN
                         </p>
                       </div>
                     </div>
                   )}
                  
                  {calculateCartTotal() >= 1000 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="text-center">
                        <p className="text-sm text-green-700 font-medium">
                          ✅ ¡Felicidades! Tu envío es GRATIS
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between mb-2">
                    <span>Envío</span>
                    <span>{calculateCartTotal() >= 1000 ? "Gratis" : "$100.00 MXN"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4">
                    <span>Total</span>
                    <span>
                      $
                      {(
                        calculateCartTotal() +
                        (calculateCartTotal() >= 1000 ? 0 : 100)
                      ).toFixed(2)}{" "}
                      MXN
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms">Acepto los términos y condiciones</Label>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-display disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCreateOrder}
                  disabled={isLoading || isProcessing}
                >
                  {isLoading || isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                      {isProcessing ? "Procesando solicitud..." : "Procesando..."}
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />{" "}
                      {isTestMode ? "Finalizar compra (Modo prueba)" : "Continuar al pago"}
                    </>
                  )}
                </Button>
                
                {(isLoading || isProcessing) && (
                  <div className="text-center text-sm text-gray-600 mt-2">
                    <p>⏳ Por favor no cierres esta ventana ni hagas clic nuevamente</p>
                  </div>
                )}

                {isTestMode && !hasSubscriptions() && (
                  <p className="text-sm text-center text-amber-600 font-medium">
                    Modo de pruebas activado. Se simulará un pago exitoso.
                  </p>
                )}
                
                {isTestMode && hasSubscriptions() && (
                  <p className="text-sm text-center text-blue-600 font-medium">
                    Modo de pruebas activado. Serás redirigido a MercadoPago sandbox para completar la suscripción con tarjetas de prueba.
                  </p>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="text-red-800 text-sm">
                      {error.includes('•') ? (
                        <div>
                          <div className="font-medium mb-2">Por favor corrige los siguientes errores:</div>
                          <ul className="space-y-1">
                            {error.split('\n').filter(line => line.includes('•')).map((line, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-600 mr-2">•</span>
                                <span>{line.replace('• ', '')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-center">{error}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-gray-500">
                  <div className="flex justify-center items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    <p>Pago seguro garantizado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
