"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Filter } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { Toaster } from "@/components/toaster"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"

// Productos específicos para la categoría "Celebrar"
const celebrarProducts = [
  {
    id: 1,
    name: "Snacks Naturales para Celebraciones",
    description: "Deliciosos premios para momentos especiales con tu mascota.",
    image: "/happy-dog-birthday.png",
    rating: 4.9,
    reviews: 87,
    price: 8.99,
    category: "Celebrar",
    spotlightColor: "rgba(255, 236, 179, 0.08)",
    features: [
      { name: "Sin Conservantes", color: "secondary" },
      { name: "Sabor Irresistible", color: "primary" },
      { name: "Forma Divertida", color: "pastel-yellow" },
    ],
  },
  {
    id: 2,
    name: "Pastel de Cumpleaños Canino",
    description: "Pastel especial para celebrar el cumpleaños de tu amigo peludo.",
    image: "/dog-eating-treat.png",
    rating: 4.8,
    reviews: 64,
    price: 19.99,
    category: "Celebrar",
    spotlightColor: "rgba(255, 236, 179, 0.08)",
    features: [
      { name: "Natural", color: "secondary" },
      { name: "Decoración Festiva", color: "primary" },
    ],
  },
  {
    id: 3,
    name: "Kit de Fiesta para Perros",
    description: "Todo lo que necesitas para organizar una fiesta canina inolvidable.",
    image: "/happy-dog-birthday.png",
    rating: 4.7,
    reviews: 42,
    price: 24.99,
    category: "Celebrar",
    spotlightColor: "rgba(255, 236, 179, 0.08)",
    features: [
      { name: "Completo", color: "secondary" },
      { name: "Divertido", color: "primary" },
    ],
  },
  {
    id: 4,
    name: "Galletas Festivas Gourmet",
    description: "Galletas premium con formas festivas para ocasiones especiales.",
    image: "/pastel-carne-treats.png",
    rating: 4.9,
    reviews: 53,
    price: 12.99,
    category: "Celebrar",
    spotlightColor: "rgba(255, 236, 179, 0.08)",
    features: [
      { name: "Gourmet", color: "secondary" },
      { name: "Artesanal", color: "primary" },
    ],
  },
]

export default function CelebrarPage() {
  const [filteredProducts, setFilteredProducts] = useState(celebrarProducts)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    category: "celebrar",
    priceRange: [0, 100],
    features: [],
    rating: 0,
    sortBy: "relevance",
  })

  const handleShowDetail = (product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const applyFilters = () => {
    let result = [...celebrarProducts]

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
            <h2 className="text-2xl font-bold mb-8 text-primary font-display">Productos destacados para celebrar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 rounded-xl bg-white/75 dark:bg-[rgba(0,0,0,0.2)] backdrop-blur-sm">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    spotlightColor="rgba(255, 236, 179, 0.08)"
                    onShowDetail={handleShowDetail}
                  />
                ))
              ) : (
                <p className="text-gray-500 dark:text-white">No se encontraron productos.</p>
              )}
            </div>
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
          product={selectedProduct}
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
          features={["Natural", "Sin Conservantes", "Sabor Irresistible", "Forma Divertiva"]}
          maxPrice={30}
        />
      )}
      <Toaster />
    </div>
  )
}
