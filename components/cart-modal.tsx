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
import { RecommendedProductCard } from "@/components/recommended-product-card"

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
  // REGLA: la mayoría deben ser snacks (category_id = 1 → "premiar").
  // Misma lógica que la API /api/nutrition-plan/random-extras.
  useEffect(() => {
    async function loadRecommendedProducts() {
      if (!supabase) return

      const TOTAL    = 3
      const SNACK_ID = 1
      const ratio    = 0.7 // 70% snacks
      const targetSnacks    = Math.min(TOTAL, Math.max(1, Math.ceil(TOTAL * ratio)))
      const targetNonSnacks = TOTAL - targetSnacks

      // Fisher–Yates: mezcla los primeros `count` elementos.
      const shuffleFirst = <T,>(arr: T[], count: number): T[] => {
        const out = [...arr]
        const n   = Math.min(count, out.length)
        for (let i = 0; i < n; i++) {
          const j = i + Math.floor(Math.random() * (out.length - i))
          ;[out[i], out[j]] = [out[j], out[i]]
        }
        return out
      }

      // Pools en paralelo: snacks y no-snacks.
      const [snacksRes, othersRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, image, slug, category_id, categories(name)")
          .eq("category_id", SNACK_ID)
          .gt("stock", 0)
          .limit(20),
        supabase
          .from("products")
          .select("id, name, price, image, slug, category_id, categories(name)")
          .neq("category_id", SNACK_ID)
          .gt("stock", 0)
          .limit(20),
      ])

      // Tipo flexible para las filas devueltas por Supabase. `categories`
      // puede venir como objeto, arreglo o null dependiendo del select.
      type ProductRow = {
        id: number | string
        name: string
        price: number | null
        image: string | null
        slug: string
        category_id: number | null
        categories: { name: string | null } | { name: string | null }[] | null
      }

      const snackPool  = (snacksRes.data ?? []) as ProductRow[]
      const othersPool = (othersRes.data ?? []) as ProductRow[]

      let snackPicks  = shuffleFirst(snackPool,  Math.min(targetSnacks, snackPool.length)).slice(0, targetSnacks)
      let othersPicks = shuffleFirst(othersPool, Math.min(targetNonSnacks, othersPool.length)).slice(0, targetNonSnacks)

      // Rellenar huecos si una de las pools no alcanzó su cuota
      if (snackPicks.length < targetSnacks) {
        const missing = targetSnacks - snackPicks.length
        const usedIds = new Set(othersPicks.map((p) => p.id))
        const extra   = shuffleFirst(othersPool.filter((p) => !usedIds.has(p.id)), missing).slice(0, missing)
        othersPicks   = [...othersPicks, ...extra]
      }
      if (othersPicks.length < targetNonSnacks) {
        const missing = targetNonSnacks - othersPicks.length
        const usedIds = new Set(snackPicks.map((p) => p.id))
        const extra   = shuffleFirst(snackPool.filter((p) => !usedIds.has(p.id)), missing).slice(0, missing)
        snackPicks    = [...snackPicks, ...extra]
      }

      // Mezclar el orden final para que el snack no salga siempre primero.
      const combined = shuffleFirst([...snackPicks, ...othersPicks], TOTAL).slice(0, TOTAL)

      if (combined.length > 0) {
        setRecommendedProducts(
          combined.map((p) => {
            // categories puede llegar como objeto, arreglo o null.
            const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories
            return {
              id: p.id,
              name: p.name,
              price: p.price ?? 0,
              image: p.image || "/placeholder.svg",
              slug: p.slug,
              category: cat?.name ?? undefined,
            }
          })
        )
      }
    }
    loadRecommendedProducts()
  }, [])

  // El componente RecommendedProductCard ya maneja preventDefault/
  // stopPropagation del click del botón, así que el handler sólo
  // recibe el producto. Aceptamos el tipo expuesto por el componente
  // reutilizable para compatibilidad de firma.
  const handleAddRecommendedToCart = (product: import("@/components/recommended-product-card").RecommendedProductCardData) => {
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
      {/* Panel lateral deslizante desde la derecha - Responsive mejorado */}
      <div 
        className="ml-auto h-full w-full max-w-[100vw] sm:max-w-[480px] lg:max-w-[540px] xl:max-w-[600px] bg-white shadow-2xl flex animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Contenido Principal del Carrito */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Tamaño optimizado */}
          <div className="flex justify-between items-center px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#16313b] uppercase tracking-wide">
                CARRITO <span className="text-[#5d7276] text-xs sm:text-sm">({cart.length} {cart.length === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'})</span>
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-100 rounded-full h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Cerrar carrito"
              onClick={() => setShowCart(false)}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-[#16313b]" aria-hidden="true" />
            </Button>
          </div>

          {/* Barra de progreso envío gratis (solo cuando hay items) - Tamaño optimizado */}
          {cart.length > 0 && currentTotal < freeShippingThreshold && (
            <div className="px-4 sm:px-5 lg:px-6 pt-2 sm:pt-3 pb-2 bg-white border-b border-gray-100">
              <div className="bg-gradient-to-r from-[#f0f9fa] to-[#e8f5f7] rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-sm border border-[#c4e8ec]">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2a7880] flex-shrink-0" strokeWidth={2} />
                  <p className="text-xs sm:text-sm text-[#16313b] font-semibold">
                    ¡A solo <span className="text-[#2a7880]">${amountToFreeShipping.toFixed(2)}</span> del envío gratis!
                  </p>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-white/70 rounded-full overflow-hidden border border-[#d4eff2]">
                  <div
                    className="h-full bg-gradient-to-r from-[#2a7880] to-[#3da8b5] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {cart.length > 0 && currentTotal >= freeShippingThreshold && (
            <div className="px-4 sm:px-5 lg:px-6 pt-2 sm:pt-3 pb-2 bg-white border-b border-gray-100">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-sm border border-red-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs sm:text-sm text-red-800 font-bold">
                    ¡Felicidades! Tu envío es GRATIS
                  </p>
                </div>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">Tu carrito está vacío</p>
                <Button
                  className="bg-[#2a7880] hover:bg-[#1f5a61] text-white rounded-full px-5 sm:px-6 text-xs sm:text-sm"
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
                <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
                  
                  {/* Items del carrito */}
                  <div className="space-y-2.5 sm:space-y-3">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className={`bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-sm border transition-all duration-500 ${
                          item.justAdded 
                            ? 'border-[#2a7880] bg-gradient-to-r from-[#7BBDC5]/10 to-[#7BBDC5]/5 shadow-lg ring-2 ring-[#2a7880]/20' 
                            : 'border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Imagen del producto - Tamaños optimizados */}
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex-shrink-0 rounded-md sm:rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Info del producto - Textos optimizados */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#16313b] text-xs sm:text-sm mb-0.5 sm:mb-1 line-clamp-2">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                              <span className="text-[10px] sm:text-xs text-[#5d7276]">
                                Tamaño: <span className="font-medium text-[#16313b]">{item.size}</span>
                              </span>
                              {item.isSubscription && (
                                <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] sm:text-xs py-0 px-1.5 sm:px-2">
                                  Suscripción
                                </Badge>
                              )}
                            </div>

                            {/* Controles y precio - Tamaños optimizados */}
                            <div className="flex items-center justify-between">
                              {/* Controles de cantidad */}
                              <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-full px-0.5 sm:px-1 py-0.5 sm:py-1">
                                <button
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white hover:bg-[#2a7880] hover:text-white text-[#16313b] flex items-center justify-center transition-colors shadow-sm"
                                  aria-label="Disminuir cantidad"
                                  onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                >
                                  <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" strokeWidth={2.5} />
                                </button>
                                <span className="w-6 sm:w-7 text-center font-bold text-[#16313b] text-xs sm:text-sm">{item.quantity}</span>
                                <button
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white hover:bg-[#2a7880] hover:text-white text-[#16313b] flex items-center justify-center transition-colors shadow-sm"
                                  aria-label="Aumentar cantidad"
                                  onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                >
                                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" strokeWidth={2.5} />
                                </button>
                              </div>

                              {/* Precio - Tamaños optimizados */}
                              <div className="text-right">
                                {item.isSubscription && item.subscriptionDiscount && item.subscriptionDiscount > 0 ? (
                                  <div className="space-y-0">
                                    <div className="text-[10px] sm:text-xs text-[#5d7276] line-through">
                                      ${(item.price / (1 - item.subscriptionDiscount / 100)).toFixed(2)}
                                    </div>
                                    <div className="text-xs sm:text-sm text-green-600 font-bold">
                                      ${item.price.toFixed(2)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm sm:text-base font-bold text-[#16313b]">
                                    ${item.price.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botón eliminar - Tamaño optimizado */}
                          <button
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="Eliminar producto del carrito"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Productos Recomendados - Estilo Carrusel - Tamaños optimizados */}
                  {recommendedProducts.length > 0 && (
                    <div className="border-t border-gray-200 pt-3 sm:pt-4">
                      <div className="mb-2 sm:mb-3">
                        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#7BBDC5]/70 font-semibold mb-0.5 sm:mb-1">
                          Descubre más
                        </p>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-700 leading-tight">
                          También te puede gustar
                        </h3>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        {recommendedProducts.map((product) => (
                          <RecommendedProductCard
                            key={product.id}
                            product={product}
                            href={`/producto/${product.slug}`}
                            onCardClick={() => setShowCart(false)}
                            onAction={handleAddRecommendedToCart}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Resumen y botones - Tamaños optimizados */}
              <div className="border-t border-gray-200 bg-white p-3 sm:p-4 lg:p-5">
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
                    <div className="space-y-0.5 sm:space-y-1 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-gray-200">
                      <div className="flex justify-between text-[11px] sm:text-xs text-[#5d7276]">
                        <span>Subtotal original</span>
                        <span className="line-through">${originalTotal.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-[11px] sm:text-xs text-green-600 font-semibold">
                        <span>Descuento por suscripción</span>
                        <span>-${totalDiscount.toFixed(2)} MXN</span>
                      </div>
                    </div>
                  ) : null
                })()}
                
                <div className="flex justify-between mb-1.5 sm:mb-2 text-xs sm:text-sm">
                  <span className="text-[#5d7276]">Subtotal</span>
                  <span className="font-semibold text-[#16313b]">${calculateCartTotal().toFixed(2)} MXN</span>
                </div>
                
                <div className="flex justify-between mb-2 sm:mb-3 text-xs sm:text-sm">
                  <span className="text-[#5d7276]">Envío</span>
                  <span className="font-semibold">
                    {calculateCartTotal() >= 1000 ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      <span className="text-[#16313b]">$100.00 MXN</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-gray-200">
                  <span className="text-sm sm:text-base font-bold text-[#16313b]">Total</span>
                  <span className="text-lg sm:text-xl font-bold text-[#2a7880]">
                    ${(calculateCartTotal() >= 1000 ? calculateCartTotal() : calculateCartTotal() + 100).toFixed(2)} MXN
                  </span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Button
                    className="w-full bg-[#2a7880] hover:bg-[#1f5a61] text-white rounded-full py-3 sm:py-4 lg:py-5 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transition-all"
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
                    className="w-full rounded-full text-xs sm:text-sm border-gray-300 text-[#2a7880] hover:bg-gray-50 py-2.5 sm:py-3"
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
