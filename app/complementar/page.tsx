"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Check, Loader2 } from "lucide-react"
import { ProductCard } from "@/components/product-card"
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

// Características predeterminadas para productos de tipo "Complementar"
const DEFAULT_COMPLEMENTAR_FEATURES: ProductFeature[] = [
  { name: "Vitaminas A, D y E", color: "pastel-green" },
  { name: "Omega 3 y 6", color: "primary" },
  { name: "Fácil dosificación", color: "secondary" },
]

export default function ComplementarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "complementar",
    priceRange: [0, 1000],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  // Cargar productos de la categoría "Complementar" desde la base de datos
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      setError(null)
      try {
        // Primero obtenemos el ID de la categoría "Complementar" usando ilike para búsqueda insensible a mayúsculas/minúsculas
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .ilike("name", "%complementar%")

        if (categoryError) {
          console.error("Error al obtener la categoría:", categoryError)
          setError(`Error al obtener la categoría: ${categoryError.message}`)
          setLoading(false)
          return
        }

        if (!categoryData || categoryData.length === 0) {
          console.error("No se encontró la categoría 'Complementar'")
          setError("No se encontró la categoría 'Complementar'")
          setLoading(false)
          return
        }

        // Usamos el primer resultado que coincida (podría haber varios)
        const categoryId = categoryData[0].id
        const categoryName = categoryData[0].name
        console.log(`Categoría encontrada: ${categoryName} (ID: ${categoryId})`)

        // Luego obtenemos los productos de esa categoría
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: false })

        if (productsError) {
          console.error("Error al obtener productos:", productsError)
          setError(`Error al obtener productos: ${productsError.message}`)
          setLoading(false)
          return
        }

        if (!productsData || productsData.length === 0) {
          console.log("No se encontraron productos en la categoría")
          setProducts([])
          setFilteredProducts([])
          setLoading(false)
          return
        }

        // Procesar productos para agregar información adicional
        const processedProducts = productsData.map((product) => {
          // Usar características predeterminadas ya que la tabla product_features no existe
          const features = DEFAULT_COMPLEMENTAR_FEATURES

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
            category: product.categories?.name || categoryName,
            features,
            rating: 4.5 + Math.random() * 0.5, // Rating aleatorio entre 4.5 y 5.0
            reviews: Math.floor(Math.random() * 100) + 50, // Número aleatorio de reseñas
            sizes: [
              { weight: product.price < 20 ? "30 tabletas" : "30 sobres", price: product.price },
              { weight: product.price < 20 ? "60 tabletas" : "60 sobres", price: product.price * 1.8 },
            ],
            spotlightColor: "rgba(217, 245, 232, 0.3)",
          }
        })

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
      } catch (error: any) {
        console.error("Error al cargar productos:", error)
        setError(`Error al cargar productos: ${error.message || "Error desconocido"}`)
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
  const maxPrice = Math.max(...products.map((product) => product.price), 50)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Para Complementar</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto">
              Suplementos nutricionales y aditivos para mejorar la dieta diaria de tu perro. Potencia su salud y
              bienestar con nuestros complementos premium.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/para_complementar.png" alt="Suplementos para perros" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-pastel-green/80 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Nutrición avanzada</h2>
                <p className="text-white mb-6">Complementos desarrollados por expertos en nutrición canina</p>
                <Button className="bg-green-400 text-gray-900 hover:bg-green-500 font-medium rounded-full">
                  Consulta nutricional
                </Button>
              </div>
            </div>
          </div>

          {/* Controles de filtro y ordenación */}
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
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Suplementos recomendados</h2>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="ml-2 text-lg">Cargando productos...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-20 text-red-500">
                <p>{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      spotlightColor="rgba(217, 245, 232, 0.3)"
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

          {/* Sección informativa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md">
              <h2 className="text-xl font-bold mb-4 text-primary font-display">
                ¿Por qué son importantes los suplementos?
              </h2>
              <p className="text-gray-600 dark:text-white mb-4">
                Incluso con una dieta equilibrada, algunos perros pueden beneficiarse de suplementos adicionales para
                abordar necesidades específicas relacionadas con su edad, raza, nivel de actividad o condiciones de
                salud.
              </p>
              <p className="text-gray-600 dark:text-white">
                Nuestros suplementos están formulados científicamente para proporcionar los nutrientes exactos que tu
                perro necesita en la dosis adecuada, mejorando su calidad de vida y bienestar general.
              </p>
            </div>
            <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md">
              <h2 className="text-xl font-bold mb-4 text-primary font-display">¿Cómo elegir el suplemento adecuado?</h2>
              <ul className="space-y-2 text-gray-600 dark:text-white">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-pastel-green mr-2 mt-0.5" />
                  <span>Para perros mayores: suplementos articulares y antioxidantes</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-pastel-green mr-2 mt-0.5" />
                  <span>Para cachorros: suplementos para el desarrollo y crecimiento</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-pastel-green mr-2 mt-0.5" />
                  <span>Para perros activos: suplementos para articulaciones y energía</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-pastel-green mr-2 mt-0.5" />
                  <span>Para problemas de piel: ácidos grasos esenciales y vitaminas</span>
                </li>
              </ul>
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
          categories={["complementar"]}
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
    </div>
  )
}
