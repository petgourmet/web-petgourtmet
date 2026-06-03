"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Loader2 } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductGridSkeleton } from "@/components/product-card-skeleton"
import { supabase } from "@/lib/supabase/client"
import { getOptimizedImageUrl, preloadCriticalImages } from "@/lib/image-optimization"
import type { ProductFeature } from "@/components/product-card"
import { enhancedCacheService } from "@/lib/cache-service-enhanced"

const PRODUCTS_PER_PAGE = 12
const INITIAL_LOAD = 6
const QUERY_TIMEOUT_MS = 3500
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 700
const AUTO_LOAD_ROOT_MARGIN = "700px 0px"

const CATEGORY_ID_MAP: Record<string, number> = {
  celebrar: 2,
  complementar: 3,
  premiar: 1,
  recetas: 4,
}

const inFlightCategoryRequests = new Map<string, Promise<Product[]>>()

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
  subscription_types?: ("weekly" | "biweekly" | "monthly" | "quarterly" | "annual")[]
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
  subscription?: {
    available: boolean
    options?: Array<{
      type: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual"
      discount: number
    }>
  }
  spotlightColor?: string
  product_type?: 'simple' | 'variable'
  variant_min_price?: number
  variant_max_price?: number
}

type ProductRow = {
  id: number
  name: string
  slug?: string | null
  description: string
  price: number
  image: string
  stock: number
  created_at: string
  category_id?: number | null
  rating?: number | null
  subscription_available?: boolean | null
  subscription_types?: Product["subscription_types"] | string | null
  weekly_discount?: number | null
  biweekly_discount?: number | null
  monthly_discount?: number | null
  quarterly_discount?: number | null
  annual_discount?: number | null
  product_type?: "simple" | "variable" | null
}

type VariantRow = {
  product_id: number
  price: number
  is_active: boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

function parseSubscriptionTypes(rawValue: ProductRow["subscription_types"]): Product["subscription_types"] {
  if (Array.isArray(rawValue)) {
    return rawValue
  }

  if (typeof rawValue === "string") {
    try {
      const parsedValue = JSON.parse(rawValue)
      return Array.isArray(parsedValue) ? parsedValue : []
    } catch {
      return []
    }
  }

  return []
}

function mapProducts(productsData: ProductRow[], variantRows: VariantRow[]): Product[] {
  const variantRangeMap = new Map<number, { min: number; max: number }>()

  for (const row of variantRows) {
    if (!row.is_active) {
      continue
    }

    const variantPrice = Number(row.price) || 0
    if (variantPrice <= 0) {
      continue
    }

    const currentRange = variantRangeMap.get(row.product_id)
    if (!currentRange) {
      variantRangeMap.set(row.product_id, { min: variantPrice, max: variantPrice })
      continue
    }

    if (variantPrice < currentRange.min) {
      currentRange.min = variantPrice
    }

    if (variantPrice > currentRange.max) {
      currentRange.max = variantPrice
    }
  }

  return productsData.map((product) => {
    const variantRange = variantRangeMap.get(product.id)

    return {
      id: product.id,
      name: product.name,
      slug: product.slug || undefined,
      description: product.description,
      price: product.price,
      image: getOptimizedImageUrl(product.image, 400, 85),
      stock: product.stock,
      category_id: product.category_id || undefined,
      created_at: product.created_at,
      rating: product.rating || 4.5,
      reviews: 0,
      features: [],
      sizes: [
        { weight: "200g", price: product.price },
        { weight: "500g", price: product.price * 2.2 },
      ],
      gallery: [],
      subscription_available: Boolean(product.subscription_available),
      subscription_types: parseSubscriptionTypes(product.subscription_types),
      biweekly_discount: product.biweekly_discount || undefined,
      monthly_discount: product.monthly_discount || undefined,
      quarterly_discount: product.quarterly_discount || undefined,
      annual_discount: product.annual_discount || undefined,
      weekly_discount: product.weekly_discount || undefined,
      product_type: product.product_type || undefined,
      variant_min_price: variantRange?.min,
      variant_max_price: variantRange?.max,
    }
  })
}

function applyProductFilters(sourceProducts: Product[], activeFilters: Filters) {
  let result = [...sourceProducts]

  result = result.filter((product) => {
    return product.price >= activeFilters.priceRange[0] && product.price <= activeFilters.priceRange[1]
  })

  if (activeFilters.features.length > 0) {
    result = result.filter((product) => {
      return activeFilters.features.some((feature) =>
        product.features?.some((productFeature) => productFeature.name?.toLowerCase() === feature?.toLowerCase()),
      )
    })
  }

  if (activeFilters.sortBy === "price-asc") {
    result.sort((a, b) => a.price - b.price)
  } else if (activeFilters.sortBy === "price-desc") {
    result.sort((a, b) => b.price - a.price)
  } else if (activeFilters.sortBy === "rating") {
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (activeFilters.sortBy === "popularity") {
    result.sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
  }

  return result
}

async function fetchProductsFromDatabase(categorySlug: string): Promise<Product[]> {
  let productsQuery = supabase
    .from("products")
    .select(`
      id, name, slug, description, price, image, stock, category_id, created_at,
      rating, subscription_available, subscription_types,
      biweekly_discount, monthly_discount, quarterly_discount,
      annual_discount, weekly_discount, product_type
    `)
    .gt("stock", 0)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })

  if (categorySlug !== "all") {
    const categoryId = CATEGORY_ID_MAP[categorySlug]
    if (categoryId) {
      productsQuery = productsQuery.eq("category_id", categoryId)
    }
  }

  const productsResponse = (await withTimeout(
    productsQuery,
    QUERY_TIMEOUT_MS,
    "La consulta de productos tardó demasiado.",
  )) as { data: ProductRow[] | null; error: { message?: string } | null }

  if (productsResponse.error) {
    throw new Error(productsResponse.error.message || "No se pudieron cargar los productos.")
  }

  const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : []
  if (productsData.length === 0) {
    return []
  }

  const variableProductIds = productsData.filter((product) => product.product_type === "variable").map((product) => product.id)
  let variantRows: VariantRow[] = []

  if (variableProductIds.length > 0) {
    const variantsResponse = (await withTimeout(
      supabase
        .from("product_variants")
        .select("product_id, price, is_active")
        .in("product_id", variableProductIds)
        .eq("is_active", true),
      QUERY_TIMEOUT_MS,
      "La consulta de variantes tardó demasiado.",
    )) as { data: VariantRow[] | null; error: { message?: string } | null }

    if (!variantsResponse.error && Array.isArray(variantsResponse.data)) {
      variantRows = variantsResponse.data
    }
  }

  return mapProducts(productsData, variantRows)
}

async function fetchProductsWithRetry(categorySlug: string): Promise<Product[]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await fetchProductsFromDatabase(categorySlug)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("No se pudieron cargar los productos.")

      if (attempt === MAX_RETRIES - 1) {
        break
      }

      await sleep(RETRY_BASE_DELAY_MS * (attempt + 1))
    }
  }

  throw lastError || new Error("No se pudieron cargar los productos.")
}

async function getCategoryProducts(categorySlug: string): Promise<Product[]> {
  const existingRequest = inFlightCategoryRequests.get(categorySlug)
  if (existingRequest) {
    return existingRequest
  }

  const request = fetchProductsWithRetry(categorySlug)
    .then((products) => {
      enhancedCacheService.setProducts(products, categorySlug)
      return products
    })
    .finally(() => {
      inFlightCategoryRequests.delete(categorySlug)
    })

  inFlightCategoryRequests.set(categorySlug, request)
  return request
}

interface ProductCategoryLoaderProps {
  categorySlug: string
  title?: string
  description?: string
  showAllCategories?: boolean
}

export function ProductCategoryLoader({
  categorySlug,
}: ProductCategoryLoaderProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 1000],
    features: [],
    sortBy: "relevance",
  })
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const syncDisplayedProducts = (allProducts: Product[], initialCount: number = INITIAL_LOAD) => {
    const visibleCount = Math.min(initialCount, allProducts.length)

    setDisplayedProducts(allProducts.slice(0, visibleCount))
    setHasMoreProducts(visibleCount < allProducts.length)
  }

  useEffect(() => {
    let isMounted = true

    async function loadProductsByCategory() {
      if (!isMounted) return

      const cachedProducts = enhancedCacheService.getProducts(categorySlug) as Product[] | null
      if (cachedProducts && cachedProducts.length > 0) {
        const cachedFilteredProducts = applyProductFilters(cachedProducts, filtersRef.current)
        setProducts(cachedProducts)
        setFilteredProducts(cachedFilteredProducts)
        syncDisplayedProducts(cachedFilteredProducts)
        setLoading(false)
        setError(null)

        const criticalImages = cachedFilteredProducts.slice(0, INITIAL_LOAD).map((product) => product.image).filter(Boolean)
        preloadCriticalImages(criticalImages)
      } else {
        setLoading(true)
      }

      try {
        if (!isMounted) return
        const freshProducts = await getCategoryProducts(categorySlug)
        const freshFilteredProducts = applyProductFilters(freshProducts, filtersRef.current)

        setProducts(freshProducts)
        setFilteredProducts(freshFilteredProducts)
        syncDisplayedProducts(freshFilteredProducts)
        setError(null)

        const criticalImages = freshFilteredProducts.slice(0, INITIAL_LOAD).map((product) => product.image).filter(Boolean)
        preloadCriticalImages(criticalImages)

      } catch (loadError) {
        console.error("Error cargando productos:", loadError)
        if (isMounted) {
          if (!cachedProducts || cachedProducts.length === 0) {
            setProducts([])
            setFilteredProducts([])
            setDisplayedProducts([])
            setHasMoreProducts(false)
            setError("No pudimos cargar los productos en este momento. Reintentamos automáticamente, pero aún falló.")
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProductsByCategory()

    return () => {
      isMounted = false
    }
  }, [categorySlug, retryToken])

  useEffect(() => {
    if (loading || loadingMore || !hasMoreProducts || !loadMoreRef.current) {
      return
    }

    const currentTarget = loadMoreRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadingMore(true)
          const nextVisibleCount = Math.min(displayedProducts.length + PRODUCTS_PER_PAGE, filteredProducts.length)
          setDisplayedProducts(filteredProducts.slice(0, nextVisibleCount))
          setHasMoreProducts(nextVisibleCount < filteredProducts.length)
          setLoadingMore(false)
        }
      },
      {
        rootMargin: AUTO_LOAD_ROOT_MARGIN,
        threshold: 0.01,
      },
    )

    observer.observe(currentTarget)

    return () => {
      observer.disconnect()
    }
  }, [displayedProducts.length, filteredProducts, hasMoreProducts, loading, loadingMore])

  const applyFilters = () => {
    const result = applyProductFilters(products, filters)
    setFilteredProducts(result)
    syncDisplayedProducts(result)
    setShowFilters(false)
  }

  const allFeatures = Array.from(new Set(products.flatMap((product) => product.features?.map((f) => f.name) || [])))
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
      ) : error && displayedProducts.length === 0 ? (
        <div className="rounded-xl border border-[#d9e7ea] bg-white/80 p-8 text-center shadow-sm">
          <p className="text-base text-[#486266]">{error}</p>
          <Button className="mt-4 rounded-full bg-[#7BBDC5] text-white hover:bg-[#69aeb8]" onClick={() => setRetryToken((current) => current + 1)}>
            Reintentar carga
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 rounded-xl bg-white/75 p-4 backdrop-blur-sm sm:grid-cols-2 md:grid-cols-3 dark:bg-[rgba(0,0,0,0.2)]">
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
                  syncDisplayedProducts(products)
                }}
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                description={product.description}
                image={product.image}
                price={product.price}
                rating={product.rating}
                reviews={product.reviews}
                features={product.features}
                category={product.category}
                spotlightColor={product.spotlightColor}
                product_type={product.product_type}
                variantMinPrice={product.variant_min_price}
                variantMaxPrice={product.variant_max_price}
              />
            ))
          )}
          </div>

          {(hasMoreProducts || loadingMore) && filteredProducts.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-sm text-[#486266]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando más productos...
                </div>
              ) : (
                <span className="text-xs text-[#789195]">Desplázate para cargar más productos</span>
              )}
            </div>
          )}
        </>
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
    </>
  )
}
