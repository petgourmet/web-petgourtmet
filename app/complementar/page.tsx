"use client"

import { useState } from "react"
import Image from "next/image"
import { Toaster } from "@/components/toaster"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ComplementarPage() {
  const [activeCategory, setActiveCategory] = useState("complementar")

  return (
    <div className="flex flex-col min-h-screen pt-0">
      {/* Banner de categoría a ancho completo */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          src="/happy-dog-nutrition.png"
          alt="Productos para complementar"
          fill
          className="object-cover saturate-90 brightness-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 flex flex-col justify-center items-center text-center">
          <div className="w-full px-4 md:px-8 lg:px-16 flex-1 flex flex-col justify-center">
            <div className="max-w-4xl mx-auto"></div>
          </div>

          {/* Contenedor glass en la parte inferior */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-md border-t border-white/20 p-6 md:p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 title-reflection">Para Complementar</h2>
              <p className="text-white/90 text-lg">
                Complementos nutricionales que enriquecen la dieta de tu mascota. 
                Ingredientes premium que aportan los nutrientes esenciales para una vida saludable.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          {/* Tabs para categorías */}
          <Tabs defaultValue="complementar" className="w-full mb-12" onValueChange={(value) => setActiveCategory(value)}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-transparent">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-full"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="celebrar"
                className="data-[state=active]:bg-yellow-400 data-[state=active]:text-gray-900 rounded-full"
              >
                Para Celebrar
              </TabsTrigger>
              <TabsTrigger
                value="premiar"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full"
              >
                Para Premiar
              </TabsTrigger>
              <TabsTrigger
                value="complementar"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-full"
              >
                Para Complementar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-8">
              <ProductCategoryLoader categorySlug="all" showAllCategories={true} />
            </TabsContent>

            <TabsContent value="celebrar" className="mt-8">
              <ProductCategoryLoader categorySlug="celebrar" />
            </TabsContent>

            <TabsContent value="premiar" className="mt-8">
              <ProductCategoryLoader categorySlug="premiar" />
            </TabsContent>

            <TabsContent value="complementar" className="mt-8">
              <ProductCategoryLoader categorySlug="complementar" />
            </TabsContent>
          </Tabs>

          {/* Sección de beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-2xl font-bold mb-6 text-primary font-display text-center">
              ¿Por qué complementar la dieta de tu mascota?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/green-leaf-icon.png" alt="Ingredientes naturales" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">100% Natural</h3>
                <p className="text-gray-600">
                  Ingredientes naturales y orgánicos seleccionados cuidadosamente para la salud de tu mascota.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/vitamins-icon.png" alt="Rico en nutrientes" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Rico en nutrientes</h3>
                <p className="text-gray-600">
                  Formulado con vitaminas, minerales y antioxidantes esenciales para el bienestar integral.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pastel-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image src="/heart-health-icon.png" alt="Mejora la salud" width={32} height={32} />
                </div>
                <h3 className="font-bold mb-2">Mejora la salud</h3>
                <p className="text-gray-600">
                  Contribuye a una mejor digestión, pelaje brillante y sistema inmunológico fuerte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
