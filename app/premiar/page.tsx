"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, ChevronDown, Award } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"

// Productos específicos para la categoría "Premiar" (formato estandarizado)
const premiarProducts = [
  {
    id: 1,
    name: "Premios de Entrenamiento",
    description: "Pequeños bocados perfectos para el entrenamiento y refuerzo positivo.",
    image: "/healthy-dog-training-treats.png",
    rating: 4.6,
    reviews: 103,
    price: 7.99,
    features: [
      { name: "Entrenamiento", color: "pastel-blue" },
      { name: "Bajo en Calorías", color: "primary" },
      { name: "Tamaño Pequeño", color: "secondary" },
    ],
    sizes: [
      { weight: "200g", price: 7.99 },
      { weight: "400g", price: 13.99 },
    ],
    category: "Premiar",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
  {
    id: 2,
    name: "Sticks de Pollo Deshidratado",
    description: "Deliciosos sticks de pollo 100% natural para premiar a tu mascota.",
    image: "/pastel-carne-treats.png",
    rating: 4.8,
    reviews: 87,
    price: 9.99,
    features: [
      { name: "Snacks", color: "pastel-blue" },
      { name: "100% Natural", color: "primary" },
      { name: "Sin Conservantes", color: "secondary" },
    ],
    sizes: [
      { weight: "150g", price: 9.99 },
      { weight: "300g", price: 17.99 },
    ],
    category: "Premiar",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
  {
    id: 3,
    name: "Galletas de Manzana y Zanahoria",
    description: "Galletas saludables con ingredientes naturales y bajo contenido calórico.",
    image: "/healthy-dog-training-treats.png",
    rating: 4.7,
    reviews: 65,
    price: 6.99,
    features: [
      { name: "Galletas", color: "pastel-blue" },
      { name: "Frutas y Verduras", color: "primary" },
      { name: "Bajo en Calorías", color: "secondary" },
    ],
    sizes: [
      { weight: "200g", price: 6.99 },
      { weight: "400g", price: 12.99 },
    ],
    category: "Premiar",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
  {
    id: 4,
    name: "Huesos Dentales Naturales",
    description: "Premios que ayudan a mantener la higiene dental mientras recompensas a tu perro.",
    image: "/pastel-carne-treats.png",
    rating: 4.9,
    reviews: 92,
    price: 11.99,
    features: [
      { name: "Dental", color: "pastel-blue" },
      { name: "Higiene Bucal", color: "primary" },
      { name: "Larga Duración", color: "secondary" },
    ],
    sizes: [
      { weight: "Pack 3 unidades", price: 11.99 },
      { weight: "Pack 6 unidades", price: 21.99 },
    ],
    category: "Premiar",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
]

export default function PremiarPage() {
  const [filteredProducts, setFilteredProducts] = useState(premiarProducts)
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

  // Función para mostrar el detalle del producto
  const handleShowDetail = (product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...premiarProducts]

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
      <div className="responsive-section bg-illuminated">
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
            <div className="absolute inset-0 bg-gradient-to-r from-pastel-blue/80 to-transparent flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Recompensas saludables</h2>
                <p className="text-white/90 mb-6">Premios deliciosos que no comprometen la salud de tu mascota</p>
                <Button className="bg-white text-primary hover:bg-white/90 rounded-full">
                  Ver packs de entrenamiento
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full flex items-center gap-2">
                  Ordenar por <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    const sorted = [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name))
                    setFilteredProducts(sorted)
                  }}
                >
                  Nombre (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const sorted = [...filteredProducts].sort((a, b) => b.name.localeCompare(a.name))
                    setFilteredProducts(sorted)
                  }}
                >
                  Nombre (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const sorted = [...filteredProducts].sort((a, b) => a.price - b.price)
                    setFilteredProducts(sorted)
                  }}
                >
                  Precio (menor a mayor)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const sorted = [...filteredProducts].sort((a, b) => b.price - a.price)
                    setFilteredProducts(sorted)
                  }}
                >
                  Precio (mayor a menor)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Categorías de premios */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button variant="outline" className="rounded-full bg-white">
              Todos
            </Button>
            <Button variant="outline" className="rounded-full bg-white">
              Entrenamiento
            </Button>
            <Button variant="outline" className="rounded-full bg-white">
              Snacks
            </Button>
            <Button variant="outline" className="rounded-full bg-white">
              Galletas
            </Button>
            <Button variant="outline" className="rounded-full bg-white">
              Dental
            </Button>
          </div>

          {/* Productos de la categoría - USANDO PRODUCTCARD */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Premios más vendidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
              ))}
            </div>
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
