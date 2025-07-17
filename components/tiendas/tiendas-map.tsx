"use client"

import { useEffect, useRef } from "react"
import { useTiendas } from "@/contexts/tiendas-context"
import { useMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"

declare global {
  interface Window {
    tableau: any
  }
}

export default function TiendasMap() {
  const { selectedTienda } = useTiendas()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const vizRef = useRef<any>(null)

  useEffect(() => {
    const loadTableauViz = async () => {
      if (!mapContainerRef.current) return

      try {
        // Limpiar visualización anterior si existe
        if (vizRef.current) {
          vizRef.current.dispose()
          vizRef.current = null
        }

        // Limpiar el contenedor
        mapContainerRef.current.innerHTML = ''

        // Crear el contenedor para el viz
        const vizContainer = document.createElement('div')
        vizContainer.id = 'tableau-viz-container'
        vizContainer.style.width = '100%'
        vizContainer.style.height = isMobile ? '500px' : '600px'
        mapContainerRef.current.appendChild(vizContainer)

        // Cargar el script de Tableau si no está cargado
        if (!window.tableau) {
          await loadTableauScript()
        }

        // Configurar las opciones del viz
        const url = 'https://public.tableau.com/views/PetGourmetBoutiques/Dashboard1'
        const options = {
          width: '100%',
          height: isMobile ? '500px' : '600px',
          hideTabs: true,
          hideToolbar: false,
          device: isMobile ? 'phone' : 'desktop'
        }

        // Crear el viz
        if (window.tableau && window.tableau.Viz) {
          vizRef.current = new window.tableau.Viz(vizContainer, url, options)
        }

      } catch (error) {
        console.error('Error loading Tableau viz:', error)
        // Mostrar mensaje de error en el contenedor
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = `
            <div class="text-center p-8">
              <div class="text-red-500 mb-4">
                <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <p class="text-gray-600 dark:text-gray-400 mb-2">Error al cargar el mapa interactivo</p>
              <p class="text-sm text-gray-500">Por favor, recarga la página</p>
            </div>
          `
        }
      }
    }

    const loadTableauScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.tableau) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://public.tableau.com/javascripts/api/viz_v1.js'
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Tableau script'))
        document.head.appendChild(script)
      })
    }

    // Retrasar la carga para asegurar que el DOM esté listo
    const timer = setTimeout(loadTableauViz, 500)

    return () => {
      clearTimeout(timer)
      if (vizRef.current) {
        try {
          vizRef.current.dispose()
        } catch (error) {
          console.error('Error disposing viz:', error)
        }
      }
    }
  }, [isMobile])

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

        {/* Contenedor del mapa de Tableau */}
        <div 
          ref={mapContainerRef}
          className="w-full min-h-[600px] bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center"
        >
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando mapa interactivo...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Powered by Tableau Public
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
              Información de Navegación
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Haz clic en una tienda de la lista para centrar el mapa</li>
              <li>• Usa zoom para explorar las ubicaciones</li>
              <li>• Haz clic en "Ver en Maps" para navegación</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
              Zonas de Cobertura
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Polanco: Pet Society</li>
              <li>• Escandón: Pets Excellence</li>
              <li>• Condesa: Llaos Pet</li>
              <li>• Roma Norte: Llaos Pet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
