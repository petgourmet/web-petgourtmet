"use client"

import { useEffect, useRef, useState } from "react"
import { useTiendas } from "@/contexts/tiendas-context"
import { useMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"

export default function TiendasMapFallback() {
  const { selectedTienda } = useTiendas()
  const isMobile = useMobile()
  const [useIframe, setUseIframe] = useState(false)

  // URL del dashboard de Tableau
  const tableauUrl = "https://public.tableau.com/views/PetGourmetBoutiques/Dashboard1?:language=es-ES&:display_count=n&:origin=viz_share_link&:embed=y&:showVizHome=no&:toolbar=yes"

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
        <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
          <iframe
            src={tableauUrl}
            width="100%"
            height={isMobile ? "500" : "600"}
            frameBorder="0"
            allowFullScreen
            title="Mapa de Boutiques Pet Gourmet"
            className="w-full rounded-lg"
            onError={() => setUseIframe(true)}
          />
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-600 dark:text-gray-400">
            Si tienes problemas para ver el mapa, por favor intenta con otro navegador o dispositivo.
          </p>      
        </div>
      </div>
    </div>
  )
}