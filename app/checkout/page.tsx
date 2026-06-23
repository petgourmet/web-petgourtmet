"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, ArrowLeft, ShieldCheck, CreditCard, Smartphone, UserX, AlertTriangle, Info, RefreshCw, X } from "lucide-react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { createProductionSafeConsole } from "@/lib/debug"

const console = createProductionSafeConsole()

export default function CheckoutPage() {
  const { cart, calculateCartTotal, clearCart, lastProductSlug } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cart.length === 0) {
      router.push('/productos')
    }
  }, [cart, router])

  const hasSubscriptions = () => cart.some(item => item.isSubscription)

  const subtotal = calculateCartTotal()
  const shippingCost = subtotal >= 1000 ? 0 : 100
  const total = subtotal + shippingCost

  const handleCheckout = async () => {
    setError(null)

    if (!acceptedTerms) {
      setError("terms")
      return
    }

    const hasSubscriptionItems = hasSubscriptions()
    if (hasSubscriptionItems && !user) {
      setError("auth")
      return
    }

    const subscriptionItems = cart.filter(item => item.isSubscription)
    if (subscriptionItems.length > 1) {
      setError("multi_subscription")
      toast({
        title: "Multiples suscripciones no permitidas",
        description: "Solo puedes suscribirte a un producto a la vez.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
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
        email: user?.email || "",
        firstName: "",
        lastName: "",
        userId: user?.id || undefined,
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer,
          metadata: {
            user_id: user?.id || "",
            total: total.toString(),
            shipping_cost: shippingCost.toString(),
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear la sesion de pago")
      }

      const { url, sessionId } = await response.json()

      if (!url) throw new Error("No se recibio URL de redireccion de Stripe")

      if (sessionId) {
        localStorage.setItem("stripe_session_id", sessionId)
      }

      clearCart()
      window.location.href = url

    } catch (error) {
      console.error("Error en checkout:", error)
      const msg = error instanceof Error ? error.message : "Error al procesar el pago"
      // Mapear errores de API a tipos conocidos
      if (msg.toLowerCase().includes("cliente") || msg.toLowerCase().includes("sesion") || msg.toLowerCase().includes("sesión")) {
        setError("auth")
      } else {
        setError(msg)
      }
      setIsLoading(false)
    }
  }

  if (cart.length === 0) return null

  return (
    <div className="flex flex-col min-h-screen pt-20 bg-[#f7fafb]">
      <div className="py-10 max-w-2xl mx-auto w-full px-4">

        <div className="mb-6">
          <Link
            href={lastProductSlug ? `/producto/${lastProductSlug}` : "/productos"}
            className="inline-flex items-center text-gray-500 hover:text-[#2a7880] transition-colors text-sm font-medium gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Seguir comprando
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(22,49,59,0.10)] overflow-hidden">

          <div className="bg-[#16313b] px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Resumen de tu pedido</h1>
            <p className="text-[#7AB8BF] text-sm mt-1">Un paso mas y tu pedido estara en camino</p>
          </div>

          <div className="p-8 space-y-8">

            <div>
              <h2 className="font-semibold text-[#16313b] text-base mb-4">Productos</h2>
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-2xl bg-[#f7fafb]">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#16313b] text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[#5d7276] mt-0.5">
                        {item.size}
                        {item.isSubscription && item.subscriptionType && (
                          <span className="ml-2 text-[#2a7880] font-medium">
                            {item.subscriptionType === "weekly" ? "Semanal" :
                             item.subscriptionType === "biweekly" ? "Quincenal" :
                             item.subscriptionType === "monthly" ? "Mensual" :
                             item.subscriptionType === "quarterly" ? "Trimestral" : "Anual"}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-[#16313b] text-sm whitespace-nowrap">
                      ${(item.price * item.quantity).toFixed(2)} MXN
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#e6eeef] pt-5 space-y-3">
              <div className="flex justify-between text-sm text-[#5d7276]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-sm text-[#5d7276]">
                <span>Envio</span>
                <span className={shippingCost === 0 ? "text-emerald-600 font-medium" : ""}>
                  {shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)} MXN`}
                </span>
              </div>
              {shippingCost === 0 && (
                <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                  Tienes envio gratis por compra mayor a $1,000 MXN
                </p>
              )}
              <div className="flex justify-between font-bold text-lg text-[#16313b] border-t border-[#e6eeef] pt-3">
                <span>Total</span>
                <span>${total.toFixed(2)} MXN</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e6eeef] bg-[#f7fafb] p-4">
              <p className="text-xs text-[#5d7276] font-medium mb-3 uppercase tracking-wide">Metodos de pago aceptados</p>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1.5 text-xs text-[#5d7276]">
                  <CreditCard className="h-4 w-4 text-[#2a7880]" />
                  Tarjeta credito/debito
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5d7276]">
                  <Smartphone className="h-4 w-4 text-[#2a7880]" />
                  Apple Pay / Google Pay
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5d7276]">
                  <span className="font-bold text-[#2a7880] text-xs">OXXO</span>
                  Pago en efectivo
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#e6eeef] bg-white">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-[#5d7276] cursor-pointer leading-relaxed">
                He leido y acepto los{" "}
                <a href="/terminos" target="_blank" className="text-[#2a7880] hover:underline font-medium">
                  terminos y condiciones
                </a>{" "}
                y la{" "}
                <a href="/privacidad" target="_blank" className="text-[#2a7880] hover:underline font-medium">
                  politica de privacidad
                </a>{" "}
                de Pet Gourmet.
              </label>
            </div>

            {hasSubscriptions() && !user && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                Tu carrito contiene suscripciones.{" "}
                <Link href="/auth/login?redirect=/checkout" className="font-semibold underline">
                  Inicia sesion
                </Link>{" "}
                para continuar.
              </div>
            )}

            {error && (
              <div className="rounded-2xl overflow-hidden border border-[#e6eeef] shadow-[0_4px_24px_rgba(22,49,59,0.08)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header con logo */}
                <div className={`px-5 py-4 flex items-center justify-between ${
                  error === "auth" ? "bg-[#16313b]" :
                  error === "terms" ? "bg-amber-700" :
                  error === "multi_subscription" ? "bg-[#2a7880]" :
                  "bg-rose-700"
                }`}>
                  <div className="flex items-center gap-3">
                    <Image
                      src="/pet-gourmet-logo-transparent.webp"
                      alt="Pet Gourmet"
                      width={28}
                      height={28}
                      className="rounded-full object-cover opacity-90"
                    />
                    <span className="text-white text-sm font-semibold tracking-wide">Pet Gourmet</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-white/60 hover:text-white transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Cuerpo */}
                <div className="bg-white px-5 py-5">
                  {error === "auth" && (
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <UserX className="h-5 w-5 text-[#2a7880]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#16313b] text-sm mb-1">Necesitas iniciar sesión</p>
                        <p className="text-xs text-[#5d7276] leading-relaxed mb-4">
                          Para completar tu compra necesitamos verificar tu identidad. Inicia sesión o crea una cuenta gratuita en segundos.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link
                            href="/auth/login?redirect=/checkout"
                            className="flex-1 text-center text-sm font-semibold bg-[#16313b] text-white py-2.5 px-4 rounded-full hover:bg-[#1d4a57] transition-colors"
                          >
                            Iniciar sesión
                          </Link>
                          <Link
                            href="/auth/login?redirect=/checkout"
                            className="flex-1 text-center text-sm font-semibold border border-[#7BBDC5]/50 text-[#2a7880] py-2.5 px-4 rounded-full hover:bg-[#f0f9fa] transition-colors"
                          >
                            Crear cuenta
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {error === "terms" && (
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#16313b] text-sm mb-1">Acepta los términos para continuar</p>
                        <p className="text-xs text-[#5d7276] leading-relaxed">
                          Activa la casilla de términos y condiciones que aparece arriba para poder procesar tu pedido.
                        </p>
                      </div>
                    </div>
                  )}

                  {error === "multi_subscription" && (
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-[#f0f9fa] border border-[#7BBDC5]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-[#2a7880]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#16313b] text-sm mb-1">Solo una suscripción por compra</p>
                        <p className="text-xs text-[#5d7276] leading-relaxed mb-3">
                          Tienes más de un producto en modo suscripción. Deja solo uno como suscripción y el resto cómpralos de forma individual.
                        </p>
                        <Link
                          href="/productos"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2a7880] hover:underline"
                        >
                          <ArrowLeft className="h-3 w-3" /> Ver mi carrito
                        </Link>
                      </div>
                    </div>
                  )}

                  {error !== "auth" && error !== "terms" && error !== "multi_subscription" && (
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#16313b] text-sm mb-1">Algo salió mal</p>
                        <p className="text-xs text-[#5d7276] leading-relaxed mb-3">{error}</p>
                        <button
                          onClick={() => { setError(null); handleCheckout() }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" /> Intentar de nuevo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-[#2a7880] hover:bg-[#1d636b] text-white py-7 text-lg font-semibold rounded-full shadow-[0_8px_24px_rgba(42,120,128,0.25)] hover:shadow-[0_12px_30px_rgba(42,120,128,0.35)] transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              onClick={handleCheckout}
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Redirigiendo al pago...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Ir al Pago Seguro
                </>
              )}
            </Button>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-xs text-[#5d7276] bg-[#f7fafb] px-4 py-2 rounded-full border border-[#e6eeef]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Pago 100% seguro · Procesado por Stripe · Datos cifrados
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
