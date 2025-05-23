"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/toaster"
import { ProductCategoryLoader } from "@/components/product-category-loader"

export default function RecetasPage() {
  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection">Nuestras Recetas</h1>
            <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto">
              Alimentos completos y balanceados elaborados con ingredientes de la más alta calidad. Nutrición óptima
              para el bienestar de tu mascota.
            </p>
          </div>

          {/* Banner de categoría */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-16">
            <Image src="/nuestras_recetas.png" alt="Nuestras recetas" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-purple-700/80 flex items-center">
              <div className="p-8 md:p-12 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display">
                  Nutrición completa y balanceada
                </h2>
                <p className="text-white mb-6">Recetas gourmet para la alimentación diaria de tu mascota</p>
                <Button className="bg-purple-500 text-white hover:bg-purple-600 font-medium rounded-full">
                  Descubrir recetas
                </Button>
              </div>
            </div>
          </div>

          {/* Productos de la categoría */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-purple-700 font-display">Recetas destacadas</h2>

            {/* Usar el componente centralizado para cargar productos */}
            <ProductCategoryLoader categorySlug="recetas" />
          </div>

          {/* Sección de beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(243,232,255,0.15)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-purple-700 font-display text-center">
              Beneficios de nuestras recetas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/juicy-steak-icon.png" alt="Ingredientes premium" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Ingredientes premium</h3>
                <p className="text-gray-600 dark:text-white">
                  Seleccionamos los mejores ingredientes para cada receta.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/assorted-vegetables-icon.png" alt="Nutrición balanceada" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Nutrición balanceada</h3>
                <p className="text-gray-600 dark:text-white">
                  Formuladas por expertos en nutrición animal para una dieta completa.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/simple-dog-paw.png" alt="Sin conservantes" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Sin conservantes</h3>
                <p className="text-gray-600 dark:text-white">Elaboradas sin conservantes ni aditivos artificiales.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
