"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { NutritionChart } from "./nutrition-chart"
import { IngredientIcon } from "./ingredient-icon"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import type { Product } from "./product-data"

interface ProductSlideProps {
  product: Product
}

export function ProductSlide({ product }: ProductSlideProps) {
  // Obtener el color de fondo basado en la categoría
  const getBgColor = () => {
    switch (product.category) {
      case "celebrar":
        return "bg-amber-500"
      case "complementar":
        return "bg-emerald-500"
      case "premiar":
        return "bg-sky-500"
      case "recetas":
        return product.variant === "res" ? "bg-orange-500" : product.variant === "pollo" ? "bg-teal-500" : "bg-lime-500"
      default:
        return "bg-primary"
    }
  }

  // Animaciones para los elementos
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div className={`w-full h-full ${getBgColor()} relative overflow-hidden`}>
      {/* Círculo decorativo */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-white/20 rounded-full -mt-[300px]"></div>

      {/* Contenido principal */}
      <div className="w-full px-4 md:px-6 lg:px-8 h-full flex flex-col">
        {/* Imagen del producto */}
        <div className="relative h-[300px] flex justify-center items-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative w-[200px] h-[300px]"
          >
            <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-contain" />
          </motion.div>
        </div>

        {/* Información del producto */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Columna izquierda */}
          <div className="text-white">
            <motion.h2 className="text-4xl font-bold mb-2" variants={itemVariants}>
              {product.category === "recetas"
                ? "Nuestras Recetas"
                : product.category === "celebrar"
                  ? "Para Celebrar"
                  : product.category === "complementar"
                    ? "Para Complementar"
                    : "Para Premiar"}
            </motion.h2>

            <motion.h3 className="text-2xl mb-6" variants={itemVariants}>
              {product.name} / {product.subtitle}
            </motion.h3>

            <motion.div className="flex space-x-2 mb-6" variants={itemVariants}>
              {product.ingredients.map((ingredient, index) => (
                <IngredientIcon key={index} icon={ingredient.icon} name={ingredient.name} />
              ))}
            </motion.div>

            <motion.p className="mb-6" variants={itemVariants}>
              {product.description}
            </motion.p>

            <motion.div variants={itemVariants}>
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/40 rounded-full"
              >
                Más información de la receta <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Columna derecha - Información nutricional */}
          <div className="flex flex-col items-center">
            <motion.div className="w-full max-w-[300px]" variants={itemVariants}>
              <NutritionChart data={product.nutritionData} />
            </motion.div>

            <motion.div className="mt-6 text-white" variants={itemVariants}>
              <h4 className="font-medium mb-2">Porcentajes en materia seca</h4>
              <p className="text-sm mb-4">(Si fuéramos croquetas)</p>

              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-800 rounded-sm mr-2"></div>
                  <span>{product.nutritionData.protein}% Proteína (Mín.)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded-sm mr-2"></div>
                  <span>{product.nutritionData.moisture}% Humedad (Máx.)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-200 rounded-sm mr-2"></div>
                  <span>{product.nutritionData.fat}% Grasa (Mín.)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-sm mr-2"></div>
                  <span>{product.nutritionData.ash}% Ceniza (Máx.)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-brown-500 rounded-sm mr-2"></div>
                  <span>{product.nutritionData.fiber}% Fibra (Máx.)</span>
                </div>
              </div>

              <p className="mt-4 font-medium">{product.nutritionData.calories} Kcal EM por kilogramo</p>
            </motion.div>

            <motion.div className="mt-6 flex space-x-4" variants={itemVariants}>
              <Button className="bg-white text-primary hover:bg-white/90 rounded-full">Ver % materia seca</Button>
              <Button variant="outline" className="text-white border-white/40 rounded-full">
                Ver % materia húmeda
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
