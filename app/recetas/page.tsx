"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Utensils } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function RecetasPage() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    category: "recetas",
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

  // Características predeterminadas para productos de recetas
  const DEFAULT_RECETAS_FEATURES = [
    { name: "Natural", color: "green" },
    { name: "Sin conservantes", color: "blue" },
    { name: "Alta calidad", color: "purple" },
  ]

  // Cargar productos desde Supabase
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      setError(null)

      try {
        // Paso 1: Obtener el ID de la categoría "Recetas"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .ilike("name", "%receta%")

        if (categoryError) {
          console.error("Error al obtener la categoría:", categoryError)
          setError(`Error al obtener la categoría: ${categoryError.message}`)
          setIsLoading(false)
          return
        }

        if (!categoryData || categoryData.length === 0) {
          console.error("No se encontró la categoría 'Recetas'")
          setError("No se encontró la categoría 'Recetas'")
          setIsLoading(false)
          return
        }

        const categoryId = categoryData[0].id
        const categoryName = categoryData[0].name

        console.log(`Categoría encontrada: ${categoryName} (ID: ${categoryId})`)

        // Paso 2: Obtener productos de la categoría "Recetas"
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*, categories(name)")
          .eq("category_id", categoryId)

        if (productsError) {
          console.error("Error al obtener productos:", productsError)
          setError(`Error al obtener productos: ${productsError.message}`)
          setIsLoading(false)
          return
        }

        console.log(`Se encontraron ${productsData?.length || 0} productos en la categoría`)

        // Transformar los datos al formato esperado por ProductCard
        const formattedProducts = productsData.map((product) => ({
          id: product.id || 0,
          name: product.name || "Producto sin nombre",
          description: product.description || "Sin descripción",
          image: product.image_url || "/pastel-carne-package.png", // Imagen por defecto si no hay
          rating: product.rating || 4.5,
          reviews: product.reviews_count || 0,
          price: product.price || 0,
          features: product.features
            ? typeof product.features === "string"
              ? JSON.parse(product.features)
              : product.features
            : DEFAULT_RECETAS_FEATURES,
          sizes: product.sizes
            ? typeof product.sizes === "string"
              ? JSON.parse(product.sizes)
              : product.sizes
            : [{ weight: "200g", price: product.price || 0 }],
          category: product.categories?.name || categoryName || "Recetas",
          spotlightColor: "rgba(249, 215, 232, 0.3)",
        }))

        setProducts(formattedProducts)
        setFilteredProducts(formattedProducts)
      } catch (error) {
        console.error("Error processing products:", error)
        setError(`Error processing products: ${error.message}`)
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
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Nuestras Recetas</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto text-center mb-12">
              Comidas principales con ingredientes naturales para la nutrición y el bienestar diarios. Elaboradas con
              ingredientes frescos y de alta calidad.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/nuestras_recetas.png" alt="Ingredientes naturales" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-pastel-pink/80 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Nutrición gourmet</h2>
                <p className="text-white mb-6">Recetas elaboradas por expertos en nutrición canina</p>
                <Button className="bg-pink-400 text-gray-900 hover:bg-pink-500 font-medium rounded-full">
                  Descubrir ingredientes
                </Button>
              </div>
            </div>
          </div>

          {/* Controles de filtro y ordenación */}
          <div className="mb-8 flex justify-start items-center">
            <Button
              variant="outline"
              className="rounded-full flex items-center gap-2"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" /> Filtrar
            </Button>
          </div>

          {/* Productos de la categoría - USANDO PRODUCTCARD */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Recetas destacadas</h2>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Reintentar
                </Button>
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

          {/* Sección de beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display text-center">
              Beneficios de nuestras recetas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-pink rounded-full flex items-center justify-center mb-4">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Ingredientes naturales</h3>
                <p className="text-gray-600 dark:text-white">
                  Utilizamos solo ingredientes frescos y de alta calidad, sin conservantes ni aditivos artificiales.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-pink rounded-full flex items-center justify-center mb-4">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Nutrición equilibrada</h3>
                <p className="text-gray-600 dark:text-white">
                  Cada receta está formulada para proporcionar todos los nutrientes que tu perro necesita en las
                  proporciones adecuadas.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pastel-pink rounded-full flex items-center justify-center mb-4">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Alta palatabilidad</h3>
                <p className="text-gray-600 dark:text-white">
                  Sabores irresistibles que harán que tu perro disfrute cada comida, incluso los más exigentes.
                </p>
              </div>
            </div>
          </div>

          {/* Sección de proceso de elaboración */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display text-center">
              Nuestro proceso de elaboración
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-pastel-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-bold text-white">1</span>
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Selección de ingredientes</h3>
                <p className="text-sm text-gray-600 dark:text-white">
                  Escogemos los mejores ingredientes frescos y de temporada.
                </p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-pastel-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-bold text-white">2</span>
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Preparación cuidadosa</h3>
                <p className="text-sm text-gray-600 dark:text-white">
                  Cocinamos a baja temperatura para preservar nutrientes.
                </p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-pastel-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-bold text-white">3</span>
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Control de calidad</h3>
                <p className="text-sm text-gray-600 dark:text-white">
                  Cada lote es analizado para garantizar su calidad y seguridad.
                </p>
              </div>
              <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-6 shadow-md text-center">
                <div className="w-12 h-12 bg-pastel-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="font-bold text-white">4</span>
                </div>
                <h3 className="font-bold mb-2 dark:text-white">Envasado fresco</h3>
                <p className="text-sm text-gray-600 dark:text-white">
                  Envasamos inmediatamente para mantener la frescura y el sabor.
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
          categories={["recetas"]}
          features={["Natural", "Hipoalergénico", "Sin Conservantes", "Alta Palatabilidad"]}
          maxPrice={30}
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
