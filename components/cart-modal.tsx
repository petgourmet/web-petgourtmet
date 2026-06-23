"use client"

import { Button } from "@/components/ui/button"
import { X, ShoppingCart, Minus, Plus, Truck } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart-context"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

interface RecommendedProduct {
  id: string | number
  name: string
  price: number
  image: string
  slug: string
  category?: string
}

export function CartModal() {
  const { cart, removeFromCart, updateCartItemQuantity, calculateCartTotal, setShowCart, addToCart } = useCart()
  const router = useRouter()
  const { user, loading } = useClientAuth()
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])

  const hasSubscriptions = cart.some((item) => item.isSubscription)

  // Calcular progreso para envío gratis
  const freeShippingThreshold = 1000
  const currentTotal = calculateCartTotal()
  const progressPercentage = Math.min((currentTotal / freeShippingThreshold) * 100, 100)
  const amountToFreeShipping = Math.max(freeShippingThreshold - currentTotal, 0)

  // Cargar productos recomendados desde Supabase
  useEffect(() => {
    async function loadRecommendedProducts() {
      if (!supabase) return

      const { data } = await supabase
        .from("products")
        .select("id, name, price, image, slug, categories(name)")
        .gt("stock", 0)
        .limit(6)

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 3)
        setRecommendedProducts(
          shuffled.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price ?? 0,
            image: p.image || "/placeholder.svg",
            slug: p.slug,
            category: p.categories?.name,
          }))
        )
      }
    }
    loadRecommendedProducts()
  }, [])

  const handleAddRecommendedToCart = (e: React.MouseEvent, product: RecommendedProduct) => {
    e.preventDefault()
    e.stopPropagation()
    
    addToCart({
      id: typeof product.id === 'string' ? parseInt(product.id) : product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: "Único",
      quantity: 1,
      isSubscription: false,
      slug: product.slug,
    })
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex"
      onClick={() => setShowCart(false)}
    >
      {/* Panel lateral deslizante desde la derecha */}
      <div 
        className="ml-auto h-full w-full sm:max-w-md md:max-w-2xl bg-white shadow-2xl flex animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Contenido Principal del Carrito */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 pb-3 border-b border-gray-200 bg-white">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#16313b] uppercase tracking-wide">
                CARRITO <span className="text-[#5d7276] text-xs sm:text-sm">({cart.length} {cart.length === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'})</span>
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100 rounded-full h-8 w-8"
              aria-label="Cerrar carrito"
              onClick={() => setShowCart(false)}
            >
              <X className="h-5 w-5 text-[#16313b]" aria-hidden="true" />
            </Button>
          </div>

          {/* Barra de progreso envío gratis (solo cuando hay items) */}
          {cart.length > 0 && currentTotal < freeShippingThreshold && (
            <div className="px-4 sm:px-6 pt-3 pb-2 bg-white border-b border-gray-100">
              <div className="bg-gradient-to-r from-[#f0f9fa] to-[#e8f5f7] rounded-xl p-3 shadow-sm border border-[#c4e8ec]">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-[#2a7880] flex-shrink-0" strokeWidth={2} />
                  <p className="text-xs sm:text-sm text-[#16313b] font-semibold">
                    ¡A solo <span className="text-[#2a7880]">${amountToFreeShipping.toFixed(2)}</span> del envío gratis!
                  </p>
                </div>
                <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden border border-[#d4eff2]">
                  <div
                    className="h-full bg-gradient-to-r from-[#2a7880] to-[#3da8b5] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {cart.length > 0 && currentTotal >= freeShippingThreshold && (
            <div className="px-4 sm:px-6 pt-3 pb-2 bg-white border-b border-gray-100">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-3 shadow-sm border border-red-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs sm:text-sm text-red-800 font-bold">
                    ¡Felicidades! Tu envío es GRATIS
                  </p>
                </div>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4 text-base">Tu carrito está vacío</p>
                <Button
                  className="bg-[#2a7880] hover:bg-[#1f5a61] text-white rounded-full px-6 text-sm"
                  onClick={() => setShowCart(false)}
                >
                  Continuar Comprando
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Items del carrito + Productos Recomendados */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-4 sm:p-6 space-y-4">
                  
                  {/* Items del carrito */}
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className={`bg-white rounded-xl p-3 shadow-sm border transition-all duration-500 ${
                          item.justAdded 
                            ? 'border-[#2a7880] bg-gradient-to-r from-[#7BBDC5]/10 to-[#7BBDC5]/5 shadow-lg ring-2 ring-[#2a7880]/20' 
                            : 'border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Imagen del producto */}
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Info del producto */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#16313b] text-sm mb-1 line-clamp-2">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs text-[#5d7276]">
                                Tamaño: <span className="font-medium text-[#16313b]">{item.size}</span>
                              </span>
                              {item.isSubscription && (
                                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs py-0 px-2">
                                  Suscripción
                                </Badge>
                              )}
                            </div>

                            {/* Controles y precio */}
                            <div className="flex items-center justify-between">
                              {/* Controles de cantidad */}
                              <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-1">
                                <button
                                  className="w-7 h-7 rounded-full bg-white hover:bg-[#2a7880] hover:text-white text-[#16313b] flex items-center justify-center transition-colors shadow-sm"
                                  aria-label="Disminuir cantidad"
                                  onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
                                </button>
                                <span className="w-7 text-center font-bold text-[#16313b] text-sm">{item.quantity}</span>
                                <button
                                  className="w-7 h-7 rounded-full bg-white hover:bg-[#2a7880] hover:text-white text-[#16313b] flex items-center justify-center transition-colors shadow-sm"
                                  aria-label="Aumentar cantidad"
                                  onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
                                </button>
                              </div>

                              {/* Precio */}
                              <div className="text-right">
                                {item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0 ? (
                                  <div className="space-y-0">
                                    <div className="text-xs text-[#5d7276] line-through">
                                      ${(item.price / (1 - item.subscriptionDiscount / 100)).toFixed(2)}
                                    </div>
                                    <div className="text-sm text-green-600 font-bold">
                                      ${item.price.toFixed(2)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-base font-bold text-[#16313b]">
                                    ${item.price.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botón eliminar */}
                          <button
                            className="w-7 h-7 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Eliminar producto del carrito"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Productos Recomendados - Estilo Carrusel */}
                  {recommendedProducts.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="mb-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#7BBDC5]/70 font-semibold mb-1">
                          Descubre más
                        </p>
                        <h3 className="text-sm font-bold text-gray-700 leading-tight">
                          También te puede gustar
                        </h3>
                      </div>
                      
                      <div className="space-y-3">
                        {recommendedProducts.map((product) => (
                          <Link
                            key={product.id}
                            href={`/producto/${product.slug}`}
                            onClick={() => setShowCart(false)}
                            className="block group"
                          >
                            <div className="rounded-2xl overflow-hidden border border-[#7BBDC5]/15 bg-white hover:border-[#7BBDC5]/40 hover:shadow-[0_4px_20px_rgba(123,189,197,0.12)] transition-all duration-300">
                              <div className="flex gap-3 p-3 relative">
                                {/* Imagen */}
                                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="80px"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  
                                  {/* Botón + flotante */}
                                  <button
                                    onClick={(e) => handleAddRecommendedToCart(e, product)}
                                    className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-[#2a7880] hover:bg-[#1f5a61] text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 z-10"
                                    aria-label={`Agregar ${product.name} al carrito`}
                                  >
                                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                                  </button>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  {product.category && (
                                    <p className="text-[10px] uppercase tracking-wider text-[#7BBDC5]/70 truncate">
                                      {product.category}
                                    </p>
                                  )}
                                  <h4 className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2">
                                    {product.name}
                                  </h4>
                                  <p className="text-sm font-bold text-[#7BBDC5] pt-0.5">
                                    ${product.price.toFixed(2)}{" "}
                                    <span className="text-[10px] font-normal text-gray-400">MXN</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Resumen y botones (LÓGICA ORIGINAL PRESERVADA) */}
              <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
                {/* Mostrar descuentos aplicados si los hay */}
                {(() => {
                  const totalDiscount = cart.reduce((total, item) => {
                    if (item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0) {
                      const originalPrice = item.price / (1 - item.subscriptionDiscount / 100)
                      const discountAmount = (originalPrice * item.subscriptionDiscount / 100) * item.quantity
                      return total + discountAmount
                    }
                    return total
                  }, 0)
                  
                  const originalTotal = cart.reduce((total, item) => {
                    if (item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0) {
                      const originalPrice = item.price / (1 - item.subscriptionDiscount / 100)
                      return total + (originalPrice * item.quantity)
                    }
                    return total + (item.price * item.quantity)
                  }, 0)
                  
                  return totalDiscount > 0 ? (
                    <div className="space-y-1 mb-3 pb-3 border-b border-gray-200">
                      <div className="flex justify-between text-xs sm:text-sm text-[#5d7276]">
                        <span>Subtotal original</span>
                        <span className="line-through">${originalTotal.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm text-green-600 font-semibold">
                        <span>Descuento por suscripción</span>
                        <span>-${totalDiscount.toFixed(2)} MXN</span>
                      </div>
                    </div>
                  ) : null
                })()}
                
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-[#5d7276]">Subtotal</span>
                  <span className="font-semibold text-[#16313b]">${calculateCartTotal().toFixed(2)} MXN</span>
                </div>
                
                <div className="flex justify-between mb-3 text-sm">
                  <span className="text-[#5d7276]">Envío</span>
                  <span className="font-semibold">
                    {calculateCartTotal() >= 1000 ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      <span className="text-[#16313b]">$100.00 MXN</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between mb-4 pb-3 border-b border-gray-200">
                  <span className="text-base font-bold text-[#16313b]">Total</span>
                  <span className="text-xl font-bold text-[#2a7880]">
                    ${(calculateCartTotal() >= 1000 ? calculateCartTotal() : calculateCartTotal() + 100).toFixed(2)} MXN
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-[#2a7880] hover:bg-[#1f5a61] text-white rounded-full py-5 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                    onClick={() => {
                      setShowCart(false)
                      if (hasSubscriptions && !user) {
                        router.push(`/auth/login?redirect=${encodeURIComponent('/checkout')}`)
                      } else {
                        router.push('/checkout')
                      }
                    }}
                  >
                    {hasSubscriptions && !user ? "Crear Cuenta para Suscripción" : "Proceder al Pago"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full rounded-full text-sm border-gray-300 text-[#2a7880] hover:bg-gray-50"
                    onClick={() => setShowCart(false)}
                  >
                    Seguir Comprando
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
