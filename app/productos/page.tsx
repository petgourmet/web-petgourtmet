"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/toaster"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ProductCard } from "@/components/product-card"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { useSearchParams } from "next/navigation"

// Datos de productos
const products = [
  {
    id: 1,
    name: "Pastel por porción de Carne",
    description: "Snack natural horneado para mascotas, elaborado con Milanesa de Res, Cereales y Huevo.",
    image: "/pastel-carne-package.png",
    gallery: [
      { src: "/pastel-carne-package.png", alt: "Empaque de Pastel de Carne" },
      { src: "/dog-eating-treat.png", alt: "Perro disfrutando del snack" },
      { src: "/pastel-carne-front.png", alt: "Vista frontal del producto" },
      { src: "/pastel-carne-treats.png", alt: "Galletas de Pastel de Carne" },
    ],
    rating: 4.9,
    reviews: 156,
    features: [
      { name: "Natural", color: "secondary" },
      { name: "Horneado", color: "primary" },
      { name: "Sin Conservantes", color: "pastel-green" },
      { name: "Alta Palatabilidad", color: "pastel-blue" },
    ],
    sizes: [
      { weight: "200g", price: 8.99 },
      { weight: "400g", price: 14.99 },
      { weight: "800g", price: 24.99 },
    ],
    nutritionalInfo: "Recomendación: Refrigerado por 7 días; congelado por 6 meses.",
    ingredients: "Elaborado con Milanesa de Res, Cereales y Huevo.",
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
    features: [
      { name: "Hipoalergénico", color: "secondary" },
      { name: "Cuidado Articular", color: "primary" },
      { name: "Apoyo Inmunológico", color: "pastel-green" },
      { name: "Ingredientes Naturales", color: "pastel-blue" },
    ],
    sizes: [
      { weight: "1.5kg", price: 14.99 },
      { weight: "6kg", price: 46.99 },
      { weight: "12kg", price: 89.99 },
    ],
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
  {
    id: 3,
    name: "Snacks Naturales para Celebraciones",
    description: "Deliciosos premios para momentos especiales con tu mascota.",
    image: "/happy-dog-birthday.png",
    rating: 4.9,
    reviews: 87,
    features: [
      { name: "Sin Conservantes", color: "secondary" },
      { name: "Sabor Irresistible", color: "primary" },
      { name: "Forma Divertida", color: "pastel-yellow" },
    ],
    sizes: [
      { weight: "250g", price: 8.99 },
      { weight: "500g", price: 15.99 },
    ],
    category: "Celebrar",
    spotlightColor: "rgba(255, 236, 179, 0.3)",
  },
  {
    id: 4,
    name: "Suplemento Vitamínico Canino",
    description: "Refuerza el sistema inmunológico y mejora la salud general de tu perro.",
    image: "/dog-supplement-display.png",
    rating: 4.7,
    reviews: 56,
    features: [
      { name: "Vitaminas A, D y E", color: "pastel-green" },
      { name: "Omega 3 y 6", color: "primary" },
      { name: "Fácil Dosificación", color: "secondary" },
    ],
    sizes: [
      { weight: "30 tabletas", price: 19.99 },
      { weight: "60 tabletas", price: 34.99 },
    ],
    category: "Complementar",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
  },
  {
    id: 5,
    name: "Premios de Entrenamiento",
    description: "Pequeños bocados perfectos para el entrenamiento y refuerzo positivo.",
    image: "/healthy-dog-training-treats.png",
    rating: 4.6,
    reviews: 103,
    features: [
      { name: "Bajo en Calorías", color: "pastel-blue" },
      { name: "Tamaño Pequeño", color: "primary" },
      { name: "Alta Palatabilidad", color: "secondary" },
    ],
    sizes: [
      { weight: "200g", price: 7.99 },
      { weight: "400g", price: 13.99 },
    ],
    category: "Premiar",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
  },
]

export default function ProductosPage() {
  const [filteredProducts, setFilteredProducts] = useState(products)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    priceRange: [0, 100],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get("categoria")

  // Filtrar productos por categoría si se proporciona una
  const productosFiltrados = categoriaParam
    ? products.filter((producto) => producto.category === categoriaParam)
    : products // Mostrar todos los productos si no hay categoría

  const handleShowDetail = (product) => {
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
      const lowestPrice = product.price || (product.sizes && Math.min(...product.sizes.map((size) => size.price))) || 0
      return lowestPrice >= filters.priceRange[0] && lowestPrice <= filters.priceRange[1]
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
      result = result.filter((product) => product.rating >= filters.rating)
    }

    // Ordenar productos
    if (filters.sortBy === "price-asc") {
      result.sort((a, b) => {
        const priceA = a.price || (a.sizes && Math.min(...a.sizes.map((size) => size.price))) || 0
        const priceB = b.price || (b.sizes && Math.min(...b.sizes.map((size) => size.price))) || 0
        return priceA - priceB
      })
    } else if (filters.sortBy === "price-desc") {
      result.sort((a, b) => {
        const priceA = a.price || (a.sizes && Math.min(...a.sizes.map((size) => size.price))) || 0
        const priceB = b.price || (b.sizes && Math.min(...b.sizes.map((size) => size.price))) || 0
        return priceB - priceA
      })
    } else if (filters.sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating)
    } else if (filters.sortBy === "popularity") {
      result.sort((a, b) => b.reviews - a.reviews)
    }

    setFilteredProducts(result)
    setShowFilters(false)
  }

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

      <div className="responsive-section bg-illuminated">
        <div className="responsive-container">
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
                    const sorted = [...filteredProducts].sort((a, b) => {
                      const priceA = a.price || (a.sizes && Math.min(...a.sizes.map((size) => size.price))) || 0
                      const priceB = b.price || (b.sizes && Math.min(...b.sizes.map((size) => size.price))) || 0
                      return priceA - priceB
                    })
                    setFilteredProducts(sorted)
                  }}
                >
                  Precio (menor a mayor)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const sorted = [...filteredProducts].sort((a, b) => {
                      const priceA = a.price || (a.sizes && Math.min(...a.sizes.map((size) => size.price))) || 0
                      const priceB = b.price || (b.sizes && Math.min(...b.sizes.map((size) => size.price))) || 0
                      return priceB - priceA
                    })
                    setFilteredProducts(sorted)
                  }}
                >
                  Precio (mayor a menor)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Grid de productos */}
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
                      priceRange: [0, 100],
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
                <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
              ))
            )}
          </div>
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

      {showFilters && (
        <ProductFilters
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          applyFilters={applyFilters}
          categories={["all", "celebrar", "complementar", "premiar", "recetas"]}
          features={["Natural", "Hipoalergénico", "Sin Conservantes", "Alta Palatabilidad", "Bajo en Calorías"]}
          maxPrice={100}
        />
      )}
      <Toaster />
    </div>
  )
}
