"use client"

import { useState, useEffect } from "react"
import { Toaster } from "@/components/toaster"
import type { Filters } from "@/components/product-filters"
import { useCart } from "@/components/cart-context"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { ProductFeature } from "@/components/product-card"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductDetailModal } from "@/components/product-detail-modal"

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
  // Campos de suscripción
  subscription_available?: boolean
  subscription_types?: string[]
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number
  sale_type?: string
  weight_reference?: string
}

// Datos de fallback deshabilitados - solo mostrar productos reales de la base de datos
const fallbackProducts: Product[] = []

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 1000],
    features: [],
    sortBy: "relevance",
  })
  const [activeCategory, setActiveCategory] = useState("all")

  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get("categoria")

  // Determinar la categoría a mostrar basada en el parámetro de URL
  const categorySlug = categoriaParam || "all"

  // Cargar productos y categorías desde la base de datos
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")

        // Ignoramos el error de API key si podemos continuar
        if (categoriesError && categoriesError.message !== "Invalid API key") {
          console.warn("Error al cargar categorías:", categoriesError)
        }

        // Si no hay categorías, usar datos de fallback
        if (!categoriesData || categoriesData.length === 0) {
          setCategories([
            { id: 1, name: "Celebrar" },
            { id: 2, name: "Premiar" },
            { id: 3, name: "Complementar" },
          ])
        } else {
          setCategories(categoriesData)
        }

        // Cargar productos
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            *,
            categories(name)
          `)
          .order("created_at", { ascending: false })

        // Ignoramos el error de API key si podemos continuar
        if (productsError && productsError.message !== "Invalid API key") {
          console.warn("Error al cargar productos:", productsError)
        }

        // Si no hay productos, usar datos de fallback
        if (!productsData || productsData.length === 0) {
          setProducts(fallbackProducts)
          setFilteredProducts(fallbackProducts)
          return
        }

        // Procesar productos para agregar información adicional
        const processedProducts = await Promise.all(
          productsData.map(async (product) => {
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
              // Usar características predeterminadas en caso de error
              features = [
                { name: "Natural", color: "secondary" },
                { name: "Alta Calidad", color: "primary" },
              ]
            }

            // Construir la URL completa de la imagen
            let imageUrl = product.image
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
              try {
                // Si es una ruta relativa en el bucket de Supabase
                const { data } = supabase.storage.from("products").getPublicUrl(imageUrl)
                imageUrl = data.publicUrl
              } catch (error) {
                console.error("Error al obtener URL de imagen:", error)
                imageUrl = "/placeholder.svg"
              }
            } else if (!imageUrl) {
              // Imagen predeterminada si no hay imagen
              imageUrl = "/placeholder.svg"
            }

            // Parsear subscription_types si es un string JSON
            let subscriptionTypes = []
            if (product.subscription_types) {
              try {
                subscriptionTypes = typeof product.subscription_types === 'string' 
                  ? JSON.parse(product.subscription_types)
                  : product.subscription_types
              } catch (error) {
                console.error('Error parsing subscription_types:', error)
                subscriptionTypes = []
              }
            }

            return {
              ...product,
              image: imageUrl,
              category: categoryName,
              features,
              subscription_types: subscriptionTypes,
              rating: 4.5 + Math.random() * 0.5, // Rating aleatorio entre 4.5 y 5.0
              reviews: Math.floor(Math.random() * 100) + 50, // Número aleatorio de reseñas
              sizes: [], // Solo usar tamaños reales de la base de datos
            }
          }),
        )

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
      } catch (error: any) {
        console.warn("Error al cargar datos:", error)

        // No mostrar el error de API key al usuario si tenemos productos
        if (error?.message !== "Invalid API key" || products.length === 0) {
          setError("No se pudieron cargar los productos. Usando datos de muestra.")
          // Usar datos de fallback en caso de error
          setProducts(fallbackProducts)
          setFilteredProducts(fallbackProducts)
        }
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
      setFilteredProducts(filtered.length > 0 ? filtered : products)
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
  const maxPrice = Math.max(...products.map((product) => product.price), 100)

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <div className="responsive-container py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nuestras Recetas</h1>
        <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto text-center mb-12">
          Descubre nuestra selección de productos premium para mascotas, elaborados con ingredientes de la más alta
          calidad y diseñados para el bienestar de tu amigo peludo.
        </p>

        {/* Tabs para categorías */}
        <Tabs defaultValue="all" className="w-full mb-12" onValueChange={(value) => setActiveCategory(value)}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-transparent">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-full"
            >
              Todos
            </TabsTrigger>
            <TabsTrigger
              value="celebrar"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900 rounded-full"
            >
              Para Celebrar
            </TabsTrigger>
            <TabsTrigger
              value="premiar"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full"
            >
              Para Premiar
            </TabsTrigger>
            <TabsTrigger
              value="complementar"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-full"
            >
              Para Complementar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-8">
            <ProductCategoryLoader categorySlug="all" showAllCategories={true} />
          </TabsContent>

          <TabsContent value="celebrar" className="mt-8">
            <ProductCategoryLoader categorySlug="celebrar" />
          </TabsContent>

          <TabsContent value="premiar" className="mt-8">
            <ProductCategoryLoader categorySlug="premiar" />
          </TabsContent>

          <TabsContent value="complementar" className="mt-8">
            <ProductCategoryLoader categorySlug="complementar" />
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}
