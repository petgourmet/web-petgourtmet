"use client"
// ============================================================
// SECTION 7 – Recetas recomendadas
//
// Muestra las recetas compatibles (sin alérgenos del perro).
// El usuario puede seleccionar/deseleccionar las que quiere.
// Muestra: imagen, nombre, consumo diario en gramos, ingredientes.
// ============================================================

import Image from "next/image"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import type { CalculatorFormData } from "../types"
import type { Recipe } from "../types"

interface RecipeRecommendationSectionProps {
  petName: string
  dailyGrams: number
  gramsPerServing: number
  recipes: Recipe[]  // ya filtradas por alérgenos
  selectedRecipes: string[]
  onChange: (updates: Partial<CalculatorFormData>) => void
}

export function RecipeRecommendationSection({
  petName,
  dailyGrams,
  gramsPerServing,
  recipes,
  selectedRecipes,
  onChange,
}: RecipeRecommendationSectionProps) {
  const name = petName || "tu perro"

  const toggleRecipe = (id: string) => {
    const updated = selectedRecipes.includes(id)
      ? selectedRecipes.filter((r) => r !== id)
      : [...selectedRecipes, id]
    onChange({ selectedRecipes: updated })
  }

  return (
    <div className="w-full">
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">
        Para que{" "}
        <span className="font-semibold capitalize">{name}</span> mantenga su
        peso ideal, su requerimiento diario recomendado es de{" "}
        <span className="font-bold text-[#5a8a5a]">{dailyGrams}g</span>, repartidos
        en <span className="font-semibold">2 tomas de {gramsPerServing}g</span>.
      </p>

      {recipes.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          Todas las recetas contienen proteínas a las que{" "}
          <span className="capitalize">{name}</span> es alérgico/a. Por favor
          contáctanos para una recomendación personalizada.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recipes.map((recipe, idx) => {
            const isSelected = selectedRecipes.includes(recipe.id)
            return (
              <motion.button
                key={recipe.id}
                type="button"
                onClick={() => toggleRecipe(recipe.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-[#2a7880] bg-[#eef7f8] shadow-md"
                    : "border-gray-200 bg-white hover:border-[#7AB8BF] hover:shadow-sm"
                }`}
              >
                {/* Imagen del producto */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={recipe.image}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback a placeholder si no hay asset
                      ;(e.currentTarget as HTMLImageElement).src =
                        "/full-nutritious-dog-bowl.webp"
                    }}
                  />
                </div>

                {/* Nombre */}
                <p className="text-sm font-semibold text-gray-800 text-center leading-tight">
                  {recipe.name}
                </p>

                {/* Gramos */}
                <p className="text-xs text-gray-500 text-center">
                  Consumo:{" "}
                  <span className="font-bold text-gray-700">{dailyGrams}g al día</span>,
                  repartidos en sus tomas habituales.
                </p>

                {/* Ingredientes */}
                <ul className="w-full space-y-1.5">
                  {recipe.ingredients.map((ing) => (
                    <li
                      key={ing.name}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <Image
                        src={ing.icon}
                        alt={ing.name}
                        width={20}
                        height={20}
                        className="rounded-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src =
                            "/iconos/image/carrot-slice.png"
                        }}
                      />
                      {ing.name}
                    </li>
                  ))}
                </ul>

                {/* Botón seleccionado */}
                <div
                  className={`mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#2a7880] text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check size={14} />
                      Seleccionado
                    </>
                  ) : (
                    "Seleccionar"
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
