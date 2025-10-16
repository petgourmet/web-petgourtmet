"use client"

import { Toaster } from "@/components/toaster"
import { useSearchParams } from "next/navigation"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProductosPage() {
  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get("categoria")

  // Determinar la categoría a mostrar basada en el parámetro de URL
  const categorySlug = categoriaParam || "all"

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <div className="responsive-container py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 title-reflection text-center">Nuestras Recetas</h1>
        <p className="text-lg text-gray-600 dark:text-white max-w-3xl mx-auto text-center mb-12">
          Descubre nuestra selección de productos premium para mascotas, elaborados con ingredientes de la más alta
          calidad y diseñados para el bienestar de tu amigo peludo.
        </p>

        {/* Tabs para categorías */}
        <Tabs defaultValue={categorySlug} className="w-full mb-12">
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
      </div>

      <Toaster />
    </div>
  )
}
