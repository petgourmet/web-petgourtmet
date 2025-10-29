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
import { enhancedCacheService } from '@/lib/cache-service-enhanced'
import type { ProductFeature } from "@/components/product-card"
import { useRouter } from "next/navigation"

// Configuración de paginación
const PRODUCTS_PER_PAGE = 12 // Cargar 12 productos por página
const INITIAL_LOAD = 6 // Cargar solo 6 productos inicialmente para mejorar el tiempo de carga

// Configuración de timeouts
const QUERY_TIMEOUT_MS = 6000 // 6 segundos timeout para consultas

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
  celebrar: { name: "celebrar", displayName: "Para Celebrar", searchPattern: "Para Celebrar" },
  complementar: { name: "complementar", displayName: "Para Complementar", searchPattern: "Para Complementar" },
  premiar: { name: "premiar", displayName: "Para Premiar", searchPattern: "Para Premiar" },
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
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]) // Para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 1000],
    features: [],
    sortBy: "relevance",
  })

  // Función para actualizar productos mostrados con paginación
  const updateDisplayedProducts = (allProducts: Product[], page: number = 1) => {
    const startIndex = 0
    const endIndex = page * PRODUCTS_PER_PAGE
    const productsToShow = allProducts.slice(startIndex, endIndex)
    
    setDisplayedProducts(productsToShow)
    setHasMoreProducts(endIndex < allProducts.length)
    setCurrentPage(page)
  }

  // Función para cargar más productos
  const loadMoreProducts = () => {
    if (loadingMore || !hasMoreProducts) return
    
    setLoadingMore(true)
    setTimeout(() => {
      updateDisplayedProducts(filteredProducts, currentPage + 1)
      setLoadingMore(false)
    }, 300) // Pequeño delay para mejor UX
  }

  // Timeout handling is now managed by CacheService

  // Obtener la información de la categoría
  const categoryInfo = CATEGORY_MAPPING[categorySlug] || CATEGORY_MAPPING.all

  // Cargar productos por categoría
  useEffect(() => {
    async function loadProductsByCategory() {
      console.log('🔄 [INICIO] Cargando productos para categoría:', categorySlug)
      setLoading(true)
      try {
        // Intentar obtener datos desde caché primero
        console.log('📦 Verificando caché...')
        const cachedCategories = enhancedCacheService.getCategories()
    const cachedProducts = enhancedCacheService.getProducts(categorySlug)
        
        if (cachedProducts && cachedCategories) {
          console.log('✅ Usando productos del caché:', cachedProducts.length)
          setCategories(cachedCategories)
          setProducts(cachedProducts)
          setFilteredProducts(cachedProducts)
          setLoading(false)
          console.log('🏁 [CACHE] Loading = false')
          return
        }
        
        console.log('❌ No hay caché, cargando desde Supabase...')


        // Cargar categorías para el filtro con timeout
        const categoriesPromise = supabase
          .from("categories")
          .select("id, name")
          .order("name")

        const { data: categoriesData, error: categoriesError } = await categoriesPromise

        if (categoriesError) {
          const fallbackCategories = [
            { id: 1, name: "Celebrar" },
            { id: 2, name: "Premiar" },
            { id: 3, name: "Complementar" },
            { id: 4, name: "Recetas" },
          ]
          setCategories(fallbackCategories)
          enhancedCacheService.setCategories(fallbackCategories)
        } else if (categoriesData && categoriesData.length > 0) {
          const categories = categoriesData || []
          setCategories(categories)
          enhancedCacheService.setCategories(categories)
        } else {
          const fallbackCategories = [
            { id: 1, name: "Celebrar" },
            { id: 2, name: "Premiar" },
            { id: 3, name: "Complementar" },
            { id: 4, name: "Recetas" },
          ]
          setCategories(fallbackCategories)
          enhancedCacheService.setCategories(fallbackCategories)
        }

        // Cargar productos según la categoría
        let categoryId = null

        // Si no es "all", filtrar por categoría
        if (categorySlug !== "all") {
          // Obtener el ID de la categoría con timeout
          const categoryPromise = supabase
            .from("categories")
            .select("id, name")
            .eq("name", categoryInfo.searchPattern)
            .limit(1)

          const { data: categoryData, error: categoryError } = await categoryPromise

          if (!categoryError && categoryData && categoryData.length > 0) {
            categoryId = categoryData[0].id
          }
        }

        // Ejecutar la consulta de productos
        let productsQuery = supabase.from("products").select(`
          id,
          name,
          slug,
          description,
          price,
          image,
          stock,
          created_at,
          category_id,
          rating,
          categories(name),
          subscription_available,
          subscription_types,
          biweekly_discount,
          monthly_discount,
          quarterly_discount,
          annual_discount,
          weekly_discount
        `)

        // Si tenemos un ID de categoría, filtrar por él
        if (categoryId !== null) {
          productsQuery = productsQuery.eq("category_id", categoryId)
        }

        // Filtrar solo productos con stock mayor a 0
        productsQuery = productsQuery.gt('stock', 0)

        const productsPromise = productsQuery.order("created_at", {
          ascending: false,
        })

        const { data: productsData, error: productsError } = await productsPromise

        if (productsError) {
          console.error('❌ Error cargando productos:', productsError)
          // Intentar usar productos de fallback si están disponibles
          const fallbackProducts = FALLBACK_PRODUCTS[categorySlug] || []
          setProducts(fallbackProducts.length > 0 ? fallbackProducts : [])
          setFilteredProducts(fallbackProducts.length > 0 ? fallbackProducts : [])
          setLoading(false)
          return
        }

        if (!productsData || productsData.length === 0) {
          console.log('ℹ️ No se encontraron productos')
          // Intentar usar productos de fallback si están disponibles
          const fallbackProducts = FALLBACK_PRODUCTS[categorySlug] || []
          setProducts(fallbackProducts)
          setFilteredProducts(fallbackProducts)
          setLoading(false)
          return
        }

        console.log('📦 Productos cargados desde DB:', productsData.length)

        // Procesar productos - sin consultas adicionales
        const processedProducts = (productsData as any[]).map((product: any) => {
          // Obtener la categoría del producto
          const categoryName = product.categories?.name || categoryInfo.displayName

          // Parsear subscription_types si es un string JSON
          let parsedSubscriptionTypes = product.subscription_types || []
          if (typeof product.subscription_types === 'string') {
            try {
              parsedSubscriptionTypes = JSON.parse(product.subscription_types)
            } catch {
              parsedSubscriptionTypes = []
            }
          }

          // ✅ OPTIMIZACIÓN: Usar función optimizada para URLs de imágenes
          const imageUrl = getOptimizedImageUrl(product.image, 400, 85)

          // Tamaños predeterminados
          const sizes = [
            { weight: "200g", price: product.price },
            { weight: "500g", price: product.price * 2.2 },
          ]

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
            features: [], // Sin features para mejorar rendimiento
            rating: product.rating || 4.5,
            reviews: 0, // Sin reviews para mejorar rendimiento
            sizes,
            gallery: [], // Sin gallery para mejorar rendimiento
            spotlightColor,
            subscription_types: parsedSubscriptionTypes,
          } as Product
        })

        console.log('✅ Productos procesados exitosamente:', processedProducts.length)
        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
        
        // Guardar productos en caché
        enhancedCacheService.setProducts(processedProducts, categorySlug)
        
        // ✅ OPTIMIZACIÓN: Precargar imágenes críticas (primera fila)
        const criticalImages = processedProducts.slice(0, 6).map(p => p.image).filter(Boolean)
        preloadCriticalImages(criticalImages)
        
        console.log('🎯 Productos y filteredProducts actualizados')
      } catch (error) {
        console.error('❌ Error en loadProductsByCategory:', error)
        setProducts([])
        setFilteredProducts([])
      } finally {
        console.log('🏁 Finally ejecutándose - setLoading(false)')
        setLoading(false)
        console.log('🔍 Estado después de setLoading(false):')
        // El log del estado será en el siguiente render
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

  // Log de debugging para el render
  console.log('🎨 RENDER - Estado:', {
    loading,
    productsCount: products.length,
    filteredProductsCount: filteredProducts.length
  })

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
