"use client"

import { useEffect, useRef, useState } from "react"
import { useTiendas } from "@/contexts/tiendas-context"
import { useMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"

export default function TiendasMapRobust() {
  const { selectedTienda } = useTiendas()
  const isMobile = useMobile()
  const [mapMode, setMapMode] = useState<'loading' | 'iframe' | 'error'>('loading')
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // URL del dashboard de Tableau para iframe
  const tableauIframeUrl = "https://public.tableau.com/views/PetGourmetBoutiques/Dashboard1?:language=es-ES&:display_count=n&:origin=viz_share_link&:embed=y&:showVizHome=no&:toolbar=yes"
  
  useEffect(() => {
    // Usar iframe directamente como es más confiable
    const timer = setTimeout(() => {
      setMapMode('iframe')
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  const handleIframeError = () => {
    setMapMode('error')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Mapa de Ubicaciones</h2>
        <p className="text-white/90">
          {selectedTienda 
            ? `Mostrando: ${selectedTienda.nombre} - ${selectedTienda.ubicacion}`
            : "Explora nuestras boutiques aliadas en la CDMX"
          }
        </p>
      </div>

      <div className="p-6">
        {selectedTienda && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  {selectedTienda.nombre} - {selectedTienda.ubicacion}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedTienda.direccion}
                </p>
              </div>
              <a
                href={selectedTienda.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Ir a Maps
              </a>
            </div>
          </motion.div>
        )}

        {/* Contenedor del mapa */}
        <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden relative">
          {mapMode === 'loading' && (
            <div className="flex items-center justify-center" style={{ height: isMobile ? '500px' : '600px' }}>
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Cargando mapa interactivo...</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Powered by Tableau Public
                </p>
              </div>
            </div>
          )}

          {mapMode === 'iframe' && (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 z-10">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
                  </div>
                </div>
              )}
              <iframe
                src={tableauIframeUrl}
                width="100%"
                height={isMobile ? "500" : "600"}
                frameBorder="0"
                allowFullScreen
                title="Mapa de Boutiques Pet Gourmet"
                className="w-full rounded-lg"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{ 
                  minHeight: isMobile ? '500px' : '600px',
                  backgroundColor: 'transparent'
                }}
              />
            </>
          )}

          {mapMode === 'error' && (
            <div className="flex items-center justify-center" style={{ height: isMobile ? '500px' : '600px' }}>
              <div className="text-center p-8">
                <div className="text-red-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Error al cargar el mapa interactivo</p>
                <button 
                  onClick={() => setMapMode('iframe')}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
