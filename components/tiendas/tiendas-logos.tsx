"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useTiendas } from "@/contexts/tiendas-context"

export default function TiendasLogos() {
  const { tiendas, setSelectedTienda } = useTiendas()

  // Agrupar tiendas únicas por nombre
  const uniqueStores = tiendas.reduce((acc, tienda) => {
    if (!acc.find(t => t.nombre === tienda.nombre)) {
      acc.push(tienda)
    }
    return acc
  }, [] as typeof tiendas)

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Encuentra Pet Gourmet en estas boutiques
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Nuestros productos están disponibles en las mejores boutiques especializadas de la CDMX
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {uniqueStores.map((tienda, index) => (
            <motion.div
              key={tienda.nombre}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedTienda(tienda)
                // Scroll to map section
                const mapSection = document.querySelector('#map-section')
                if (mapSection) {
                  mapSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 border border-gray-200 dark:border-gray-600">
                {/* Logo */}
                <div className="w-24 h-24 mx-auto mb-6 bg-white dark:bg-gray-600 rounded-xl shadow-md flex items-center justify-center overflow-hidden group-hover:shadow-lg transition-shadow">
                  {tienda.logo ? (
                    <Image
                      src={tienda.logo}
                      alt={`Logo ${tienda.nombre}`}
                      width={80}
                      height={80}
                      className="rounded-lg object-contain"
                    />
                  ) : (
                    <svg
                      className="w-12 h-12 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  )}
                </div>

                {/* Nombre de la tienda */}
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-2">
                  {tienda.nombre}
                </h3>

                {/* Ubicaciones */}
                <div className="text-center">
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {tiendas
                      .filter(t => t.nombre === tienda.nombre)
                      .map(t => (
                        <span
                          key={t.id}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {t.ubicacion}
                        </span>
                      ))}
                  </div>

                  {tienda.descripcion && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {tienda.descripcion}
                    </p>
                  )}

                  <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full transition-colors font-medium group-hover:shadow-md">
                    Ver ubicaciones
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 max-w-4xl mx-auto border border-primary/20">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              ¿Quieres ser nuestro distribuidor?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              Únete a nuestra red de boutiques aliadas y ofrece productos Pet Gourmet en tu establecimiento
            </p>
            <a
              href="/contacto"
              className="inline-flex items-center bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full transition-colors font-medium text-lg shadow-lg hover:shadow-xl"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Contáctanos
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
