"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Loader2 } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { Toaster } from "@/components/toaster"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { supabase } from "@/lib/supabase/client"
import type { ProductFeature } from "@/components/product-card"

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

export default function CelebrarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "celebrar",
    priceRange: [0, 1000],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  // Cargar productos de la categoría "Celebrar" desde la base de datos
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        // Primero obtenemos el ID de la categoría "Celebrar"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id")
          .eq("name", "Para Celebrar")
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
            const categoryName = product.categories?.name || "Para Celebrar"

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
                  { name: "Sin Conservantes", color: "secondary" },
                  { name: "Sabor Irresistible", color: "primary" },
                  { name: "Forma Divertida", color: "pastel-yellow" },
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
              imageUrl = "/happy-dog-birthday.png"
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
              spotlightColor: "rgba(255, 236, 179, 0.08)",
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
  const maxPrice = Math.max(...products.map((product) => product.price), 30)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Para Celebrar</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto">
              Snacks y premios especiales para esos momentos especiales con tu amigo peludo. Haz que cada celebración
              sea inolvidable con nuestros productos gourmet.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/para_celebrar.png" alt="Productos para celebrar" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-primary/80 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
                  Haz que cada momento sea especial
                </h2>
                <p className="text-white mb-6">Productos premium diseñados para celebraciones caninas</p>
                <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 font-medium rounded-full">
                  Ver ofertas especiales
                </Button>
              </div>
            </div>
          </div>

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

          {/* Productos de la categoría */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Productos destacados para celebrar</h2>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="ml-2 text-lg">Cargando productos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 rounded-xl bg-white/75 dark:bg-[rgba(0,0,0,0.2)] backdrop-blur-sm">
                {filteredProducts.length > 0 ? (
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
                      category="Para Celebrar"
                      spotlightColor="rgba(255, 236, 179, 0.08)"
                      onShowDetail={() => handleShowDetail(product)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 dark:text-white">No se encontraron productos en esta categoría.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección de beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display text-center">
              ¿Por qué elegir nuestros productos para celebrar?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/frosted-cake-icon.png" alt="Ingredientes naturales" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Ingredientes naturales</h3>
                <p className="text-gray-600 dark:text-white">
                  Elaborados con ingredientes de la más alta calidad, sin conservantes artificiales.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/colorful-party-hat.png" alt="Diseño festivo" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Diseño festivo</h3>
                <p className="text-gray-600 dark:text-white">
                  Formas y colores especiales para hacer cada celebración más divertida.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/simple-dog-paw.png" alt="Aprobado por veterinarios" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Aprobado por veterinarios</h3>
                <p className="text-gray-600 dark:text-white">
                  Formulados para ser seguros y saludables para tu mascota.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalle del producto */}
      {showDetail && selectedProduct && (
        <ProductDetailModal
          product={{
            ...selectedProduct,
            category: "Para Celebrar",
          }}
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
          categories={["celebrar"]}
          features={
            allFeatures.length > 0
              ? allFeatures
              : ["Natural", "Sin Conservantes", "Sabor Irresistible", "Forma Divertida"]
          }
          maxPrice={maxPrice}
        />
      )}
      <Toaster />
    </div>
  )
}
