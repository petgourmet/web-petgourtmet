"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Loader2 } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { ProductGridSkeleton } from "@/components/product-card-skeleton"
import { useCart } from "@/components/cart-context"
import { supabase } from "@/lib/supabase/client"
import { getOptimizedImageUrl, preloadCriticalImages } from "@/lib/image-optimization"
import type { ProductFeature } from "@/components/product-card"
import { useRouter } from "next/navigation"

// Tipo para los productos desde la base de datos
export type Product = {
  id: number
  name: string
  slug?: string
  description: string
  price: number
  image: string
  stock: number
  created_at: string
  category_id?: number
  features?: ProductFeature[]
  rating?: number
  reviews?: number
  sizes?: { weight: string; price: number }[]
  category?: string
  gallery?: { src: string; alt: string }[]
  ingredients?: string
  nutritionalInfo?: string
  nutritional_info?: string
  sellByWeight?: boolean
  weightReference?: string
  subscription_available?: boolean
  subscription_types?: ("biweekly" | "monthly" | "quarterly" | "annual")[]
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
  subscription?: {
    available: boolean
    options?: Array<{
      type: "biweekly" | "monthly" | "quarterly" | "annual"
      discount: number
    }>
  }
  spotlightColor?: string
}

// Datos de fallback por categoría
// Productos de fallback deshabilitados - solo mostrar productos reales de la base de datos
const FALLBACK_PRODUCTS: Record<string, Product[]> = {
  all: [],
  celebrar: [],
  complementar: [],
  premiar: [],
  recetas: [],
}

// Mapeo de categorías para la consulta a la base de datos
const CATEGORY_MAPPING: Record<string, { name: string; displayName: string; searchPattern: string }> = {
  all: { name: "all", displayName: "Todos los Productos", searchPattern: "%" },
  celebrar: { name: "celebrar", displayName: "Para Celebrar", searchPattern: "%celebrar%" },
  complementar: { name: "complementar", displayName: "Para Complementar", searchPattern: "%complementar%" },
  premiar: { name: "premiar", displayName: "Para Premiar", searchPattern: "%premi%" },
  recetas: { name: "recetas", displayName: "Nuestras Recetas", searchPattern: "%receta%" },
}

interface ProductCategoryLoaderProps {
  categorySlug: string
  title?: string
  description?: string
  showAllCategories?: boolean
}

export function ProductCategoryLoader({
  categorySlug,
  title,
  description,
  showAllCategories = false,
}: ProductCategoryLoaderProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
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

  // Obtener la información de la categoría
  const categoryInfo = CATEGORY_MAPPING[categorySlug] || CATEGORY_MAPPING.all

  // Cargar productos por categoría
  useEffect(() => {
    async function loadProductsByCategory() {
      setLoading(true)
      try {
        // Cargar categorías para el filtro
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")

        if (categoriesError) {
          console.error("Error al cargar categorías:", categoriesError.message)
          setCategories([
            { id: 1, name: "Celebrar" },
            { id: 2, name: "Premiar" },
            { id: 3, name: "Complementar" },
            { id: 4, name: "Recetas" },
          ])
        } else if (categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData)
        } else {
          setCategories([
            { id: 1, name: "Celebrar" },
            { id: 2, name: "Premiar" },
            { id: 3, name: "Complementar" },
            { id: 4, name: "Recetas" },
          ])
        }

        // Cargar productos según la categoría
        let categoryId = null

        // Si no es "all", filtrar por categoría
        if (categorySlug !== "all") {
          // Obtener el ID de la categoría
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .ilike("name", categoryInfo.searchPattern)
            .limit(1)

          if (categoryError) {
            console.error("Error al obtener la categoría:", categoryError.message)
          } else if (categoryData && categoryData.length > 0) {
            categoryId = categoryData[0].id
          }
        }

        // Ejecutar la consulta de productos
        let productsQuery = supabase.from("products").select(`
          *,
          categories(name),
          subscription_available,
          subscription_types,
          biweekly_discount,
          monthly_discount,
          quarterly_discount,
          annual_discount,
          weekly_mercadopago_url,
          biweekly_mercadopago_url,
          monthly_mercadopago_url,
          quarterly_mercadopago_url,
          annual_mercadopago_url
        `)

        // Si tenemos un ID de categoría, filtrar por él
        if (categoryId !== null) {
          productsQuery = productsQuery.eq("category_id", categoryId)
        }

        // Filtrar solo productos con stock mayor a 0
        productsQuery = productsQuery.gt('stock', 0)

        const { data: productsData, error: productsError } = await productsQuery.order("created_at", {
          ascending: false,
        })

        if (productsError) {
          console.error("Error al cargar productos:", productsError.message)
          setProducts([])
          setFilteredProducts([])
          setLoading(false)
          return
        }

        if (!productsData || productsData.length === 0) {
          console.log("No se encontraron productos para la categoría:", categorySlug)
          setProducts([])
          setFilteredProducts([])
          setLoading(false)
          return
        }

        // ✅ OPTIMIZACIÓN: Una sola consulta JOIN en lugar de N+1 queries
        const productIds = productsData.map(p => p.id)
        
        // Obtener todas las características de una vez
        const { data: allFeatures } = await supabase
          .from("product_features")
          .select("product_id, name, color")
          .in("product_id", productIds)
        
        // Obtener todas las imágenes de una vez
        const { data: allImages } = await supabase
          .from("product_images")
          .select("product_id, url, alt, display_order")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
        
        // Obtener todos los tamaños de una vez
        const { data: allSizes } = await supabase
          .from("product_sizes")
          .select("product_id, weight, price")
          .in("product_id", productIds)

        // Procesar productos con datos ya cargados
        const processedProducts = productsData.map((product) => {
          // Obtener la categoría del producto
          const categoryName = product.categories?.name || categoryInfo.displayName

          // Parsear subscription_types si es un string JSON
          let parsedSubscriptionTypes = product.subscription_types || []
          if (typeof product.subscription_types === 'string') {
            try {
              parsedSubscriptionTypes = JSON.parse(product.subscription_types)
            } catch (error) {
              console.error('Error parsing subscription_types for product', product.id, ':', error)
              parsedSubscriptionTypes = []
            }
          }

          // Filtrar características para este producto
          const features = allFeatures?.filter(f => f.product_id === product.id) || []

          // ✅ OPTIMIZACIÓN: Usar función optimizada para URLs de imágenes
          const imageUrl = getOptimizedImageUrl(product.image, 400, 85)

          // Filtrar imágenes para este producto
          const gallery = allImages?.filter(img => img.product_id === product.id)
            .map(img => ({
              src: img.url,
              alt: img.alt || `Imagen del producto ${product.name}`
            })) || []

          // Filtrar tamaños para este producto
          let sizes = allSizes?.filter(size => size.product_id === product.id) || []
          if (sizes.length === 0) {
            // Tamaños predeterminados si no hay datos
            sizes = [
              { weight: "200g", price: product.price },
              { weight: "500g", price: product.price * 2.2 },
            ]
          }

          // Determinar el color de spotlight según la categoría
          let spotlightColor = "rgba(249, 215, 232, 0.08)"
          if (categorySlug === "celebrar") {
            spotlightColor = "rgba(255, 236, 179, 0.08)"
          } else if (categorySlug === "complementar") {
            spotlightColor = "rgba(217, 245, 232, 0.3)"
          } else if (categorySlug === "premiar") {
            spotlightColor = "rgba(122, 184, 191, 0.2)"
          } else if (categorySlug === "recetas") {
            spotlightColor = "rgba(249, 215, 232, 0.3)"
          }

          return {
            ...product,
            image: imageUrl,
            category: categoryName,
            features,
            rating: product.rating || 4.5,
            reviews: product.reviews || Math.floor(Math.random() * 100) + 50,
            sizes,
            gallery,
            spotlightColor,
            subscription_types: parsedSubscriptionTypes,
          }
        })

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
        
        // ✅ OPTIMIZACIÓN: Precargar imágenes críticas (primera fila)
        const criticalImages = processedProducts.slice(0, 6).map(p => p.image).filter(Boolean)
        preloadCriticalImages(criticalImages)
      } catch (error) {
        console.error("Error al cargar productos:", error)
        setProducts([])
        setFilteredProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadProductsByCategory()
  }, [categorySlug])

  const router = useRouter()

  const handleShowDetail = (product: Product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  // Mapear el producto al tipo esperado por el modal
  const mapProductForModal = (product: Product) => ({
    ...product,
    ingredients: product.ingredients,
    nutritionalInfo: product.nutritional_info || product.nutritionalInfo,
    subscription_types: product.subscription_types || [],
    subscription_available: product.subscription_available || false,
    biweekly_discount: product.biweekly_discount,
    monthly_discount: product.monthly_discount,
    quarterly_discount: product.quarterly_discount,
    annual_discount: product.annual_discount,
    weekly_mercadopago_url: product.weekly_mercadopago_url,
    biweekly_mercadopago_url: product.biweekly_mercadopago_url,
    monthly_mercadopago_url: product.monthly_mercadopago_url,
    quarterly_mercadopago_url: product.quarterly_mercadopago_url,
    annual_mercadopago_url: product.annual_mercadopago_url,
    sizes: product.sizes?.map((size, index) => ({
      id: index + 1,
      product_id: product.id,
      weight: size.weight,
      price: size.price,
      stock: 100
    }))
  })

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
          product.features?.some((f) => f.name?.toLowerCase() === feature?.toLowerCase()),
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
  const maxPrice = Math.max(...products.map((product) => product.price), 100)

  return (
    <>
      {/* Controles de filtro */}
      <div className="mb-8 flex justify-between items-center">
        <Button variant="outline" className="rounded-full flex items-center gap-2" onClick={() => setShowFilters(true)}>
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      {/* Grid de productos */}
      {loading ? (
        <ProductGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4 rounded-xl bg-white/75 dark:bg-[rgba(0,0,0,0.2)] backdrop-blur-sm">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-white">
                No se encontraron productos que coincidan con los filtros seleccionados.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  setFilters({
                    priceRange: [0, maxPrice],
                    features: [],
                    sortBy: "relevance",
                  })
                  setFilteredProducts(products)
                }}
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                image={product.image}
                price={product.price}
                rating={product.rating}
                reviews={product.reviews}
                features={product.features}
                sizes={product.sizes}
                category={product.category}
                spotlightColor={product.spotlightColor}
                onShowDetail={() => handleShowDetail(product)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal de filtros */}
      <ProductFilters
        filters={filters}
        setFilters={setFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        applyFilters={applyFilters}
        features={allFeatures.length > 0 ? allFeatures : ["Natural", "Sin Conservantes", "Alta Calidad"]}
        maxPrice={maxPrice}
      />

      {/* Modal de detalle del producto */}
      {selectedProduct && (
        <ProductDetailModal
          product={mapProductForModal(selectedProduct)}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onAddToCart={addToCart}
        />
      )}
    </>
  )
}
