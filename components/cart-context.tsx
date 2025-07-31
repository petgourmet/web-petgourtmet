"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { useGoogleAnalytics } from "@/hooks/use-google-analytics"
import { useFacebookPixel } from "@/hooks/use-facebook-pixel"

import type { SubscriptionType } from "./product-card"

export type CartItem = {
  id: number
  name: string
  price: number
  image: string
  size: string
  quantity: number
  isSubscription: boolean
  subscriptionType?: SubscriptionType
  subscriptionDiscount?: number
}

type CartContextType = {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (index: number) => void
  updateCartItemQuantity: (index: number, newQuantity: number) => void
  clearCart: () => void
  calculateCartTotal: () => number
  showCart: boolean
  setShowCart: (show: boolean) => void
  showCheckout: boolean
  setShowCheckout: (show: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const { trackAddToCart, trackBeginCheckout } = useGoogleAnalytics()
  const { trackAddToCart: fbTrackAddToCart, trackInitiateCheckout } = useFacebookPixel()

  // Cargar carrito del localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error)
      }
    }
  }, [])

  // Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart])

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // Verificar si el producto ya está en el carrito con el mismo tamaño y tipo de compra
      const existingItemIndex = prevCart.findIndex(
        (cartItem) =>
          cartItem.id === item.id && cartItem.size === item.size && cartItem.isSubscription === item.isSubscription,
      )

      if (existingItemIndex !== -1) {
        // Si existe, actualizar la cantidad
        const updatedCart = [...prevCart]
        updatedCart[existingItemIndex].quantity += item.quantity
        toast({
          title: "Producto actualizado",
          description: `Se ha actualizado la cantidad de ${item.name} en tu carrito.`,
        })
        return updatedCart
      } else {
        // Si no existe, añadir nuevo item
        toast({
          title: "Producto añadido",
          description: `${item.name} ha sido añadido a tu carrito.`,
        })
        
        // Track add to cart event
        trackAddToCart(
          item.id.toString(),
          item.name,
          item.isSubscription ? "subscription" : "one-time",
          item.price,
          item.quantity
        )
        
        // Track Facebook Pixel add to cart
        fbTrackAddToCart(
          item.id.toString(),
          item.name,
          item.price,
          item.quantity
        )
        
        return [...prevCart, item]
      }
    })
  }

  const removeFromCart = (index: number) => {
    setCart((prevCart) => {
      const updatedCart = [...prevCart]
      updatedCart.splice(index, 1)
      return updatedCart
    })
  }

  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) => {
      const updatedCart = [...prevCart]
      updatedCart[index].quantity = newQuantity
      return updatedCart
    })
  }

  const clearCart = () => {
    setCart([])
  }

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => {
      const itemPrice = item.isSubscription
        ? item.price * 0.9 // 10% de descuento para suscripciones
        : item.price
      return total + itemPrice * item.quantity
    }, 0)
  }

  const handleSetShowCheckout = (show: boolean) => {
    setShowCheckout(show)
    
    // Track begin checkout when opening checkout
    if (show && cart.length > 0) {
      const total = calculateCartTotal()
      const items = cart.map(item => ({
        item_id: item.id.toString(),
        item_name: item.name,
        category: item.isSubscription ? "subscription" : "one-time",
        price: item.isSubscription ? item.price * 0.9 : item.price,
        quantity: item.quantity,
      }))
      
      trackBeginCheckout(total, items)
      
      // Track Facebook Pixel initiate checkout
      const contentIds = cart.map(item => item.id.toString())
      trackInitiateCheckout(total, cart.length, contentIds)
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        calculateCartTotal,
        showCart,
        setShowCart,
        showCheckout,
        setShowCheckout: handleSetShowCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
