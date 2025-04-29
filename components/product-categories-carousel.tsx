"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

// Definición de las categorías
const categories = [
  {
    id: "recetas",
    title: "Nuestras Recetas",
    description: "Descubre nuestras deliciosas recetas para tu mascota",
    image: "/nuestras_recetas.png",
    color: "from-orange-500 to-orange-600",
    href: "/recetas",
  },
  {
    id: "celebrar",
    title: "Para Celebrar",
    description: "Productos especiales para momentos de celebración",
    image: "/para_celebrar.png",
    color: "from-amber-500 to-amber-600",
    href: "/celebrar",
  },
  {
    id: "complementar",
    title: "Para Complementar",
    description: "Complementos nutricionales para tu mascota",
    image: "/para_complementar_end.png",
    color: "from-emerald-500 to-emerald-600",
    href: "/complementar",
  },
  {
    id: "premiar",
    title: "Para Premiar",
    description: "Premios y golosinas saludables",
    image: "/para_premiar_end.png",
    color: "from-sky-500 to-sky-600",
    href: "/premiar",
  },
]

export function ProductCategoriesCarousel() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-12 text-center title-reflection"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Nutrición para cada momento
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex"
            >
              <Link href={category.href} className="block w-full">
                <div
                  className={`bg-gradient-to-br ${category.color} rounded-xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:shadow-xl flex flex-col relative h-[500px] group`}
                >
                  {/* Imagen de fondo que abarca toda la tarjeta */}
                  <div className="absolute inset-0 w-full h-full">
                    {/* Overlay de color gris */}
                    <div className="absolute inset-0 bg-gray-500 opacity-40 mix-blend-multiply z-10"></div>

                    <Image
                      src={category.image || "/placeholder.svg"}
                      alt={category.title}
                      fill
                      className="object-cover transition-all duration-300 group-hover:blur-[2px] group-hover:brightness-75"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      priority={index < 2} // Carga prioritaria para las primeras dos imágenes
                    />
                    {/* Gradiente oscuro solo en la parte inferior para el texto */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 opacity-50 group-hover:opacity-90 group-hover:h-full z-20"></div>
                  </div>

                  {/* Contenido de texto en la parte inferior */}
                  <div className="mt-auto p-6 relative z-30 transition-all duration-300 transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0">
                    <h3 className="text-2xl font-bold text-white mb-2">{category.title}</h3>
                    <p className="text-white/90">{category.description}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
