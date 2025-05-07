"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/toaster"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Loader2 } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { ProductFeature } from "@/components/product-card"

// Tipo para los productos desde la base de datos
type Product = {
  id: number
  name: string
  description: string
  price: number
  image: string
  category_id: number
  stock: number
  created_at: string
  features?: ProductFeature[]
  rating?: number
  reviews?: number
  sizes?: { weight: string; price: number }[]
  category?: string
  gallery?: { src: string; alt: string }[]
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    priceRange: [0, 1000],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get("categoria")

  // Cargar productos y categorías desde la base de datos
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        // Cargar productos
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .order("created_at", { ascending: false })

        if (productsError) throw productsError

        // Procesar productos para agregar información adicional
        const processedProducts = await Promise.all(
          (productsData || []).map(async (product) => {
            // Obtener la categoría del producto
            const categoryName = product.categories?.name || "Sin categoría"

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
                  { name: "Natural", color: "secondary" },
                  { name: "Alta Calidad", color: "primary" },
                ]
              }
            } catch (error) {
              console.error("Error al cargar características:", error)
            }

            // Construir la URL completa de la imagen
            let imageUrl = product.image
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
              // Si es una ruta relativa en el bucket de Supabase
              const { data } = supabase.storage.from("products").getPublicUrl(imageUrl)
              imageUrl = data.publicUrl
            } else if (!imageUrl) {
              // Imagen predeterminada si no hay imagen
              imageUrl = "/placeholder.svg"
            }

            return {
              ...product,
              image: imageUrl,
              category: categoryName,
              features,
              rating: 4.5 + Math.random() * 0.5, // Rating aleatorio entre 4.5 y 5.0
              reviews: Math.floor(Math.random() * 100) + 50, // Número aleatorio de reseñas
              sizes: [
                { weight: "200g", price: product.price },
                { weight: "500g", price: product.price * 2.2 },
              ],
            }
          }),
        )

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrar productos por categoría del parámetro URL
  useEffect(() => {
    if (categoriaParam && products.length > 0) {
      const filtered = products.filter((product) => product.category?.toLowerCase() === categoriaParam.toLowerCase())
      setFilteredProducts(filtered)
    } else if (products.length > 0) {
      setFilteredProducts(products)
    }
  }, [categoriaParam, products])

  const handleShowDetail = (product: Product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...products]

    // Filtrar por categoría
    if (filters.category !== "all") {
      result = result.filter((product) => {
        return product.category?.toLowerCase() === filters.category.toLowerCase()
      })
    }

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

    // Filtrar por valoración
    if (filters.rating > 0) {
      result = result.filter((product) => (product.rating || 0) >= filters.rating)
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
    <div className="flex flex-col min-h-screen pt-20">
      <div className="responsive-container py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">
          {categoriaParam
            ? `Productos para ${categoriaParam.charAt(0).toUpperCase() + categoriaParam.slice(1)}`
            : "Todos Nuestros Productos"}
        </h1>
        <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto text-center mb-12">
          Descubre nuestra selección de alimentos premium para perros, elaborados con ingredientes naturales y de alta
          calidad.
        </p>
      </div>

      <div className="responsive-section bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
        <div className="responsive-container">
          {/* Controles de filtro */}
          <div className="mb-8 flex justify-between items-center">
            <Button
              variant="outline"
              className="rounded-full flex items-center gap-2"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" /> Filtrar
            </Button>
          </div>

          {/* Grid de productos */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="ml-2 text-lg">Cargando productos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        category: "all",
                        priceRange: [0, maxPrice],
                        features: [],
                        rating: 0,
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
                    onShowDetail={() => handleShowDetail(product)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle del producto */}
      {showDetail && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onAddToCart={addToCart}
        />
      )}

      {/* Modal de filtros */}
      {showFilters && (
        <ProductFilters
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          applyFilters={applyFilters}
          categories={["all", ...categories.map((c) => c.name.toLowerCase())]}
          features={allFeatures}
          maxPrice={maxPrice}
        />
      )}
      <Toaster />
    </div>
  )
}
