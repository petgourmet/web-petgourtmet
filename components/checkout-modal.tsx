"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, CreditCard, Loader2, Lock } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

interface Profile {
  id: string
  full_name?: string
  phone?: string
  shipping_address?: string | object
  [key: string]: any
}

export function CheckoutModal() {
  const { cart, calculateCartTotal, setShowCheckout, clearCart, showCheckout } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          if (error) {
            console.error("Error al cargar el perfil del usuario:", error)
            return
          }

          if (profile) {
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
              setCustomerInfo(prev => ({
                ...prev,
                email: user.email || ""
              }))
            }

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

  const hasSubscriptions = () => {
    return cart.some(item => item.isSubscription)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    if (id === "firstName" || id === "lastName" || id === "email" || id === "phone") {
      setCustomerInfo((prev) => ({ ...prev, [id]: value }))
    } else {
      setShippingInfo((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleCheckout = async () => {
    setError(null)

    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones para continuar")
      return
    }

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

    const hasSubscriptionItems = hasSubscriptions()
    if (hasSubscriptionItems && !user) {
      setError("Debes iniciar sesión para crear una suscripción")
      toast({
        title: "Inicio de sesión requerido",
        description: "Por favor inicia sesión para continuar con tu suscripción.",
        variant: "destructive"
      })
      router.push(`/auth/login?redirect=/checkout`)
      return
    }

    // Verificar si hay múltiples suscripciones
    const subscriptionItems = cart.filter(item => item.isSubscription)
    if (subscriptionItems.length > 1) {
      setError("Solo puedes comprar una suscripción a la vez. Por favor, elimina las suscripciones adicionales del carrito.")
      toast({
        title: "Múltiples suscripciones detectadas",
        description: "Stripe solo permite procesar una suscripción por compra. Por favor, compra las suscripciones por separado.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Procesando checkout con Stripe...")

      const subtotal = calculateCartTotal()
      const shippingCost = subtotal >= 1000 ? 0 : 100
      const total = subtotal + shippingCost

      const items = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        size: item.size,
        isSubscription: item.isSubscription,
        subscriptionType: item.subscriptionType,
      }))

      const customer = {
        email: customerInfo.email,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone,
        userId: user?.id || undefined,
      }

      const shipping = {
        address: shippingInfo.address,
        city: shippingInfo.city,
        state: shippingInfo.state,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country,
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          customer,
          shipping,
          metadata: {
            user_id: user?.id || '',
            total: total.toString(),
            shipping_cost: shippingCost.toString(),
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear la sesión de pago")
      }

      const { url, sessionId } = await response.json()

      if (!url) {
        throw new Error("No se recibió URL de redirección de Stripe")
      }

      if (sessionId) {
        localStorage.setItem(`stripe_session_id`, sessionId)
      }

      clearCart()
      window.location.href = url

    } catch (error) {
      console.error("Error en checkout:", error)
      setError(error instanceof Error ? error.message : "Error al procesar el pago")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el pago",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  if (!showCheckout) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 z-10 flex justify-between items-center p-6 bg-white dark:bg-gray-800 border-b">
          <h2 className="text-2xl font-bold text-[#7BBDC5]">Finalizar Compra</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowCheckout(false)} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-4">Resumen del pedido</h3>
            <div className="space-y-3 mb-4">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.size} {item.isSubscription && item.subscriptionType && `- ${item.subscriptionType === `weekly` ? `Semanal` : item.subscriptionType === `biweekly` ? `Quincenal` : item.subscriptionType === `monthly` ? `Mensual` : item.subscriptionType === `quarterly` ? `Trimestral` : `Anual`}`}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)} MXN</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateCartTotal().toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span>Envío:</span>
                <span>{calculateCartTotal() >= 1000 ? "Gratis" : "$100.00 MXN"}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${(calculateCartTotal() + (calculateCartTotal() >= 1000 ? 0 : 100)).toFixed(2)} MXN</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Información del cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={customerInfo.firstName}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Apellidos *</Label>
                <Input
                  id="lastName"
                  value={customerInfo.lastName}
                  onChange={handleInputChange}
                  placeholder="Pérez"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={handleInputChange}
                  placeholder="juan@ejemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={handleInputChange}
                  placeholder="5512345678"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Dirección de envío</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={shippingInfo.address}
                  onChange={handleInputChange}
                  placeholder="Calle y número"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={shippingInfo.city}
                    onChange={handleInputChange}
                    placeholder="Ciudad de México"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={shippingInfo.state}
                    onChange={handleInputChange}
                    placeholder="CDMX"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Código Postal *</Label>
                  <Input
                    id="postalCode"
                    value={shippingInfo.postalCode}
                    onChange={handleInputChange}
                    placeholder="01000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Input id="country" value={shippingInfo.country} disabled />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="text-[#7BBDC5] hover:underline">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" className="text-[#7BBDC5] hover:underline">
                política de privacidad
              </a>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {hasSubscriptions() && !user && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                 Tu carrito contiene suscripciones. Debes iniciar sesión para continuar.
              </p>
            </div>
          )}

          <Button
            className="w-full bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white py-6 text-lg font-semibold rounded-full"
            onClick={handleCheckout}
            disabled={isLoading || !acceptedTerms}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Continuar al pago
              </>
            )}
          </Button>

          <div className="text-center text-sm text-gray-500">
            <div className="flex justify-center items-center gap-2">
              <Lock className="h-4 w-4 text-green-600" />
              <p>Pago seguro con Stripe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
