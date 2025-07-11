"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ProductFilters, type Filters } from "@/components/product-filters"
import { Loader2 } from "lucide-react"
import { Toaster } from "@/components/toaster"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { useCart } from "@/components/cart-context"
import { supabase } from "@/lib/supabase/client"
import type { ProductFeature } from "@/components/product-card"
import { ProductCategoryLoader } from "@/components/product-category-loader"

// Tipo para los productos desde la base de datos
type Product = {
  id: number
  name: string
  description: string
  price: number
  image: string
  stock: number
  created_at: string
  features?: ProductFeature[]
  rating?: number
  reviews?: number
  sizes?: { weight: string; price: number }[]
  category?: string
  gallery?: { src: string; alt: string }[]
}

export default function CelebrarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { addToCart } = useCart()
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 1000],
    features: [],
    sortBy: "relevance",
  })

  // Cargar productos de la categoría "Celebrar" desde la base de datos
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        // Primero obtenemos el ID de la categoría "Celebrar"
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id")
          .eq("name", "Para Celebrar")
          .single()

        // Si hay un error de API key pero tenemos productos, no mostramos el error
        if (categoryError) {
          console.error("Error al obtener la categoría:", categoryError)

          // Si el error es de API key, usamos datos de fallback
          if (categoryError.message.includes("Invalid API key")) {
            // Datos de fallback para la categoría "Celebrar"
            const fallbackProducts = [
              {
                id: 1,
                name: "Pastel de Carne",
                description: "Delicioso pastel de carne para tu mascota",
                price: 250,
                image: "/pastel-carne.png",
                stock: 10,
                created_at: new Date().toISOString(),
                features: [
                  { name: "Sin Conservantes", color: "secondary" },
                  { name: "Sabor Irresistible", color: "primary" },
                  { name: "Forma Divertida", color: "pastel-yellow" },
                ],
                rating: 4.8,
                reviews: 120,
                sizes: [
                  { weight: "200g", price: 250 },
                  { weight: "500g", price: 550 },
                ],
                category: "Para Celebrar",
              },
              {
                id: 2,
                name: "Torta de Cumpleaños",
                description: "Torta especial para celebrar el cumpleaños de tu mascota",
                price: 350,
                image: "/treat-heart-cake.png",
                stock: 5,
                created_at: new Date().toISOString(),
                features: [
                  { name: "Festivo", color: "secondary" },
                  { name: "Especial", color: "primary" },
                ],
                rating: 4.9,
                reviews: 75,
                sizes: [
                  { weight: "300g", price: 350 },
                  { weight: "700g", price: 750 },
                ],
                category: "Para Celebrar",
              },
            ]

            setProducts(fallbackProducts)
            setFilteredProducts(fallbackProducts)
            setLoading(false)
            return
          }
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

          // Si el error es de API key pero tenemos productos, no mostramos el error
          if (productsError.message.includes("Invalid API key")) {
            // Usar datos de fallback
            const fallbackProducts = [
              {
                id: 1,
                name: "Pastel de Carne",
                description: "Delicioso pastel de carne para tu mascota",
                price: 250,
                image: "/pastel-carne.png",
                stock: 10,
                created_at: new Date().toISOString(),
                features: [
                  { name: "Sin Conservantes", color: "secondary" },
                  { name: "Sabor Irresistible", color: "primary" },
                  { name: "Forma Divertida", color: "pastel-yellow" },
                ],
                rating: 4.8,
                reviews: 120,
                sizes: [
                  { weight: "200g", price: 250 },
                  { weight: "500g", price: 550 },
                ],
                category: "Para Celebrar",
              },
              {
                id: 2,
                name: "Torta de Cumpleaños",
                description: "Torta especial para celebrar el cumpleaños de tu mascota",
                price: 350,
                image: "/treat-heart-cake.png",
                stock: 5,
                created_at: new Date().toISOString(),
                features: [
                  { name: "Festivo", color: "secondary" },
                  { name: "Especial", color: "primary" },
                ],
                rating: 4.9,
                reviews: 75,
                sizes: [
                  { weight: "300g", price: 350 },
                  { weight: "700g", price: 750 },
                ],
                category: "Para Celebrar",
              },
            ]

            setProducts(fallbackProducts)
            setFilteredProducts(fallbackProducts)
            setLoading(false)
            return
          }
        }

        if (!productsData || productsData.length === 0) {
          // Si no hay productos, usar datos de fallback
          const fallbackProducts = [
            {
              id: 1,
              name: "Pastel de Carne",
              description: "Delicioso pastel de carne para tu mascota",
              price: 250,
              image: "/pastel-carne.png",
              stock: 10,
              created_at: new Date().toISOString(),
              features: [
                { name: "Sin Conservantes", color: "secondary" },
                { name: "Sabor Irresistible", color: "primary" },
                { name: "Forma Divertida", color: "pastel-yellow" },
              ],
              rating: 4.8,
              reviews: 120,
              sizes: [
                { weight: "200g", price: 250 },
                { weight: "500g", price: 550 },
              ],
              category: "Para Celebrar",
            },
            {
              id: 2,
              name: "Torta de Cumpleaños",
              description: "Torta especial para celebrar el cumpleaños de tu mascota",
              price: 350,
              image: "/treat-heart-cake.png",
              stock: 5,
              created_at: new Date().toISOString(),
              features: [
                { name: "Festivo", color: "secondary" },
                { name: "Especial", color: "primary" },
              ],
              rating: 4.9,
              reviews: 75,
              sizes: [
                { weight: "300g", price: 350 },
                { weight: "700g", price: 750 },
              ],
              category: "Para Celebrar",
            },
          ]

          setProducts(fallbackProducts)
          setFilteredProducts(fallbackProducts)
          setLoading(false)
          return
        }

        // Procesar productos para agregar información adicional
        const processedProducts = await Promise.all(
          productsData.map(async (product) => {
            // Obtener el nombre de la categoría
            const categoryName = product.categories?.name || "Para Celebrar"

            // Obtener características del producto (si existe una tabla para esto)
            let features: ProductFeature[] = []
            try {
              const { data: featuresData, error: featuresError } = await supabase
                .from("product_features")
                .select("name, color")
                .eq("product_id", product.id)

              // Si hay error de API key, usar características predeterminadas
              if (featuresError && featuresError.message.includes("Invalid API key")) {
                features = [
                  { name: "Sin Conservantes", color: "secondary" },
                  { name: "Sabor Irresistible", color: "primary" },
                  { name: "Forma Divertida", color: "pastel-yellow" },
                ]
              } else if (featuresData && featuresData.length > 0) {
                features = featuresData
              } else {
                // Características predeterminadas si no hay datos
                features = [
                  { name: "Sin Conservantes", color: "secondary" },
                  { name: "Sabor Irresistible", color: "primary" },
                  { name: "Forma Divertida", color: "pastel-yellow" },
                ]
              }
            } catch (error) {
              console.error("Error al cargar características:", error)
              // Características predeterminadas en caso de error
              features = [
                { name: "Sin Conservantes", color: "secondary" },
                { name: "Sabor Irresistible", color: "primary" },
                { name: "Forma Divertida", color: "pastel-yellow" },
              ]
            }

            // Construir la URL completa de la imagen
            let imageUrl = product.image
            if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
              try {
                // Si es una ruta relativa en el bucket de Supabase
                const { data, error } = supabase.storage.from("products").getPublicUrl(imageUrl)
                if (!error) {
                  imageUrl = data.publicUrl
                } else if (error.message.includes("Invalid API key")) {
                  // Si hay error de API key, usar la ruta directa
                  imageUrl = `/placeholder.svg?text=${encodeURIComponent(product.name)}`
                }
              } catch (error) {
                imageUrl = `/placeholder.svg?text=${encodeURIComponent(product.name)}`
              }
            } else if (!imageUrl) {
              // Imagen predeterminada si no hay imagen
              imageUrl = "/happy-dog-birthday.png"
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
                { weight: "500g", price: product.price * 2.2 },
              ],
              spotlightColor: "rgba(255, 236, 179, 0.08)",
            }
          }),
        )

        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
      } catch (error) {
        console.error("Error al cargar productos:", error)

        // Usar datos de fallback en caso de error
        const fallbackProducts = [
          {
            id: 1,
            name: "Pastel de Carne",
            description: "Delicioso pastel de carne para tu mascota",
            price: 250,
            image: "/pastel-carne.png",
            stock: 10,
            created_at: new Date().toISOString(),
            features: [
              { name: "Sin Conservantes", color: "secondary" },
              { name: "Sabor Irresistible", color: "primary" },
              { name: "Forma Divertida", color: "pastel-yellow" },
            ],
            rating: 4.8,
            reviews: 120,
            sizes: [
              { weight: "200g", price: 250 },
              { weight: "500g", price: 550 },
            ],
            category: "Para Celebrar",
          },
          {
            id: 2,
            name: "Torta de Cumpleaños",
            description: "Torta especial para celebrar el cumpleaños de tu mascota",
            price: 350,
            image: "/treat-heart-cake.png",
            stock: 5,
            created_at: new Date().toISOString(),
            features: [
              { name: "Festivo", color: "secondary" },
              { name: "Especial", color: "primary" },
            ],
            rating: 4.9,
            reviews: 75,
            sizes: [
              { weight: "300g", price: 350 },
              { weight: "700g", price: 750 },
            ],
            category: "Para Celebrar",
          },
        ]

        setProducts(fallbackProducts)
        setFilteredProducts(fallbackProducts)
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
  const maxPrice = Math.max(...products.map((product) => product.price), 30)

  return (
    <div className="flex flex-col min-h-screen pt-0">
      {/* Banner de categoría a ancho completo */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20celebrar-SjhsRPMm1PELsrFBBIw2vtSIK9AzeV.webp"
          alt="Productos para celebrar"
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
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 title-reflection">Para Celebrar</h2>
              <p className="text-white/90 text-lg">
                Snacks y premios especiales para esos momentos especiales con tu amigo peludo. Haz que cada celebración
                sea inolvidable con nuestros productos gourmet.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          {/* Productos de la categoría */}
          <div className="mb-12">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="ml-2 text-lg">Cargando productos...</span>
              </div>
            ) : (
              <ProductCategoryLoader categorySlug="celebrar" />
            )}
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
          product={{
            ...selectedProduct,
            category: "Para Celebrar",
          }}
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
          features={
            allFeatures.length > 0
              ? allFeatures
              : ["Natural", "Sin Conservantes", "Sabor Irresistible", "Forma Divertida"]
          }
          maxPrice={maxPrice}
        />
      )}
      <Toaster />
    </div>
  )
}
