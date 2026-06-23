"use client"

import { useState } from "react"
import Image from "next/image"
import { Toaster } from "@/components/toaster"
import { useSearchParams } from "next/navigation"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const CATEGORIES: Record<string, { title: string; description: string; image: string }> = {
  celebrar: {
    title: "Pasteles de Cumpleaños",
    description: "Momentos especiales con productos pensados para consentir a tu mejor amigo.",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20celebrar-SjhsRPMm1PELsrFBBIw2vtSIK9AzeV.webp",
  },
  complementar: {
    title: "Alimentación Diaria",
    description: "Nutrición premium horneada con ingredientes frescos para un compañero más sano.",
    image: "/complementar-dog-treat.webp",
  },
  premiar: {
    title: "Snacks",
    description: "Snacks nutritivos que elevan cada buena conducta y momento especial.",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Para%20premiar-3zEy8fX4CSDDrmAnYIJpl2cV1t26l3.webp",
  },
}

export default function ProductosPage() {
  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get("categoria")

  const categorySlug = (categoriaParam && ["celebrar", "premiar", "complementar"].includes(categoriaParam))
    ? categoriaParam
    : "celebrar"
  const [activeTab, setActiveTab] = useState(categorySlug)

  const current = CATEGORIES[activeTab]

  return (
    <div className="flex flex-col min-h-screen pt-0">

      {/* Hero — mismo estilo que /celebrar */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <Image
          key={activeTab}
          src={current.image}
          alt={current.title}
          fill
          priority
          className="object-cover saturate-90 brightness-60 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 flex flex-col justify-end">
          <div className="bg-black/20 backdrop-blur-md border-t border-white/20 p-6 md:p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 title-reflection">
                {current.title}
              </h1>
              <p className="text-white/90 text-lg">{current.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Productos */}
      <div className="responsive-section bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="responsive-container">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-12">
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
        </div>
      </div>

      <Toaster />
    </div>
  )
}
