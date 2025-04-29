"use client"

import type React from "react"

import Image from "next/image"
import { Star, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpotlightCard } from "@/components/ui/spotlight-card"
import { CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "./cart-context"
import { useState } from "react"

export type ProductFeature = {
  name: string
  color: string
}

export type ProductSize = {
  weight: string
  price: number
}

export type ProductGalleryItem = {
  src: string
  alt: string
}

export type ProductCardProps = {
  id: number
  name: string
  description: string
  image: string
  rating?: number
  reviews?: number
  price?: number
  sizes?: ProductSize[]
  features?: ProductFeature[]
  category?: string
  spotlightColor?: string
  gallery?: ProductGalleryItem[]
  nutritionalInfo?: string
  ingredients?: string
  onShowDetail?: (product: any) => void
}

export function ProductCard({
  id,
  name,
  description,
  image,
  rating,
  reviews,
  price,
  sizes,
  features,
  category,
  spotlightColor,
  gallery,
  nutritionalInfo,
  ingredients,
  onShowDetail,
}: ProductCardProps) {
  const { addToCart } = useCart()
  const [isHovered, setIsHovered] = useState(false)

  // Determinar el color del spotlight basado en el tema
  const effectiveSpotlightColor = spotlightColor || "rgba(182, 125, 27, 0.2)" // Color ámbar por defecto

  // Determinar el precio a mostrar (si hay sizes, mostrar el menor)
  const displayPrice = price || (sizes && Math.min(...sizes.map((size) => size.price))) || 0

  // Función para añadir al carrito directamente (con el tamaño más pequeño si hay varios)
  const handleQuickAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se abra el modal de detalle

    const size = sizes ? sizes[0].weight : "Único"
    const itemPrice = sizes ? sizes[0].price : price || 0

    addToCart({
      id,
      name,
      price: itemPrice,
      image,
      size,
      quantity: 1,
      isSubscription: false,
    })
  }

  return (
    <SpotlightCard
      spotlightColor={effectiveSpotlightColor}
      className="overflow-hidden transition-all duration-500 hover:-translate-y-2 border-none rounded-2xl cursor-pointer shadow-md"
      onClick={() =>
        onShowDetail &&
        onShowDetail({
          id,
          name,
          description,
          image,
          rating,
          reviews,
          price,
          sizes,
          features,
          category,
          gallery,
          nutritionalInfo,
          ingredients,
        })
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-video relative overflow-hidden rounded-t-2xl">
        {category && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className={`bg-white/80 text-primary text-xs font-bold px-2 py-1 rounded-full shadow-sm`}>
              {category}
            </Badge>
          </div>
        )}
        <Image
          src={image || "/placeholder.svg"}
          alt={name}
          fill
          className={`object-cover transition-transform duration-500 ${isHovered ? "scale-105" : ""}`}
        />
      </div>
      <CardContent className="p-4 bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm">
        <h3 className="text-lg font-bold font-display mb-2 !text-primary dark:title-reflection">{name}</h3>

        {rating && (
          <div className="flex items-center mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-400"}`}
                />
              ))}
            </div>
            {reviews && <span className="ml-2 text-xs text-gray-500 dark:text-white">({reviews})</span>}
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-white mb-3 line-clamp-2">{description}</p>

        <div className="flex justify-between items-center">
          <span className="font-bold !text-primary dark:text-[#7a0c2e]">${displayPrice.toFixed(2)}</span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-primary dark:bg-[#7a0c2e] border-primary dark:border-[#7a0c2e] text-white dark:text-white hover:bg-transparent hover:text-primary dark:hover:bg-transparent dark:hover:text-[#7a0c2e]"
            onClick={handleQuickAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </div>
      </CardContent>
    </SpotlightCard>
  )
}
