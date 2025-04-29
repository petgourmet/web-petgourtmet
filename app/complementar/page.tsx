"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, ChevronDown, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"

// Productos específicos para la categoría "Complementar" (formato estandarizado)
const complementarProducts = [
  {
    id: 1,
    name: "Suplemento Vitamínico Canino",
    description: "Refuerza el sistema inmunológico y mejora la salud general de tu perro.",
    image: "/dog-supplement-display.png",
    rating: 4.7,
    reviews: 56,
    price: 19.99,
    features: [
      { name: "Vitaminas A, D y E", color: "pastel-green" },
      { name: "Omega 3 y 6", color: "primary" },
      { name: "Fácil dosificación", color: "secondary" },
    ],
    sizes: [
      { weight: "30 tabletas", price: 19.99 },
      { weight: "60 tabletas", price: 34.99 },
    ],
    category: "Complementar",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
  {
    id: 2,
    name: "Aceite de Salmón Premium",
    description: "Mejora el pelaje y la salud de la piel con ácidos grasos esenciales.",
    image: "/natural-dog-food-ingredients.png",
    rating: 4.8,
    reviews: 42,
    price: 15.99,
    features: [
      { name: "Pelaje brillante", color: "pastel-green" },
      { name: "Piel saludable", color: "primary" },
      { name: "Antiinflamatorio", color: "secondary" },
    ],
    sizes: [
      { weight: "250ml", price: 15.99 },
      { weight: "500ml", price: 28.99 },
    ],
    category: "Complementar",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
  {
    id: 3,
    name: "Probióticos Digestivos",
    description: "Mejora la flora intestinal y facilita la digestión de tu mascota.",
    image: "/dog-supplement-display.png",
    rating: 4.6,
    reviews: 38,
    price: 22.99,
    features: [
      { name: "Mejora digestiva", color: "pastel-green" },
      { name: "Reduce gases", color: "primary" },
      { name: "Fortalece inmunidad", color: "secondary" },
    ],
    sizes: [
      { weight: "30 sobres", price: 22.99 },
      { weight: "60 sobres", price: 39.99 },
    ],
    category: "Complementar",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
  {
    id: 4,
    name: "Condroprotector Articular",
    description: "Protege las articulaciones y mejora la movilidad en perros de todas las edades.",
    image: "/premium-dog-food-bag.png",
    rating: 4.9,
    reviews: 64,
    price: 29.99,
    features: [
      { name: "Glucosamina", color: "pastel-green" },
      { name: "Condroitina", color: "primary" },
      { name: "MSM", color: "secondary" },
    ],
    sizes: [
      { weight: "30 comprimidos", price: 29.99 },
      { weight: "60 comprimidos", price: 54.99 },
    ],
    category: "Complementar",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
]

export default function ComplementarPage() {
  const [filteredProducts, setFilteredProducts] = useState(complementarProducts)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    category: "complementar",
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
    let result = [...complementarProducts]

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
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Para Complementar</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto">
              Suplementos nutricionales y aditivos para mejorar la dieta diaria de tu perro. Potencia su salud y
              bienestar con nuestros complementos premium.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/para_complementar.png" alt="Suplementos para perros" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-pastel-green/80 to-transparent flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">Nutrición avanzada</h2>
                <p className="text-white/90 mb-6">Complementos desarrollados por expertos en nutrición canina</p>
                <Button className="bg-white text-primary hover:bg-white/90 rounded-full">Consulta nutricional</Button>
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

          {/* Productos de la categoría - USANDO PRODUCTCARD */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Suplementos recomendados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
              ))}
            </div>
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
          features={["Vitaminas", "Omega 3 y 6", "Antiinflamatorio", "Probióticos", "Articular"]}
          maxPrice={50}
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
