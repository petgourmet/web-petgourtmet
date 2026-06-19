"use client"

import { useState } from "react"
import { ProductCategoryLoader } from "@/components/product-category-loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function HomeRecipesSection() {
  const [activeTab, setActiveTab] = useState("celebrar")

  return (
    <section id="nuestras-recetas" className="relative bg-[linear-gradient(180deg,_#ffffff_0%,_#f7fafb_100%)] py-20 md:py-24">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <span className="inline-flex rounded-full border border-[#dce8ea] bg-white px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_10px_24px_rgba(42,120,128,0.06)]">
            Nuestros Productos
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold text-[#16313b] md:text-5xl">
            Descubre la línea ideal para tu mascota
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5d7276]">
            Explora por categorías y encuentra la alimentación diaria, snacks nutritivos y pasteles especiales para tu compañero.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          <TabsContent value="celebrar" className="mt-6">
            <ProductCategoryLoader categorySlug="celebrar" />
          </TabsContent>
          <TabsContent value="complementar" className="mt-6">
            <ProductCategoryLoader categorySlug="complementar" />
          </TabsContent>
          <TabsContent value="premiar" className="mt-6">
            <ProductCategoryLoader categorySlug="premiar" />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
