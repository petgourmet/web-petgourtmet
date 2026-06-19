"use client"

import { useState } from "react"
import Image from "next/image"
import { Toaster } from "@/components/toaster"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Shield, Star } from "lucide-react"

const TITLES: Record<string, string> = {
  celebrar: "Pasteles de Cumpleaños",
  premiar: "Snacks",
  complementar: "Alimentación Diaria",
}

export default function PremiarPage() {
  const [activeCategory, setActiveCategory] = useState("premiar")

  return (
    <div className="flex flex-col min-h-screen pt-0">
      {/* Banner de categoría a ancho completo */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          src="/happy-dog-treat.webp"
          alt="Snacks"
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
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 title-reflection">
                {TITLES[activeCategory] ?? "Snacks"}
              </h1>
              <p className="text-white/90 text-lg">
                Deliciosos premios y snacks que harán feliz a tu mascota. Perfectos para entrenamientos
                y momentos especiales con ingredientes naturales de la más alta calidad.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          {/* Tabs para categorías */}
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value)} className="w-full mb-12">
            <TabsList className="flex flex-wrap justify-center gap-3 bg-transparent w-full mb-10 h-auto">
              <TabsTrigger
                value="celebrar"
                className="w-auto px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full border border-[#e2e8f0] shadow-sm text-sm font-medium transition-all duration-300"
              >
                Pasteles de cumpleaños
              </TabsTrigger>
              <TabsTrigger
                value="complementar"
                className="w-auto px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full border border-[#e2e8f0] shadow-sm text-sm font-medium transition-all duration-300"
              >
                Alimentación diaria
              </TabsTrigger>
              <TabsTrigger
                value="premiar"
                className="w-auto px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white rounded-full border border-[#e2e8f0] shadow-sm text-sm font-medium transition-all duration-300"
              >
                Snacks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="celebrar" className="mt-8">
              <ProductCategoryLoader categorySlug="celebrar" />
            </TabsContent>

            <TabsContent value="complementar" className="mt-8">
              <ProductCategoryLoader categorySlug="complementar" />
            </TabsContent>

            <TabsContent value="premiar" className="mt-8">
              <ProductCategoryLoader categorySlug="premiar" />
            </TabsContent>
          </Tabs>

          {/* Sección de Beneficios */}
          <div className="bg-white/85 backdrop-blur-sm dark:bg-[rgba(231,174,132,0.85)] dark:backdrop-blur-sm rounded-2xl p-8 shadow-md mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">¿Por qué elegir nuestros snacks?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Sabor Irresistible</h3>
                <p className="text-gray-600">
                  Premios con sabores que enloquecen a las mascotas, perfectos para entrenamientos y momentos especiales.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ingredientes Naturales</h3>
                <p className="text-gray-600">
                  Elaborados con ingredientes naturales y sin conservantes artificiales para cuidar la salud de tu mascota.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Refuerzo Positivo</h3>
                <p className="text-gray-600">
                  Ideales para entrenamientos y refuerzo positivo, fortaleciendo el vínculo con tu mascota.
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
