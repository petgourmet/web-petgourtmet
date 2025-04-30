"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, Utensils } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"

// Productos específicos para la categoría "Recetas" (formato estandarizado)
const recetasProducts = [
  {
    id: 1,
    name: "Pastel por porción de Carne",
    description: "Snack natural horneado para mascotas, elaborado con Milanesa de Res, Cereales y Huevo.",
    image: "/pastel-carne-package.png",
    rating: 4.9,
    reviews: 156,
    price: 8.99,
    features: [
      { name: "Natural", color: "secondary" },
      { name: "Horneado", color: "primary" },
      { name: "Sin Conservantes", color: "pastel-pink" },
    ],
    sizes: [
      { weight: "200g", price: 8.99 },
      { weight: "400g", price: 14.99 },
    ],
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
  {
    id: 2,
    name: "Alimento Premium para Perros Adultos",
    description: "Nutrición completa y equilibrada para perros adultos de todas las razas.",
    image: "/premium-dog-food-bag.png",
    rating: 4.8,
    reviews: 124,
    price: 14.99,
    features: [
      { name: "Alimento completo", color: "secondary" },
      { name: "Alta calidad", color: "primary" },
      { name: "Todas las razas", color: "pastel-pink" },
    ],
    sizes: [
      { weight: "1kg", price: 14.99 },
      { weight: "3kg", price: 39.99 },
      { weight: "10kg", price: 99.99 },
    ],
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
  {
    id: 3,
    name: "Guiso de Pollo y Verduras",
    description: "Receta casera con ingredientes frescos, ideal para perros con sensibilidad digestiva.",
    image: "/natural-dog-food-ingredients.png",
    rating: 4.7,
    reviews: 98,
    price: 9.99,
    features: [
      { name: "Pollo", color: "secondary" },
      { name: "Digestión fácil", color: "primary" },
      { name: "Ingredientes frescos", color: "pastel-pink" },
    ],
    sizes: [
      { weight: "300g", price: 9.99 },
      { weight: "600g", price: 17.99 },
    ],
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
  {
    id: 4,
    name: "Estofado de Ternera con Batata",
    description: "Deliciosa combinación de proteínas y carbohidratos para una nutrición equilibrada.",
    image: "/full-nutritious-dog-bowl.png",
    rating: 4.9,
    reviews: 112,
    price: 10.99,
    features: [
      { name: "Ternera", color: "secondary" },
      { name: "Con batata", color: "primary" },
      { name: "Nutrición equilibrada", color: "pastel-pink" },
    ],
    sizes: [
      { weight: "300g", price: 10.99 },
      { weight: "600g", price: 19.99 },
    ],
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
]

export default function RecetasPage() {
  const [filteredProducts, setFilteredProducts] = useState(recetasProducts)
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

  // Función para mostrar el detalle del producto
  const handleShowDetail = (product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...recetasProducts]

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
              ))}
            </div>
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
