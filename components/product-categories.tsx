import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SpotlightCard } from "@/components/ui/spotlight-card"

// Productos específicos para cada categoría
const categories = [
  {
    id: 1,
    title: "Para Celebrar",
    description: "Snacks y premios especiales para esos momentos especiales con tu amigo peludo.",
    image: "/happy-dog-birthday.png",
    productId: 3, // ID del producto "Snacks Naturales para Celebraciones"
    color: "pastel-yellow",
    spotlightColor: "rgba(255, 236, 179, 0.3)",
    productName: "Snacks Naturales para Celebraciones",
  },
  {
    id: 2,
    title: "Para Complementar",
    description: "Suplementos nutricionales y aditivos para mejorar la dieta diaria de tu perro.",
    image: "/dog-supplement-display.png",
    productId: 4, // ID del producto "Suplemento Vitamínico Canino"
    color: "pastel-green",
    spotlightColor: "rgba(217, 245, 232, 0.3)",
    productName: "Suplemento Vitamínico Canino",
  },
  {
    id: 3,
    title: "Para Premiar",
    description: "Galletas y golosinas saludables perfectas para el entrenamiento y premiar el buen comportamiento.",
    image: "/healthy-dog-training-treats.png",
    productId: 5, // ID del producto "Premios de Entrenamiento"
    color: "pastel-blue",
    spotlightColor: "rgba(122, 184, 191, 0.2)",
    productName: "Premios de Entrenamiento",
  },
  {
    id: 4,
    title: "Nuestras Recetas",
    description: "Comidas principales con ingredientes naturales para la nutrición y el bienestar diarios.",
    image: "/natural-dog-food-ingredients.png",
    productId: 1, // ID del producto "Pastel por porción de Carne"
    color: "pastel-pink",
    spotlightColor: "rgba(249, 215, 232, 0.3)",
    productName: "Pastel por porción de Carne",
  },
]

export function ProductCategories() {
  return (
    <section className="responsive-section bg-transparent bg-illuminated">
      <div className="responsive-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Nutrición para cada momento</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Descubre nuestra gama completa de productos diseñados para satisfacer todas las necesidades nutricionales de
            tu perro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 relative z-10 py-8">
          {/* Elementos decorativos de fondo */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-xl"></div>
          {categories.map((category) => (
            <Link
              href={
                category.title === "Nuestras Recetas"
                  ? "/productos"
                  : `/${category.title?.toLowerCase().replace(/\s+/g, "-").replace("para-", "") || ''}`
              }
              key={category.id}
              className="block group"
            >
              <SpotlightCard
                spotlightColor={category.spotlightColor}
                className={`overflow-hidden border-none rounded-[1.5rem] relative h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-xl p-0 ${
                  category.id === 1
                    ? "bg-gradient-to-br from-pastel-yellow/30 to-gray-900/80"
                    : category.id === 2
                      ? "bg-gradient-to-br from-pastel-green/30 to-gray-900/80"
                      : category.id === 3
                        ? "bg-gradient-to-br from-pastel-blue/30 to-gray-900/80"
                        : "bg-gradient-to-br from-pastel-pink/30 to-gray-900/80"
                }`}
              >
                <div className="absolute inset-0 overflow-hidden z-0 rounded-[1.5rem]">
                  <div
                    className={`absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-gray-900/60 z-10 ${
                      category.id === 1
                        ? "from-pastel-yellow/40 via-gray-900/70"
                        : category.id === 2
                          ? "from-pastel-green/40 via-gray-900/70"
                          : category.id === 3
                            ? "from-pastel-blue/40 via-gray-900/70"
                            : "from-pastel-pink/40 via-gray-900/70"
                    }`}
                  ></div>
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.title}
                    fill
                    className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-70 rounded-[1.5rem]"
                  />

                  {/* Huellitas decorativas */}
                  <div className="absolute top-4 right-4 opacity-30 rotate-12 z-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12,8.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 5,8.5A3.5,3.5 0 0,1 8.5,5A3.5,3.5 0 0,1 12,8.5M12,2A6.5,6.5 0 0,0 5.5,8.5A6.5,6.5 0 0,0 12,15A6.5,6.5 0 0,0 18.5,8.5A6.5,6.5 0 0,0 12,2M12,17A7,7 0 0,0 5,24H19A7,7 0 0,0 12,17Z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-12 left-6 opacity-20 -rotate-12 z-5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12,8.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 5,8.5A3.5,3.5 0 0,1 8.5,5A3.5,3.5 0 0,1 12,8.5M12,2A6.5,6.5 0 0,0 5.5,8.5A6.5,6.5 0 0,0 12,15A6.5,6.5 0 0,0 18.5,8.5A6.5,6.5 0 0,0 12,2M12,17A7,7 0 0,0 5,24H19A7,7 0 0,0 12,17Z" />
                    </svg>
                  </div>
                </div>

                <div className="relative z-10 p-8 flex flex-col h-full rounded-[1.5rem]">
                  <div className="mb-4">
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                        category.id === 1
                          ? "bg-pastel-yellow/30 text-pastel-yellow"
                          : category.id === 2
                            ? "bg-pastel-green/30 text-pastel-green"
                            : category.id === 3
                              ? "bg-pastel-blue/30 text-pastel-blue"
                              : "bg-pastel-pink/30 text-pastel-pink"
                      }`}
                    >
                      {category.id === 1
                        ? "🎂 Celebraciones"
                        : category.id === 2
                          ? "💪 Suplementos"
                          : category.id === 3
                            ? "🏆 Premios"
                            : "🍽️ Alimentación"}
                    </div>
                    <h3 className="text-2xl font-bold text-white font-display mb-4">{category.title}</h3>
                    <p className="text-gray-300 mb-8">{category.description}</p>
                  </div>

                  <div className="mt-auto">
                    {/* Botón con colores armónicos */}
                    <div
                      className={`relative overflow-hidden rounded-full py-3 px-6 transform hover:scale-105 transition-all duration-300 shadow-lg mb-0 max-w-[90%] border border-white/20 backdrop-blur-sm group-hover:translate-y-1 group-hover:shadow-xl flex items-center ${
                        category.id === 1
                          ? "bg-pastel-yellow/30 hover:bg-pastel-yellow/40"
                          : category.id === 2
                            ? "bg-pastel-green/30 hover:bg-pastel-green/40"
                            : category.id === 3
                              ? "bg-pastel-blue/30 hover:bg-pastel-blue/40"
                              : "bg-pastel-pink/30 hover:bg-pastel-pink/40"
                      }`}
                    >
                      <span className="text-white font-bold">
                        {category.title === "Nuestras Recetas" ? "Ver todos los productos" : category.productName}
                      </span>
                      <div className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-white/10">
                        <ArrowRight
                          size={16}
                          className="text-white transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
