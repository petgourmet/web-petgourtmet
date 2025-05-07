"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, CreditCard, Loader2 } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"

export function CheckoutModal() {
  const { cart, calculateCartTotal, setShowCheckout, clearCart } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [mercadoPagoLoaded, setMercadoPagoLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    if (id === "firstName" || id === "lastName" || id === "email" || id === "phone") {
      setCustomerInfo((prev) => ({ ...prev, [id]: value }))
    } else {
      setShippingInfo((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleCreatePreference = async () => {
    // Limpiar error previo
    setError(null)

    // Verificar términos y condiciones
    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones para continuar")
      return
    }

    // Validación básica del formulario - verificamos cada campo individualmente
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
      console.log("Creando preferencia de pago...")

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
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          customerData,
          backUrls: {
            success: "https://petgourmet.mx/gracias-por-tu-compra",
            failure: "https://petgourmet.mx/error-pago",
            pending: "https://petgourmet.mx/pago-pendiente",
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la preferencia de pago")
      }

      console.log("Preferencia creada:", data)

      // Guardar el ID de preferencia
      setPreferenceId(data.preferenceId)

      // Redirigir al usuario a la página de pago de Mercado Pago
      if (data.initPoint) {
        window.location.href = data.initPoint
      } else {
        throw new Error("No se recibió la URL de pago de Mercado Pago")
      }
    } catch (error) {
      console.error("Error al crear la preferencia de pago:", error)
      setError(
        error instanceof Error
          ? error.message
          : "Ha ocurrido un error al procesar tu pago. Por favor, inténtalo de nuevo.",
      )
    } finally {
      setIsLoading(false)
    }
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
                        ${((item.isSubscription ? item.price * 0.9 : item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>${calculateCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Envío</span>
                    <span>{calculateCartTotal() > 30 ? "Gratis" : "$4.99"}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Impuestos</span>
                    <span>${(calculateCartTotal() * 0.16).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4">
                    <span>Total</span>
                    <span>
                      $
                      {(
                        calculateCartTotal() +
                        (calculateCartTotal() > 30 ? 0 : 4.99) +
                        calculateCartTotal() * 0.16
                      ).toFixed(2)}
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
                  onClick={handleCreatePreference}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" /> Continuar al pago
                    </>
                  )}
                </Button>

                {error && <p className="text-red-500 text-center mt-2">{error}</p>}

                <div className="text-center text-sm text-gray-500">
                  <p>Pago seguro garantizado</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Image src="/stylized-payment-network.png" alt="Visa" width={40} height={30} />
                    <Image src="/interlocking-circles.png" alt="Mastercard" width={40} height={30} />
                    <Image src="/paypal-logo-closeup.png" alt="PayPal" width={40} height={30} />
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
