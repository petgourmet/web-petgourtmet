"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart-context"

export function CartButton() {
  const { cart, setShowCart } = useCart()

  return (
    <Button
      variant="default"
      size="icon"
      className="rounded-full bg-primary border border-white/30 text-white hover:bg-primary/90 hover:text-white transition-all duration-300 relative"
      onClick={() => setShowCart(true)}
    >
      <ShoppingCart className="h-5 w-5" />
      {cart.length > 0 && <Badge className="absolute -top-2 -right-2 bg-secondary text-white">{cart.length}</Badge>}
    </Button>
  )
}
