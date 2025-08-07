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

export function CheckoutModal() {
  const { cart, calculateCartTotal, setShowCheckout, clearCart, showCheckout } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
  const [userProfile, setUserProfile] = useState<any>(null)

  // Cargar URLs de suscripción desde la base de datos
  useEffect(() => {
    const loadSubscriptionUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_config')
          .select('period, mercadopago_url')
          .not('mercadopago_url', 'is', null)

        if (error) throw error

        const urlMap: { [key: string]: string } = {}
        data?.forEach(config => {
          if (config.mercadopago_url) {
            urlMap[config.period] = config.mercadopago_url
          }
        })
        setSubscriptionLinks(urlMap)
      } catch (error) {
        console.error('Error al cargar URLs de suscripción:', error)
        // URLs de respaldo en caso de error
        setSubscriptionLinks({
          weekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=weekly_plan_id",
          biweekly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=biweekly_plan_id",
          monthly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=monthly_plan_id",
          quarterly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=quarterly_plan_id",
          annual: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=annual_plan_id"
        })
      }
    }

    loadSubscriptionUrls()
  }, [])

  // Estados para el formulario
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
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
            console.error("Error al cargar el perfil del usuario:", error)
            return
          }

          if (profile) {
            setUserProfile(profile)

            // Autocompletar información del cliente si hay datos disponibles
            if (profile.full_name) {
              const nameParts = profile.full_name.split(" ")
              setCustomerInfo({
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                phone: profile.phone || "",
              })
            }

            // Autocompletar información de envío si existe
            if (profile.shipping_address) {
              try {
                const address =
                  typeof profile.shipping_address === "string"
                    ? JSON.parse(profile.shipping_address)
                    : profile.shipping_address

                setShippingInfo({
                  address: `${address.street_name} ${address.street_number}`,
                  city: address.city || "",
                  state: address.state || "",
                  postalCode: address.zip_code || "",
                  country: address.country || "México",
                })
              } catch (e) {
                console.error("Error al parsear la dirección de envío:", e)
              }
            }
          }
        } catch (error) {
          console.error("Error al cargar datos del usuario:", error)
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

    if (id === "firstName" || id === "lastName" || id === "phone") {
      setCustomerInfo((prev) => ({ ...prev, [id]: value }))
    } else {
      setShippingInfo((prev) => ({ ...prev, [id]: value }))
    }
  }

  // Función para simular un pago exitoso
  const simulateSuccessfulPayment = async (orderId: string) => {
    try {
      // Actualizar el estado del pedido a "processing"
      const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", orderId)

      if (error) {
        console.error("Error al simular el pago:", error)
        throw new Error("Error al simular el pago")
      }

      return true
    } catch (error) {
      console.error("Error en simulateSuccessfulPayment:", error)
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

    setIsLoading(true)

    try {
      console.log("Creando orden...")

      // Calcular el total
      const subtotal = calculateCartTotal()
      const shipping = subtotal > 500 ? 0 : 90 // Envío gratis por compras mayores a $500 MXN
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
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.isSubscription ? item.price * 0.9 : item.price,
          })),
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

      // Generar un external reference único para MercadoPago
      // Para suscripciones, agregar prefijo 'subscription_' para que el webhook las detecte
      const baseReference = `${orderNumber}_${Date.now()}`
      const externalReference = hasSubscriptionItems ? `subscription_${baseReference}` : baseReference

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
        if (subscriptionItems.length > 1) {
          setError("Solo puedes procesar una suscripción por vez. Por favor, mantén solo un producto de suscripción en tu carrito.")
          return
        }

        // Crear registro de suscripción en la base de datos
        try {
          const subscriptionData = {
            user_id: user.id,
            subscription_type: subscriptionType,
            status: 'pending',
            external_reference: externalReference,
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

          console.log('Guardando suscripción pendiente:', subscriptionData)

          // Guardar información de suscripción pendiente y esperar confirmación
          const { data: insertedData, error: subscriptionError } = await supabase
            .from('pending_subscriptions')
            .insert(subscriptionData)
            .select()

          if (subscriptionError) {
            console.error('Error al guardar suscripción pendiente:', subscriptionError)
            setError('Error al guardar la suscripción. Por favor, inténtalo de nuevo.')
            return
          }

          console.log('Suscripción pendiente guardada exitosamente:', insertedData)

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
          
          console.log('Redirigiendo a:', finalLink)
          window.location.href = finalLink

          return
        } catch (error) {
          console.error('Error al procesar suscripción:', error)
          setError('Error al procesar la suscripción. Por favor, inténtalo de nuevo.')
          return
        }
      }

      if (isTestMode) {
        // En modo de pruebas, crear orden usando el endpoint de MercadoPago
        // pero sin redirección real
        console.log("Modo de pruebas: Creando orden completa...")

        // Preparar los datos como se haría para MercadoPago
        const items = cart.map((item) => ({
          id: item.id,
          name: item.name,
          title: item.name,
          description: `${item.size || "Standard"}${item.isSubscription ? " (Suscripción)" : ""}`,
          image: item.image,
          picture_url: item.image,
          quantity: item.quantity,
          price: item.isSubscription ? item.price * 0.9 : item.price,
          unit_price: item.isSubscription ? item.price * 0.9 : item.price,
        }))

        const userEmail = user?.email || "cliente@petgourmet.mx"
        const customerData = {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: userEmail,
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
        const items = cart.map((item) => ({
          id: item.id,
          name: item.name,
          title: item.name,
          description: `${item.size || "Standard"}${item.isSubscription ? " (Suscripción)" : ""}`,
          image: item.image,
          picture_url: item.image,
          quantity: item.quantity,
          price: item.isSubscription ? item.price * 0.9 : item.price,
          unit_price: item.isSubscription ? item.price * 0.9 : item.price,
        }))

        // Obtener el email del usuario autenticado o usar un valor por defecto
        const userEmail = user?.email || "cliente@petgourmet.mx"

        const customerData = {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: userEmail,
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
      setError(
        error instanceof Error
          ? error.message
          : "Ha ocurrido un error al procesar tu pedido. Por favor, inténtalo de nuevo.",
      )
    } finally {
      setIsLoading(false)
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
                        ${((item.isSubscription ? item.price * 0.9 : item.price) * item.quantity).toFixed(2)} MXN
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>${calculateCartTotal().toFixed(2)} MXN</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Envío</span>
                    <span>{calculateCartTotal() > 500 ? "Gratis" : "$90.00 MXN"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4">
                    <span>Total</span>
                    <span>
                      $
                      {(
                        calculateCartTotal() +
                        (calculateCartTotal() > 500 ? 0 : 90)
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
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-display"
                  onClick={handleCreateOrder}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />{" "}
                      {isTestMode ? "Finalizar compra (Modo prueba)" : "Continuar al pago"}
                    </>
                  )}
                </Button>

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
