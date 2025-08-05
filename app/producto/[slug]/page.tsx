"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCart } from "@/components/cart-context"
import {
  ShoppingCart,
  Check,
  Minus,
  Plus,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CreditCard,
  Calendar,
  Info,
} from "lucide-react"
import Link from "next/link"
import type { Product } from "@/components/product-category-loader"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function ProductDetailPage() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const productId = searchParams.get("id")

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSize, setSelectedSize] = useState<{ weight: string; price: number } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isSubscription, setIsSubscription] = useState(false)
  const [subscriptionType, setSubscriptionType] = useState<"biweekly" | "monthly" | "quarterly" | "annual">("monthly")
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })

  const { addToCart } = useCart()
  const imageContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadProductDetails() {
      setLoading(true)
      setError(null)

      if (!supabase) {
        console.error("Supabase client not initialized")
        setError("Error de conexión con la base de datos")
        setLoading(false)
        return
      }

      try {
        if (!productId) {
          throw new Error("ID de producto no proporcionado")
        }

        // Cargar datos del producto
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .eq("id", productId)
          .single()

        if (productError) {
          throw productError
        }

        if (!productData) {
          console.error("Producto no encontrado, ID:", productId)
          setError(`Producto con ID ${productId} no encontrado`)
          setLoading(false)
          return
        }

        // Cargar características del producto
        const { data: featuresData } = await supabase
          .from("product_features")
          .select("name, color")
          .eq("product_id", productId)

        // Cargar tamaños/precios del producto
        const { data: sizesData } = await supabase
          .from("product_sizes")
          .select("weight, price")
          .eq("product_id", productId)

        // Cargar galería de imágenes
        const { data: galleryData } = await supabase
          .from("product_images")
          .select("url, alt")
          .eq("product_id", productId)

        // Construir la URL completa de la imagen
        let imageUrl = productData.image
        if (imageUrl) {
          if (!imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
            try {
              const { data } = supabase.storage.from("products").getPublicUrl(imageUrl)
              imageUrl = data.publicUrl
            } catch (error) {
              console.error("Error al obtener URL de imagen:", error)
              imageUrl = `/placeholder.svg?text=${encodeURIComponent(productData.name)}`
            }
          }
        } else {
          imageUrl = `/placeholder.svg?text=${encodeURIComponent(productData.name)}`
        }

        // Procesar galería de imágenes
        const gallery = galleryData
          ? galleryData.map((img) => ({
              src: img.url.startsWith("http")
                ? img.url
                : supabase.storage.from("products").getPublicUrl(img.url).data.publicUrl,
              alt: img.alt || productData.name,
            }))
          : []

        // Construir el objeto de producto completo
        const processedProduct: Product = {
          ...productData,
          image: imageUrl,
          category: productData.categories?.name || "Sin categoría",
          features: featuresData || [],
          sizes: sizesData || [
            { weight: "200g", price: productData.price },
            { weight: "500g", price: productData.price * 2.2 },
          ],
          gallery: gallery,
          subscription: {
            available: productData.subscription_available || false,
            options: [
              { type: "monthly", discount: 10 },
              { type: "quarterly", discount: 15 },
              { type: "annual", discount: 20 },
            ],
          },
          sale_type: productData.sale_type,
          weight_reference: productData.weight_reference,
          subscription_available: productData.subscription_available,
          subscription_types: productData.subscription_types,
          subscription_discount: productData.subscription_discount,
          nutritional_info: productData.nutritional_info,
        }

        setProduct(processedProduct)

        // Establecer el tamaño predeterminado
        if (processedProduct.sizes && processedProduct.sizes.length > 0) {
          setSelectedSize(processedProduct.sizes[0])
        }
      } catch (error: any) {
        console.error("Error al cargar detalles del producto:", error)
        // Log more detailed information about the error
        if (error.message) console.error("Error message:", error.message)
        if (error.code) console.error("Error code:", error.code)
        if (error.details) console.error("Error details:", error.details)

        setError(error.message || "Error al cargar el producto")
      } finally {
        setLoading(false)
      }
    }

    loadProductDetails()
  }, [productId])

  const handleAddToCart = () => {
    if (!product) return

    const price = selectedSize ? selectedSize.price : product.price
    const sizeWeight = selectedSize ? selectedSize.weight : "Único"

    addToCart({
      id: product.id,
      name: product.name,
      price,
      image: product.image,
      size: sizeWeight,
      quantity,
      isSubscription,
      subscriptionType: isSubscription ? subscriptionType : undefined,
      // Incluir URLs de MercadoPago específicas del producto
      weekly_mercadopago_url: product.weekly_mercadopago_url,
      biweekly_mercadopago_url: product.biweekly_mercadopago_url,
      monthly_mercadopago_url: product.monthly_mercadopago_url,
      quarterly_mercadopago_url: product.quarterly_mercadopago_url,
      annual_mercadopago_url: product.annual_mercadopago_url,
    })
  }

  const incrementQuantity = () => setQuantity((prev) => prev + 1)
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const nextImage = () => {
    if (!product || !product.gallery) return
    const allImages = [{ src: product.image, alt: product.name }, ...product.gallery]
    setActiveImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    if (!product || !product.gallery) return
    const allImages = [{ src: product.image, alt: product.name }, ...product.gallery]
    setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  // Calcular el descuento según el tipo de suscripción
  const getSubscriptionDiscount = () => {
    if (!isSubscription || !product) return 0
    
    switch (subscriptionType) {
      case "weekly":
        return (product.weekly_discount || 0) / 100
      case "biweekly":
        return (product.biweekly_discount || 0) / 100
      case "monthly":
        return (product.monthly_discount || 0) / 100
      case "quarterly":
        return (product.quarterly_discount || 0) / 100
      case "annual":
        return (product.annual_discount || 0) / 100
      default:
        return 0
    }
  }

  // Calcular el precio final
  const calculateFinalPrice = () => {
    if (!product) return 0

    const basePrice = selectedSize ? selectedSize.price : product.price
    const discount = getSubscriptionDiscount()

    return basePrice * quantity * (isSubscription ? 1 - discount : 1)
  }

  // Obtener texto de frecuencia de cobro
  const getSubscriptionFrequencyText = () => {
    switch (subscriptionType) {
      case "weekly":
        return "semanalmente"
      case "biweekly":
        return "cada 15 días"
      case "monthly":
        return "mensualmente"
      case "quarterly":
        return "cada 3 meses"
      case "annual":
        return "anualmente"
      default:
        return "regularmente"
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen pt-20">
        <div className="responsive-container py-8 flex justify-center items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-lg">Cargando detalles del producto...</span>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen pt-20">
        <div className="responsive-container py-8">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error al cargar el producto</h1>
            <p className="text-red-500 dark:text-red-300">{error || "No se pudo encontrar el producto solicitado"}</p>
            <Link href="/productos" className="mt-6 inline-block">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a productos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Combinar imagen principal con imágenes adicionales
  const allImages = [{ src: product.image, alt: product.name }, ...product.gallery].filter(
    (img) => img.src && img.src.trim() !== "",
  )

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <div className="responsive-container py-8">
        {/* Breadcrumb y navegación */}
        <div className="mb-6">
          <Link
            href="/productos"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a productos
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
            {/* Galería de imágenes */}
            <div className="space-y-4">
              {/* Imagen principal con zoom */}
              <div className="relative">
                <div
                  className="aspect-square relative rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in group"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                  ref={imageContainerRef}
                >
                  <Image
                    src={allImages[activeImageIndex]?.src || "/placeholder.svg"}
                    alt={allImages[activeImageIndex]?.alt || product.name}
                    fill
                    className={`object-cover transition-transform duration-200 ${isZoomed ? "scale-150" : "scale-100"}`}
                    style={
                      isZoomed
                        ? {
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                          }
                        : {}
                    }
                  />

                  {/* Indicador de zoom */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-4 w-4" />
                  </div>

                  {/* Navegación de imágenes */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Miniaturas */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        idx === activeImageIndex
                          ? "border-[#7BBDC5] ring-2 ring-[#7BBDC5]/30"
                          : "border-gray-200 hover:border-[#7BBDC5]/50"
                      }`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <Image
                        src={img.src || "/placeholder.svg"}
                        alt={img.alt || `Imagen ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Información adicional en móvil */}
              <div className="lg:hidden mt-8">
                {/* Stock */}
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      product.stock > 10
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : product.stock > 0
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {product.stock > 10
                      ? "En stock"
                      : product.stock > 0
                        ? `Quedan ${product.stock} unidades`
                        : "Agotado"}
                  </span>
                </div>

                {/* Categoría */}
                {product.category && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Categoría:</span>
                    <Link href={`/productos?categoria=${product.category.toLowerCase()}`}>
                      <Badge variant="outline" className="ml-2">
                        {product.category}
                      </Badge>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Información del producto */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-[#7BBDC5] font-display mb-2">{product.name}</h1>

                {/* Categoría y stock en desktop */}
                <div className="hidden lg:flex items-center justify-between mb-4">
                  {product.category && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Categoría:</span>
                      <Link href={`/productos?categoria=${product.category.toLowerCase()}`}>
                        <Badge variant="outline" className="ml-2">
                          {product.category}
                        </Badge>
                      </Link>
                    </div>
                  )}

                  {/* Stock */}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      product.stock > 10
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : product.stock > 0
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {product.stock > 10
                      ? "En stock"
                      : product.stock > 0
                        ? `Quedan ${product.stock} unidades`
                        : "Agotado"}
                  </span>
                </div>

                <div className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown>{product.description}</ReactMarkdown>
                </div>

                {product.features && product.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {product.features.map((feature, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-[#7BBDC5]/10 text-[#7BBDC5] border-[#7BBDC5]/30 px-3 py-1"
                      >
                        {feature.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Información de venta por peso */}
                {product.sellByWeight && (
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Este producto se vende por peso.
                      {product.weightReference && ` Precio de referencia: ${product.weightReference}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Selección de tamaño */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3 text-lg">Tamaño</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size, idx) => (
                      <Button
                        key={idx}
                        variant={selectedSize === size ? "default" : "outline"}
                        className={`rounded-full px-6 py-3 ${
                          selectedSize === size
                            ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                            : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                        }`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size.weight} - ${size.price.toFixed(2)} MXN
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de compra */}
              <div>
                <h3 className="font-bold mb-3 text-lg">Tipo de compra</h3>
                <div className="flex gap-3">
                  <Button
                    variant={!isSubscription ? "default" : "outline"}
                    className={`rounded-full px-6 py-3 ${
                      !isSubscription
                        ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                        : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                    }`}
                    onClick={() => setIsSubscription(false)}
                  >
                    Compra única
                  </Button>
                  {/* Botón temporalmente oculto */}
                  {false && (
                    <Button
                      variant={isSubscription ? "default" : "outline"}
                      className={`rounded-full px-6 py-3 ${
                        isSubscription
                          ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                          : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                      }`}
                      onClick={() => setIsSubscription(true)}
                      disabled={!product.subscription_available}
                    >
                      Repetir compra
                    </Button>
                  )}
                </div>
                {/* Opciones de suscripción */}
                {isSubscription && product.subscription_available && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium mb-2">Frecuencia de entrega:</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {product.subscription_types && product.subscription_types.includes("weekly") && (
                        <Button
                          size="sm"
                          variant={subscriptionType === "weekly" ? "default" : "outline"}
                          className={`rounded-full ${
                            subscriptionType === "weekly"
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSubscriptionType("weekly")}
                        >
                          Cada semana (-{product.weekly_discount || 15}%)
                        </Button>
                      )}
                      {product.subscription_types && product.subscription_types.includes("biweekly") && (
                        <Button
                          size="sm"
                          variant={subscriptionType === "biweekly" ? "default" : "outline"}
                          className={`rounded-full ${
                            subscriptionType === "biweekly"
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSubscriptionType("biweekly")}
                        >
                          Cada 15 días (-{product.biweekly_discount || 20}%)
                        </Button>
                      )}
                      {product.subscription_types && product.subscription_types.includes("monthly") && (
                        <Button
                          size="sm"
                          variant={subscriptionType === "monthly" ? "default" : "outline"}
                          className={`rounded-full ${
                            subscriptionType === "monthly"
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSubscriptionType("monthly")}
                        >
                          Cada mes (-{product.monthly_discount || 15}%)
                        </Button>
                      )}
                      {product.subscription_types && product.subscription_types.includes("quarterly") && (
                        <Button
                          size="sm"
                          variant={subscriptionType === "quarterly" ? "default" : "outline"}
                          className={`rounded-full ${
                            subscriptionType === "quarterly"
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSubscriptionType("quarterly")}
                        >
                          Cada 3 meses (-{product.quarterly_discount || 10}%)
                        </Button>
                      )}
                      {product.subscription_types && product.subscription_types.includes("annual") && (
                        <Button
                          size="sm"
                          variant={subscriptionType === "annual" ? "default" : "outline"}
                          className={`rounded-full ${
                            subscriptionType === "annual"
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSubscriptionType("annual")}
                        >
                          Cada año (-{product.annual_discount || 5}%)
                        </Button>
                      )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-700 dark:text-blue-300">
                          Se registrará tu tarjeta de crédito para realizar cobros {getSubscriptionFrequencyText()}{" "}
                          según el plan seleccionado.
                        </p>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-700 dark:text-blue-300">
                          El primer cobro se realizará hoy, y los siguientes se harán {getSubscriptionFrequencyText()} a
                          partir de esta fecha.
                        </p>
                      </div>

                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-700 dark:text-blue-300">
                          Puedes gestionar tus suscripciones, cancelarlas o eliminar tu información de pago en cualquier
                          momento desde tu{" "}
                          <Link href="/perfil" className="underline font-medium">
                            perfil de usuario
                          </Link>
                          .
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-green-600 flex items-center mt-4">
                      <Check className="h-3 w-3 inline mr-1" />
                      Ahorro del {(getSubscriptionDiscount() * 100).toFixed(0)}% aplicado
                    </p>
                  </div>
                )}

                {!product.subscription_available && isSubscription && (
                  <p className="text-sm text-amber-600 mt-2">Este producto no está disponible para suscripción.</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <h3 className="font-bold mb-3 text-lg">Cantidad</h3>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10 w-12 h-12"
                    onClick={decrementQuantity}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10 w-12 h-12"
                    onClick={incrementQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Precio y botón de compra */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Precio total:</p>
                    <p className="text-3xl font-bold text-[#7BBDC5]">
                      $
                      {(
                        (selectedSize ? selectedSize.price : product.price || 0) *
                        quantity *
                        (isSubscription ? 1 - getSubscriptionDiscount() : 1)
                      ).toFixed(2)}{" "}
                      MXN
                    </p>
                    {isSubscription && (
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <Check className="h-3 w-3 inline mr-1" />
                        Ahorro del {(getSubscriptionDiscount() * 100).toFixed(0)}% aplicado
                      </p>
                    )}
                  </div>
                  <Button
                    className="rounded-full bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white px-8 py-4 text-lg font-semibold"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Añadir al carrito
                  </Button>
                </div>
              </div>

              {/* Información adicional */}
              {(product.ingredients || product.nutritional_info) && (
                <Tabs defaultValue="ingredients" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                    <TabsTrigger value="nutritional">Información Nutricional</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="ingredients"
                    className="p-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="whitespace-pre-wrap">
                      {product.ingredients || "Información no disponible"}
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="nutritional"
                    className="p-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="whitespace-pre-wrap">
                      {product.nutritional_info || "Información no disponible"}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
