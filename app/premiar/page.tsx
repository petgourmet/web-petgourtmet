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
import type { Product } from "@/types/product" // Import the Product type

// Tipo para los productos desde la base de datos
// type Product = {
//   id: number
//   name: string
//   description: string
//   price: number
//   image: string
//   stock: number
//   created_at: string
//   features?: ProductFeature[]
//   rating?: number
//   reviews?: number
//   sizes?: { weight: string; price: number }[]
//   category?: string
//   gallery?: { src: string; alt: string }[]
// }

export default function PremiarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null) // Fixed the declaration
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "premiar",
    priceRange: [0, 1000],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  // Cargar productos de la categoría "Premiar" desde la base de datos
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        // Primero obtenemos el ID de la categoría "Premiar"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", "%premi%")
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
            const categoryName = product.categories?.name || "Para Premiar"

            // Obtener características del producto (si existe una tabla para esto)
            let features: ProductFeature[] = []
            try {
              const { data: featuresData, error: featuresError } = await supabase
                .from("product_features")
                .select("name, color")
                .eq("product_id", product.id)

              if (featuresError) {
                console.error(`Error al cargar características para el producto ${product.id}:`, featuresError.message)
                // Opcionalmente, puedes dejar 'features' como un array vacío o asignar un valor por defecto si es crucial
                // features = []; // o alguna característica de fallback si es necesario
              } else if (featuresData && featuresData.length > 0) {
                features = featuresData
              }
              // Ya no hay un 'else' que asigne características de fallback si no se encuentran,
              // permitiendo que se muestre vacío si un producto realmente no tiene características.
              // Si quieres un fallback general para productos sin características, puedes añadirlo aquí.
              // else {
              //   features = [{ name: "Sin características", color: "default" }];
              // }
            } catch (error) {
              console.error(`Excepción al procesar características para el producto ${product.id}:`, error)
              // Manejo de error en caso de una excepción en el bloque try
              // features = []; // o alguna característica de fallback
            }

            // Construir la URL completa de la imagen
            let imageUrl = product.image
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
              // Si es una ruta relativa en el bucket de Supabase
              const { data } = supabase.storage.from("products").getPublicUrl(imageUrl)
              imageUrl = data.publicUrl
            } else if (!imageUrl) {
              // Imagen predeterminada si no hay imagen
              imageUrl = "/healthy-dog-training-treats.png"
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
                { weight: "500g", price: product.price * 1.8 },
              ],
              spotlightColor: "rgba(122, 184, 191, 0.2)",
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
  const maxPrice = Math.max(...products.map((product) => product.price), 20)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      {/* Banner de categoría a ancho completo */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20premiar-3zEy8fX4CSDDrmAnYIJpl2cV1t26l3.webp"
          alt="Productos para premiar"
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
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 title-reflection">Para Premiar</h2>
              <p className="text-white/90 text-lg">
                Deliciosos premios y golosinas para recompensar a tu mascota. Perfectos para entrenamiento o simplemente
                para consentir a tu amigo peludo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
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
            <div></div> {/* Empty div to maintain spacing */}
          </div>

          {/* Productos de la categoría */}
          <div className="mb-12">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-700" />
                <span className="ml-2 text-lg">Cargando productos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4 rounded-xl bg-white/75 dark:bg-[rgba(0,0,0,0.2)] backdrop-blur-sm">
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
                      category={product.category}
                      spotlightColor="rgba(122, 184, 191, 0.2)"
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
          categories={["premiar"]}
          features={
            allFeatures.length > 0
              ? allFeatures
              : ["Bajo en Calorías", "Sin Conservantes", "Sabor Irresistible", "Dental", "Entrenamiento"]
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
