"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Award } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function PremiarPage() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    category: "premiar",
    priceRange: [0, 100],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  // Estado para el modal de detalle del producto
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { addToCart } = useCart()
  const supabase = createClientComponentClient()

  // Características predeterminadas para productos de premiar
  const DEFAULT_PREMIAR_FEATURES = [
    { name: "Entrenamiento", color: "pastel-blue" },
    { name: "Bajo en Calorías", color: "primary" },
  ]

  // Cargar productos desde Supabase
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      setError("")

      try {
        console.log("Buscando categoría 'Premiar'...")
        // Primero, obtener el ID de la categoría "Premiar"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .ilike("name", "%premi%")

        if (categoryError) {
          console.error("Error al obtener la categoría:", categoryError)
          setError("Error al cargar la categoría. Por favor, intenta de nuevo más tarde.")
          setIsLoading(false)
          return
        }

        if (!categoryData || categoryData.length === 0) {
          console.error("No se encontró la categoría 'Premiar'")
          setError("No se encontró la categoría de productos. Por favor, intenta de nuevo más tarde.")
          setIsLoading(false)
          return
        }

        console.log("Categoría encontrada:", categoryData[0])
        // Obtener el ID de la primera categoría que coincida
        const categoryId = categoryData[0].id
        const categoryName = categoryData[0].name

        console.log(`Buscando productos con category_id = ${categoryId}...`)
        // Obtener productos con esa categoría - ELIMINAMOS el filtro active que no existe
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .eq("category_id", categoryId)

        if (productsError) {
          console.error("Error al obtener productos:", productsError)
          setError("Error al cargar productos. Por favor, intenta de nuevo más tarde.")
          setIsLoading(false)
          return
        }

        console.log(`Productos encontrados: ${productsData?.length || 0}`)

        if (!productsData || productsData.length === 0) {
          console.log(`No se encontraron productos en la categoría '${categoryName}'`)
          setProducts([])
          setFilteredProducts([])
          setIsLoading(false)
          return
        }

        // Transformar los datos al formato esperado por ProductCard
        const formattedProducts = productsData.map((product) => ({
          id: product.id,
          name: product.name || "Producto sin nombre",
          description: product.description || "Sin descripción",
          image: product.image_url || "/healthy-dog-training-treats.png", // Imagen por defecto si no hay
          rating: product.rating || 4.5,
          reviews: product.reviews_count || 0,
          price: product.price || 0,
          features: product.features ? JSON.parse(product.features) : DEFAULT_PREMIAR_FEATURES,
          sizes: product.sizes ? JSON.parse(product.sizes) : [{ weight: "200g", price: product.price || 0 }],
          category: product.categories?.name || categoryName,
          spotlightColor: "rgba(122, 184, 191, 0.2)",
        }))

        console.log("Productos formateados correctamente")
        setProducts(formattedProducts)
        setFilteredProducts(formattedProducts)
      } catch (error) {
        console.error("Error processing products:", error)
        setError("Error al procesar los productos. Por favor, intenta de nuevo más tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [supabase])

  // Función para mostrar el detalle del producto
  const handleShowDetail = (product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...products]

    // Filtrar por rango de precio
    result = result.filter((product) => {
      return product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    })

    // Filtrar por valoración
    if (filters.rating > 0) {
      result = result.filter((product) => product.rating >= filters.rating)
    }

    // Ordenar productos
    if (filters.sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price)
    } else if (filters.sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price)
    } else if (filters.sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating)
    } else if (filters.sortBy === "popularity") {
      result.sort((a, b) => b.reviews - a.reviews)
    }

    setFilteredProducts(result)
    setShowFilters(false)
  }

  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Para Premiar</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto text-center mb-12">
              Galletas y golosinas saludables perfectas para el entrenamiento y premiar el buen comportamiento.
              Recompensa a tu mascota con snacks deliciosos y nutritivos.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/para_premiar.png" alt="Premios para perros" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-pastel-blue/80 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Recompensas saludables</h2>
                <p className="text-white mb-6">Premios deliciosos que no comprometen la salud de tu mascota</p>
                <Button className="bg-blue-400 text-gray-900 hover:bg-blue-500 font-medium rounded-full">
                  Ver packs de entrenamiento
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
            <div></div> {/* Empty div to maintain spacing */}
          </div>

          {/* Productos de la categoría - USANDO PRODUCTCARD */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Premios más vendidos</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500">{error}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No se encontraron productos en esta categoría.</p>
              </div>
            )}
          </div>

          {/* Sección de consejos */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display text-center">
              Consejos para premiar a tu mascota
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Consistencia</h3>
                <p className="text-gray-600 dark:text-white">
                  Premia comportamientos específicos de manera consistente para reforzar el aprendizaje.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Moderación</h3>
                <p className="text-gray-600 dark:text-white">
                  Controla la cantidad de premios para mantener una dieta equilibrada y evitar el sobrepeso.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Variedad</h3>
                <p className="text-gray-600 dark:text-white">
                  Alterna entre diferentes tipos de premios para mantener el interés y la motivación de tu mascota.
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
          categories={["premiar"]}
          features={["Bajo en Calorías", "Sin Conservantes", "Sabor Irresistible", "Dental", "Entrenamiento"]}
          maxPrice={20}
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
