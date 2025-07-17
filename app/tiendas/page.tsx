import { Metadata } from "next"
import { Suspense } from "react"
import TiendasMapRobust from "@/components/tiendas/tiendas-map-robust"
import TiendasList from "@/components/tiendas/tiendas-list"
import { TiendasProvider } from "@/contexts/tiendas-context"

export const metadata: Metadata = {
  title: "Tiendas Aliadas | Pet Gourmet",
  description: "Encuentra nuestras boutiques aliadas en CDMX. Ubicaciones de Pet Society, Pets Excellence y Llaos Pet en Polanco, Escandón, Condesa y Roma Norte.",
  keywords: "Pet Gourmet, tiendas aliadas, boutiques mascotas, CDMX, Pet Society, Pets Excellence, Llaos Pet",
  openGraph: {
    title: "Tiendas Aliadas | Pet Gourmet",
    description: "Encuentra nuestras boutiques aliadas en CDMX. Ubicaciones en Polanco, Escandón, Condesa y Roma Norte.",
    images: [
      {
        url: "/petgourmet-logo.png",
        width: 1200,
        height: 630,
        alt: "Pet Gourmet - Tiendas Aliadas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiendas Aliadas | Pet Gourmet",
    description: "Encuentra nuestras boutiques aliadas en CDMX.",
    images: ["/petgourmet-logo.png"],
  },
}

export default function TiendasPage() {
  return (
    <TiendasProvider>
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--pastel-blue))] via-white to-[hsl(var(--pastel-green))] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        
        {/* Título Principal */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Encuéntranos en las boutiques de nuestros aliados
            </h1>
          </div>
        </div>
        
        {/* Main Content */}
        <main id="map-section" className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar con lista de tiendas */}
            <div className="lg:col-span-1">
              <Suspense fallback={
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
              }>
                <TiendasList />
              </Suspense>
            </div>
            
            {/* Mapa principal */}
            <div className="lg:col-span-2">
              <Suspense fallback={
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando mapa...</p>
                  </div>
                </div>
              }>
                <TiendasMapRobust />
              </Suspense>
            </div>
          </div>
          
          {/* Call to Action para distribuidores */}
          <div className="mt-16">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 max-w-4xl mx-auto border border-primary/20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                  ¿Quieres ser nuestro distribuidor?
                </h2>
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
            </div>
          </div>
        </main>
      </div>
    </TiendasProvider>
  )
}
