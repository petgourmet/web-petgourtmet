"use client"

import { useTiendas } from "@/contexts/tiendas-context"
import { motion } from "framer-motion"
import Image from "next/image"
import { MapPin, Clock, Phone, ExternalLink } from "lucide-react"

export default function TiendasList() {
  const { tiendas, selectedTienda, setSelectedTienda, isLoading } = useTiendas()

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Boutiques Aliadas</h2>
        <p className="text-white/90">Selecciona una tienda para ver su ubicación</p>
      </div>
      
      <div className="p-6 space-y-4">
        {tiendas.map((tienda, index) => (
          <motion.div
            key={tienda.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-md ${
              selectedTienda?.id === tienda.id
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
            }`}
            onClick={() => setSelectedTienda(tienda)}
          >
            <div className="flex items-start space-x-4">
              {/* Logo placeholder */}
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                {tienda.logo ? (
                  <Image
                    src={tienda.logo}
                    alt={`Logo ${tienda.nombre}`}
                    width={48}
                    height={48}
                    className="rounded-lg"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-primary"
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
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                  {tienda.nombre}
                </h3>
                <div className="text-primary font-medium mb-2">
                  {tienda.ubicacion}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <span className="line-clamp-2">{tienda.direccion}</span>
                  </div>
                  
                  {tienda.horarios && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{tienda.horarios}</span>
                    </div>
                  )}
                  
                  {tienda.telefono && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{tienda.telefono}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(tienda.googleMapsUrl, '_blank')
                    }}
                    className="flex items-center space-x-1 text-xs bg-primary text-white px-3 py-1.5 rounded-full hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver en Maps</span>
                  </button>
                  
                  {selectedTienda?.id === tienda.id && (
                    <div className="flex items-center space-x-1 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Seleccionada</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedTienda?.id === tienda.id && tienda.descripcion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tienda.descripcion}
                </p>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">¿No encuentras una tienda cerca?</p>
          <a
            href="/contacto"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Contáctanos para más información
          </a>
        </div>
      </div>
    </div>
  )
}
