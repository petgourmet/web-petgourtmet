"use client"

import { Button } from "@/components/ui/button"
import { X, CreditCard } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/components/cart-context"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export function CheckoutModal() {
  const { cart, calculateCartTotal, setShowCheckout, clearCart } = useCart()
  const router = useRouter()

  const handleCompleteCheckout = () => {
    toast({
      title: "¡Pedido completado!",
      description: "Tu pedido ha sido procesado correctamente.",
    })
    clearCart()
    setShowCheckout(false)
    router.push("/gracias-por-tu-compra")
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
                    <Input id="firstName" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellidos</Label>
                    <Input id="lastName" placeholder="Tus apellidos" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" />
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" placeholder="Calle y número" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" placeholder="Tu ciudad" />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input id="postalCode" placeholder="12345" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" placeholder="Tu teléfono" />
                </div>
              </div>

              <h3 className="text-lg font-bold mt-8 mb-4">Método de Pago</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Número de Tarjeta</Label>
                  <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Fecha de Expiración</Label>
                    <Input id="expiry" placeholder="MM/AA" />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName">Nombre en la Tarjeta</Label>
                  <Input id="cardName" placeholder="Nombre completo" />
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox id="saveCard" />
                  <Label htmlFor="saveCard">Guardar esta tarjeta para futuras compras</Label>
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
                        €{((item.isSubscription ? item.price * 0.9 : item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>€{calculateCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Envío</span>
                    <span>{calculateCartTotal() > 30 ? "Gratis" : "€4.99"}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Impuestos</span>
                    <span>€{(calculateCartTotal() * 0.21).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4">
                    <span>Total</span>
                    <span>
                      €
                      {(
                        calculateCartTotal() +
                        (calculateCartTotal() > 30 ? 0 : 4.99) +
                        calculateCartTotal() * 0.21
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Acepto los términos y condiciones</Label>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-display"
                  onClick={handleCompleteCheckout}
                >
                  <CreditCard className="mr-2 h-5 w-5" /> Completar Compra
                </Button>

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
