"use client"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import type { ProductSize } from "@/lib/supabase/types"
import { LazyImage } from "@/components/lazy-image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/components/cart-context"

export type ProductFeature = {
  name: string
  color: string
}

export type ProductGalleryItem = {
  src: string
  alt: string
}

export type ProductCardDetailPayload = {
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
  gallery?: ProductGalleryItem[]
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
  onShowDetail?: (product: ProductCardDetailPayload) => void
  product_type?: 'simple' | 'variable'
  variantMinPrice?: number
  variantMaxPrice?: number
  className?: string
  useShadow?: boolean
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
  product_type,
  variantMinPrice,
  variantMaxPrice,
  className,
  useShadow = true,
}: ProductCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [showExpandedButton, setShowExpandedButton] = useState(false)
  const { addToCart } = useCart()

  // Efecto para expandir el botón después de 200ms de hover
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    if (isHovered) {
      timer = setTimeout(() => {
        setShowExpandedButton(true)
      }, 200)
    } else {
      setShowExpandedButton(false)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isHovered])

  const handleNavigate = () => {
    if (slug) {
      router.push(`/producto/${slug}`)
      return
    }

    if (onShowDetail) {
      onShowDetail({ id, name, description, image, rating, reviews, price, sizes, features, category, gallery })
    }
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Obtener el precio del producto
    const displayPrice = price || (sizes && sizes.length > 0 ? sizes[0].price : 0) || variantMinPrice || 0
    
    addToCart({
      id,
      name,
      price: displayPrice,
      image: image || "/placeholder.svg",
      size: sizes && sizes.length > 0 ? sizes[0].weight : "Único",
      quantity: 1,
      isSubscription: false,
      slug: slug,
    })
    
    // Navegar al producto después de agregar
    if (slug) {
      router.push(`/producto/${slug}`)
    }
  }

  // Determinar el texto de precio a mostrar
  const hasVariantRange =
    product_type === 'variable' &&
    typeof variantMinPrice === 'number' &&
    typeof variantMaxPrice === 'number' &&
    (variantMinPrice || 0) > 0

  let priceText: string | null = null
  if (hasVariantRange) {
    if (variantMinPrice !== variantMaxPrice) {
      priceText = `$${(variantMinPrice as number).toFixed(2)} - $${(variantMaxPrice as number).toFixed(2)} MXN`
    } else {
      priceText = `$${(variantMinPrice as number).toFixed(2)} MXN`
    }
  } else {
    const displayPrice = price || (sizes && Math.min(...sizes.map((size) => size.price))) || 0
    priceText = displayPrice > 0 ? `$${displayPrice.toFixed(2)} MXN` : null
  }

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
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-300 h-full flex flex-col bg-white dark:bg-gray-800 cursor-pointer",
        useShadow && "shadow-custom-card hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
      onClick={handleNavigate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagen del producto */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <LazyImage
          src={image || "/placeholder.svg"}
          alt={name}
          className={cn(
            "w-full h-full object-cover object-center transition-all duration-300",
            isHovered && "blur-[2px]"
          )}
        />
        
        {/* Botón carrito flotante con expansión */}
        <button
          onClick={handleAddToCart}
          className={cn(
            "absolute bottom-3 right-3 h-12 rounded-full bg-primary text-white shadow-lg transition-all duration-500 ease-out flex items-center justify-center gap-2 z-20 overflow-hidden group",
            "hover:scale-110 hover:-translate-y-1 hover:shadow-2xl",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            showExpandedButton ? "w-auto px-4 pr-5" : "w-12"
          )}
          aria-label={`Agregar ${name} al carrito`}
        >
          <ShoppingCart 
            className="h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-0.5" 
            strokeWidth={2} 
          />
          <span 
            className={cn(
              "whitespace-nowrap font-semibold text-sm transition-all duration-500 ease-out group-hover:scale-105",
              showExpandedButton ? "opacity-100 w-auto max-w-[200px]" : "opacity-0 w-0 max-w-0"
            )}
          >
            Añadir al carrito
          </span>
        </button>
      </div>

      {/* Contenido del producto */}
      <div className="p-4 flex flex-col flex-grow">
        <h2 className="font-bold text-sm mb-2 hover:text-primary transition-colors duration-200">
          {name}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
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
            {priceText && <span className="font-bold text-lg md:text-xl text-primary">{priceText}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
