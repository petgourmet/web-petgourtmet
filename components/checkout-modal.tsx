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
  weekly_mercadopago_url?: string
  biweekly_mercadopago_url?: string
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

// Función para generar external_reference determinístico (mantenida para compatibilidad)
const generateDeterministicReference = (userId: string, planId: string, subscriptionType: string) => {
  return deduplicationService.generateDeterministicReference({
    userId,
    planId,
    additionalData: { subscriptionType }
  })
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

  // Cargar URLs de suscripción dinámicamente
  useEffect(() => {
    const loadSubscriptionUrls = async () => {
      try {
        const response = await fetch('/api/subscription-urls')
        const data = await response.json()
        
        if (data.success && data.subscription_urls) {
          const urlMap: { [key: string]: string } = {}
          Object.entries(data.subscription_urls).forEach(([key, config]: [string, any]) => {
            if (config.mercadopago_url) {
              urlMap[key] = config.mercadopago_url
            }
          })
          setSubscriptionLinks(urlMap)
          console.log('✅ URLs de suscripción cargadas exitosamente')
        } else {
          throw new Error(data.message || 'Error en respuesta del servidor')
        }
      } catch (error) {
        console.error('Error al cargar URLs de suscripción:', getErrorDetails(error))
        
        // URLs de respaldo en caso de error
        const fallbackUrls = {
          weekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=weekly_plan_id",
          biweekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=biweekly_plan_id",
          monthly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=monthly_plan_id",
          quarterly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=quarterly_plan_id",
          annual: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=annual_plan_id"
        }
        
        setSubscriptionLinks(fallbackUrls)
        console.warn('⚠️ Usando URLs de respaldo para suscripciones')
        
        // Mostrar toast de advertencia al usuario
        toast({
          title: "Advertencia",
          description: "Algunas funciones de suscripción pueden estar limitadas. Contacta soporte si persiste el problema.",
          variant: "destructive"
        })
      }
    }

    loadSubscriptionUrls()
  }, [])

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

  // Enlaces de suscripción de Mercado Pago (cargados dinámicamente)
  const [subscriptionLinks, setSubscriptionLinks] = useState<{ [key: string]: string }>({})

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
  const getSubscriptionLink = (type: string) => {
    // Buscar si hay productos con URLs específicas de Mercado Pago
    const subscriptionItems = cart.filter(item => item.isSubscription)
    
    if (subscriptionItems.length > 0) {
      const firstItem = subscriptionItems[0]
      
      // Verificar si el producto tiene una URL específica para este tipo de suscripción
      const productSpecificUrl = getProductSpecificUrl(firstItem, type)
      if (productSpecificUrl) {
        return productSpecificUrl
      }
    }
    
    // Fallback a URLs globales
    return subscriptionLinks[type] || subscriptionLinks.monthly || "#"
  }

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
        return item.weekly_mercadopago_url
      case 'biweekly':
        return item.biweekly_mercadopago_url
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

      // Generar un external reference determinístico para MercadoPago
      // Para suscripciones, usar formato PG-SUB-hash-userId-planId que evita duplicados
      const baseReference = `${orderNumber}_${Date.now()}`
      let externalReference = baseReference
      
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
        
        if (!validationResult.isValid) {
          logger.warn(LogCategory.SUBSCRIPTION, 'Validación de deduplicación falló', {
            userId,
            planId,
            reason: validationResult.reason,
            externalReference: validationResult.externalReference
          })
          
          // Si existe una suscripción pendiente, reutilizar su external_reference
          if (validationResult.existingSubscription?.status === 'pending') {
            logger.info(LogCategory.SUBSCRIPTION, 'Reutilizando suscripción pendiente existente', {
              userId,
              planId,
              existingId: validationResult.existingSubscription.id,
              externalReference: validationResult.existingSubscription.external_reference
            })
            externalReference = validationResult.existingSubscription.external_reference
          } else {
            // Para suscripciones activas o otros casos, mostrar error
            setError(validationResult.reason)
            return
          }
        } else {
          // Usar el external_reference generado por el servicio
          externalReference = validationResult.externalReference || generateDeterministicReference(userId, planId, subscriptionType || 'monthly')
        }
      }

      // Si hay suscripciones, redirigir al enlace de suscripción de Mercado Pago
      if (hasSubscriptionItems && subscriptionType && !isTestMode) {
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

          // Calcular precio con descuento
          const discount = getProductSubscriptionDiscount(subscriptionItem, subscriptionType)
          const basePrice = subscriptionItem.price
          const discountPercentage = discount * 100
          const discountedPrice = basePrice * (1 - discount)
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
            mercadopago_plan_id: null, // Se asignará si se usa plan
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

          // Guardar información de suscripción pendiente usando upsert para evitar duplicados
          const { data: insertedData, error: subscriptionError } = await supabase
            .from('unified_subscriptions')
            .upsert(subscriptionData as any, {
              onConflict: 'user_id,product_id,external_reference',
              ignoreDuplicates: false
            })
            .select()

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
            logger.error(LogCategory.SUBSCRIPTION, 'Error guardando suscripción pendiente', getErrorMessage(subscriptionError), {
              userId: user.id,
              externalReference,
              errorCode: subscriptionError.code,
              errorDetails: subscriptionError.details,
              errorHint: subscriptionError.hint,
              subscriptionData: {
                productId: subscriptionItem.id,
                productName: subscriptionItem.name,
                subscriptionType,
                transactionAmount
              }
            })
            
            console.error('Error al guardar suscripción pendiente:', getErrorDetails(subscriptionError))
            
            // Manejo específico de errores
            let errorMessage = 'Error al guardar la suscripción. Por favor, inténtalo de nuevo.'
            
            if (subscriptionError.code === '23505') {
              errorMessage = 'Ya existe una suscripción pendiente con esta referencia. Verifica tu perfil.'
            } else if (subscriptionError.code === '23503') {
              errorMessage = 'Error de datos. Por favor, verifica tu información e inténtalo de nuevo.'
            } else if (subscriptionError.message?.includes('permission')) {
              errorMessage = 'Error de permisos. Por favor, inicia sesión nuevamente.'
            }
            
            setError(errorMessage)
            
            toast({
              title: "Error al guardar suscripción",
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

          // Limpiar carrito después de confirmar que se guardó
          clearCart()
          setShowCheckout(false)

          // Redirigir al enlace de suscripción de Mercado Pago
          const subscriptionLink = getSubscriptionLink(subscriptionType)
          const finalLink = `${subscriptionLink}&external_reference=${externalReference}&back_url=${encodeURIComponent(window.location.origin + '/suscripcion')}`
          
          logger.info(LogCategory.SUBSCRIPTION, 'Redirigiendo a MercadoPago para suscripción', {
            userId: user.id,
            externalReference,
            subscriptionType,
            redirectUrl: finalLink,
            productId: subscriptionItem.id,
            transactionAmount
          })
          
          console.log('Redirigiendo a:', finalLink)
          window.location.href = finalLink

          return
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
          
          return
        }
      }

      if (isTestMode) {
        // En modo de pruebas, crear orden usando el endpoint de MercadoPago
        // pero sin redirección real
        console.log("Modo de pruebas: Creando orden completa...")

        // Preparar los datos como se haría para MercadoPago
        const items = cart.map((item) => {
          let finalPrice = item.price
          
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

      } else {
        // En modo normal, crear preferencia de pago en Mercado Pago
        console.log("Creando preferencia de pago en Mercado Pago...")

        // Preparar los datos para la API
        const items = cart.map((item) => {
          let finalPrice = item.price
          
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
        errorDetails.message || "Ha ocurrido un error al procesar tu pedido. Por favor, inténtalo de nuevo.",
      )
      
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
    return null
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

                {isTestMode && (
                  <p className="text-sm text-center text-amber-600 font-medium">
                    Modo de pruebas activado. Se simulará un pago exitoso.
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
