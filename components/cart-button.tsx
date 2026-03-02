"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function CartButton() {
  const { cart, setShowCart } = useCart()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            aria-label="Abrir carrito de compras"
            className="rounded-full bg-primary border border-white/30 text-white hover:bg-primary/90 hover:text-white transition-all duration-300 relative"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cart.length > 0 && <Badge className="absolute -top-2 -right-2 bg-secondary text-white">{cart.length}</Badge>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Carrito{cart.length > 0 ? ` (${cart.length})` : ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
