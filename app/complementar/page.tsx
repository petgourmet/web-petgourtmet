"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Loader2 } from "lucide-react"
import { Toaster } from "@/components/toaster"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { supabase } from "@/lib/supabase/client"
import type { ProductFeature } from "@/components/product-card"
import { ProductCategoryLoader } from "@/components/product-category-loader"

// Tipo para los productos desde la base de datos
type Product = {
  id: number
  name: string
  description: string
  price: number
  image: string
  stock: number
  created_at: string
  features?: ProductFeature[]
  rating?: number
  reviews?: number
  sizes?: { weight: string; price: number }[]
  category?: string
  gallery?: { src: string; alt: string }[]
}

export default function ComplementarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 1000],
    features: [],
    sortBy: "relevance",
  })

  // Cargar productos de la categoría "Complementar" desde la base de datos
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        // Primero obtenemos el ID de la categoría "Complementar"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", "%complementar%")
          .single()

        if (categoryError) {
          console.error("Error al obtener la categoría:", categoryError)
          setLoading(false)
          return
        }

        const categoryId = categoryData?.id

        // Obtenemos los productos que tienen esta categoría directamente por category_id
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: false })

        if (productsError) {
          console.error("Error al obtener productos por categoría:", productsError)
          setLoading(false)
          return
        }

        if (!productsData || productsData.length === 0) {
          setProducts([])
          setFilteredProducts([])
          setLoading(false)
          return
        }

        // Procesar productos para agregar información adicional
        const processedProducts = await Promise.all(
          productsData.map(async (product) => {
            // Obtener el nombre de la categoría
            const categoryName = product.categories?.name || "Para Complementar"

            // Obtener características del producto (si existe una tabla para esto)
            let features: ProductFeature[] = []
            try {
              const { data: featuresData } = await supabase
                .from("product_features")
                .select("name, color")
                .eq("product_id", product.id)

              if (featuresData && featuresData.length > 0) {
                features = featuresData
              } else {
                // Características predeterminadas si no hay datos
                features = [
                  { name: "Vitaminas A, D y E", color: "pastel-green" },
                  { name: "Omega 3 y 6", color: "primary" },
                  { name: "Fácil dosificación", color: "secondary" },
                ]
              }
            } catch (error) {
              console.error("Error al cargar características:", error)
            }

            // Obtener tamaños del producto desde la base de datos
            let sizes: { weight: string; price: number }[] = []
            try {
              const { data: sizesData, error: sizesError } = await supabase
                .from("product_sizes")
                .select("weight, price")
                .eq("product_id", product.id)

              if (sizesError) {
                console.error(`Error al cargar tamaños para el producto ${product.id}:`, sizesError.message)
              } else if (sizesData && sizesData.length > 0) {
                sizes = sizesData
              }
            } catch (error) {
              console.error(`Excepción al procesar tamaños para el producto ${product.id}:`, error)
            }

            // Construir la URL completa de la imagen
            let imageUrl = product.image
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
              // Si es una ruta relativa en el bucket de Supabase
              const { data } = supabase.storage.from("products").getPublicUrl(imageUrl)
              imageUrl = data.publicUrl
            } else if (!imageUrl) {
              // Imagen predeterminada si no hay imagen
              imageUrl = "/dog-supplement-display.png"
            }

            return {
              ...product,
              image: imageUrl,
              category: categoryName,
              features,
              rating: 4.5 + Math.random() * 0.5, // Rating aleatorio entre 4.5 y 5.0
              reviews: Math.floor(Math.random() * 100) + 50, // Número aleatorio de reseñas
              sizes, // Usar tamaños reales de la base de datos
              spotlightColor: "rgba(217, 245, 232, 0.3)",
            }
          }),
        )

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
      } catch (error) {
        console.error("Error al cargar productos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const handleShowDetail = (product: Product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...products]

    // Filtrar por rango de precio
    result = result.filter((product) => {
      return product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    })

    // Filtrar por características
    if (filters.features.length > 0) {
      result = result.filter((product) => {
        return filters.features.some((feature) =>
          product.features?.some((f) => f.name.toLowerCase() === feature.toLowerCase()),
        )
      })
    }

    // Ordenar productos
    if (filters.sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price)
    } else if (filters.sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price)
    } else if (filters.sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (filters.sortBy === "popularity") {
      result.sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
    }

    setFilteredProducts(result)
    setShowFilters(false)
  }

  // Extraer características únicas de todos los productos
  const allFeatures = Array.from(new Set(products.flatMap((product) => product.features?.map((f) => f.name) || [])))

  // Encontrar el precio máximo para el filtro
  const maxPrice = Math.max(...products.map((product) => product.price), 30)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      {/* Banner de categoría a ancho completo */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          src="/complementar-dog-treat.webp"
          alt="Productos para complementar"
          fill
          className="object-cover saturate-90 brightness-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 flex flex-col justify-center items-center text-center">
          <div className="w-full px-4 md:px-8 lg:px-16 flex-1 flex flex-col justify-center">
            <div className="max-w-4xl mx-auto"></div>
          </div>

          {/* Contenedor glass en la parte inferior */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-md border-t border-white/20 p-6 md:p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 title-reflection">Para Complementar</h2>
              <p className="text-white/90 text-lg">
                Suplementos y complementos nutricionales para asegurar la salud óptima de tu mascota. Productos de alta
                calidad para el bienestar completo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          {/* Productos de la categoría */}
          <div className="mb-12">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-green-700" />
                <span className="ml-2 text-lg">Cargando productos...</span>
              </div>
            ) : (
              <ProductCategoryLoader categorySlug="complementar" />
            )}
          </div>

          {/* Sección de beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(220,252,231,0.15)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-green-700 font-display text-center">
              Beneficios de nuestros suplementos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/simple-dog-paw.png" alt="Salud óptima" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Salud óptima</h3>
                <p className="text-gray-600 dark:text-white">
                  Formulados para cubrir todas las necesidades nutricionales de tu mascota.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/golden-grain-icon.png" alt="Ingredientes naturales" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Ingredientes naturales</h3>
                <p className="text-gray-600 dark:text-white">
                  Elaborados con ingredientes de la más alta calidad, sin aditivos artificiales.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/assorted-vegetables-icon.png" alt="Fácil administración" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Fácil administración</h3>
                <p className="text-gray-600 dark:text-white">
                  Diseñados para ser fáciles de administrar y con sabor agradable para tu mascota.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de filtros */}
      {showFilters && (
        <ProductFilters
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          applyFilters={applyFilters}
          features={
            allFeatures.length > 0
              ? allFeatures
              : ["Vitaminas", "Omega 3 y 6", "Antiinflamatorio", "Probióticos", "Articular"]
          }
          maxPrice={maxPrice}
        />
      )}

      {/* Modal de detalle del producto */}
      {showDetail && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onAddToCart={addToCart}
        />
      )}
      <Toaster />
    </div>
  )
}
