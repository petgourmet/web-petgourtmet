"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "./product-card"
import { ProductDetailModal } from "./product-detail-modal"
import { useCart } from "./cart-context"

// Datos de productos destacados
const featuredProducts = [
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
    ],
    sizes: [
      { weight: "200g", price: 8.99 },
      { weight: "400g", price: 14.99 },
    ],
    nutritionalInfo: "Recomendación: Refrigerado por 7 días; congelado por 6 meses.",
    ingredients: "Elaborado con Milanesa de Res, Cereales y Huevo.",
    category: "Recetas",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
  },
  {
    id: 2,
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
  {
    id: 3,
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
    id: 4,
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
]

export function FeaturedProducts() {
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { addToCart } = useCart()

  const handleShowDetail = (product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  return (
    <section className="py-16 bg-illuminated">
      <div className="responsive-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 title-reflection">Productos Destacados</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Descubre nuestra selección de productos premium para tu mascota, elaborados con ingredientes naturales y de
            la más alta calidad.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} {...product} onShowDetail={handleShowDetail} />
          ))}
        </div>

        <div className="text-center">
          <Button
            asChild
            className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold"
          >
            <a href="/productos">Ver todos los productos</a>
          </Button>
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
      </div>
    </section>
  )
}
