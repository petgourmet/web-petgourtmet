"use client"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import type { ProductSize } from "@/lib/supabase/types"
import { LazyImage } from "@/components/lazy-image"
import { useRouter } from "next/navigation"

export type ProductFeature = {
  name: string
  color: string
}

export type ProductGalleryItem = {
  src: string
  alt: string
}

export type SubscriptionType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'

export type ProductCardProps = {
  id: number
  name: string
  slug?: string
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
  ingredients?: string
  nutritionalInfo?: string
  nutritional_info?: string
  subscription_available?: boolean
  subscription_types?: SubscriptionType[]
  subscription_discount?: number
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
  purchase_types?: string[]
  onShowDetail?: (product: any) => void
}

export function ProductCard({
  id,
  name,
  slug,
  description,
  image,
  rating,
  reviews,
  price,
  sizes,
  features,
  category,
  spotlightColor = "rgba(249, 215, 232, 0.08)",
  gallery,
  onShowDetail,
}: ProductCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  // Determinar el precio a mostrar (precio directo o el más bajo de los tamaños)
  const displayPrice = price || (sizes && Math.min(...sizes.map((size) => size.price))) || 0

  // Función para obtener el color de clase de Tailwind basado en el color de la característica
  const getFeatureColorClass = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-primary text-white"
      case "secondary":
        return "bg-secondary text-white"
      case "pastel-green":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
      case "pastel-blue":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
      case "pastel-yellow":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
    }
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col bg-white dark:bg-gray-800"
      style={{
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.07)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagen del producto */}
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ backgroundColor: spotlightColor, opacity: isHovered ? 0.2 : 0 }}
        ></div>
        <LazyImage
          src={image || "/placeholder.svg"}
          alt={name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isHovered ? "scale-110 brightness-[0.1]" : "scale-100"
          }`}
          width={400}
          height={300}
          priority={false}
        />
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => {
                if (slug) {
                  router.push(`/producto/${slug}`)
                } else {
                  // Fallback al modal si no hay slug (compatibilidad)
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
                    })
                }
              }}
              className="bg-white text-primary hover:bg-primary hover:text-white transition-colors duration-300 font-medium py-2 px-4 rounded-full"
            >
              Ver detalles
            </button>
          </div>
        )}
      </div>

      {/* Contenido del producto */}
      <div className="p-4 flex flex-col flex-grow">
        <h2 
          className="font-bold text-sm mb-2 cursor-pointer hover:text-primary transition-colors duration-200"
          onClick={() => {
            if (slug) {
              router.push(`/producto/${slug}`)
            } else {
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
                })
            }
          }}
        >
          {name}
        </h2>
        <p 
          className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 cursor-pointer hover:text-primary transition-colors duration-200"
          onClick={() => {
            if (slug) {
              router.push(`/producto/${slug}`)
            } else {
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
                })
            }
          }}
        >
          {description}
        </p>

        {/* Características del producto */}
        {features && features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {features.slice(0, 3).map((feature, index) => (
              <Badge key={index} className={`${getFeatureColorClass(feature.color)} text-xs`}>
                {feature.name}
              </Badge>
            ))}
            {features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{features.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Precio */}
        <div className="mt-auto pt-2 flex justify-between items-center">
          <div>
            {displayPrice > 0 && <span className="font-bold text-lg md:text-xl text-primary">${displayPrice.toFixed(2)} MXN</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
