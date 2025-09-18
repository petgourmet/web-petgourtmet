"use client"

import { Button } from "@/components/ui/button"
import { X, ShoppingCart, Minus, Plus } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"

export function CartModal() {
  const { cart, removeFromCart, updateCartItemQuantity, calculateCartTotal, setShowCart, setShowCheckout } = useCart()
  const router = useRouter()
  const { user } = useClientAuth()

  const hasSubscriptions = cart.some((item) => item.isSubscription)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#e7ae84] rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary dark:text-white font-display">Tu Carrito</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 dark:text-white mb-4" />
              <p className="text-gray-500 dark:text-white">Tu carrito está vacío</p>
              <Button
                className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-full"
                onClick={() => setShowCart(false)}
              >
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-xl">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium">{item.name}</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>Tamaño: {item.size}</span>
                        {item.isSubscription && (
                          <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                            Suscripción
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className="font-medium">
                        {item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0 ? (
                          <div className="space-y-1">
                            {/* Precio original tachado - calculado correctamente */}
                            <div className="text-xs text-gray-400 line-through">
                              ${(item.price / (1 - item.subscriptionDiscount / 100)).toFixed(2)} MXN
                            </div>
                            {/* Precio con descuento - item.price ya viene con descuento aplicado */}
                            <div className="text-green-600 font-semibold">
                              ${item.price.toFixed(2)} MXN
                            </div>
                            {/* Porcentaje de descuento */}
                            <div className="text-xs text-green-600">
                              -{item.subscriptionDiscount.toFixed(0)}% OFF
                            </div>
                          </div>
                        ) : (
                          <div>${item.price.toFixed(2)} MXN</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        onClick={() => removeFromCart(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                {/* Mostrar descuentos aplicados si los hay */}
                {(() => {
                  const totalDiscount = cart.reduce((total, item) => {
                    if (item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0) {
                      // Calcular el descuento basado en el precio original
                      const originalPrice = item.price / (1 - item.subscriptionDiscount / 100)
                      const discountAmount = (originalPrice * item.subscriptionDiscount / 100) * item.quantity
                      return total + discountAmount
                    }
                    return total
                  }, 0)
                  
                  const originalTotal = cart.reduce((total, item) => {
                    if (item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0) {
                      // El precio original calculado correctamente
                      const originalPrice = item.price / (1 - item.subscriptionDiscount / 100)
                      return total + (originalPrice * item.quantity)
                    }
                    return total + (item.price * item.quantity)
                  }, 0)
                  
                  return totalDiscount > 0 ? (
                    <>
                      <div className="flex justify-between mb-2 text-sm text-gray-500">
                        <span>Subtotal original</span>
                        <span>${originalTotal.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between mb-2 text-sm text-green-600">
                        <span>Descuento por suscripción</span>
                        <span>-${totalDiscount.toFixed(2)} MXN</span>
                      </div>
                    </>
                  ) : null
                })()}
                
                <div className="flex justify-between mb-2">
                  <span>Subtotal</span>
                  <span>${calculateCartTotal().toFixed(2)} MXN</span>
                </div>
                
                {/* Mensaje de envío gratis */}
                 {calculateCartTotal() < 1000 && (
                   <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                     <div className="flex items-center justify-center">
                       <div className="text-center">
                         <p className="text-sm text-primary font-medium">
                           🚚 ¡Envío GRATIS en compras mayores a $1,000 MXN!
                         </p>
                         <p className="text-xs text-primary/80">
                           Te faltan ${(1000 - calculateCartTotal()).toFixed(2)} MXN
                         </p>
                       </div>
                     </div>
                   </div>
                 )}
                
                {calculateCartTotal() >= 1000 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-center">
                      <p className="text-sm text-green-700 font-medium">
                        ✅ ¡Felicidades! Tu envío es GRATIS
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mb-4">
                  <span>Envío</span>
                  <span>{calculateCartTotal() >= 1000 ? "Gratis" : "$100.00 MXN"}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-6">
                  <span>Total</span>
                  <span>
                    ${(calculateCartTotal() >= 1000 ? calculateCartTotal() : calculateCartTotal() + 100).toFixed(2)} MXN
                  </span>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowCart(false)}>
                    Seguir Comprando
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full"
                    onClick={() => {
                      // Verificar si hay suscripciones y si el usuario está autenticado
                      if (hasSubscriptions && !user) {
                        // Cerrar el modal del carrito
                        setShowCart(false)
                        // Redirigir al login con mensaje sobre suscripciones
                        router.push("/auth/login?redirect=checkout&subscription=true")
                        return
                      }

                      // Cerrar el modal del carrito
                      setShowCart(false)
                      // Mostrar el modal de checkout donde se iniciará el proceso de pago
                      setShowCheckout(true)
                    }}
                  >
                    {hasSubscriptions && !user ? "Crear Cuenta para Suscripción" : "Proceder al Pago"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
