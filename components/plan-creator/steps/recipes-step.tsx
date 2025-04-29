"use client"

import { useEffect, useState } from "react"
import { usePlanForm, type Recipe } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import Image from "next/image"

export default function RecipesStep() {
  const { formData, updateFormData } = usePlanForm()
  const [recipes, setRecipes] = useState<Recipe[]>(formData.recipes || [])
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambian las recetas
  useEffect(() => {
    updateFormData({ recipes })
  }, [recipes, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  // Función para alternar una receta
  const toggleRecipe = (recipe: Recipe) => {
    if (recipes.includes(recipe)) {
      setRecipes(recipes.filter((r) => r !== recipe))
    } else {
      setRecipes([...recipes, recipe])
    }
  }

  // Verificar si una receta está seleccionada
  const isSelected = (recipe: Recipe) => recipes.includes(recipe)

  return (
    <FormStep stepNumber={8} title="¡Nuestras recetas!" highlightedWord="recetas">
      <div className="w-full max-w-md mx-auto">
        <p className="text-center text-gray-600 dark:text-black mb-6">
          Selecciona el sabor que quieres llevarle a {petName}
          <br />
          <span className="text-orange-500 dark:text-red-600 text-sm">
            (puedes escoger más de uno, pero lee abajo a nuestra veterinaria)
          </span>
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col">
            <div className="mb-4">
              <Image src="/pastel-carne.png" alt="Meat Festival" width={150} height={150} className="mx-auto" />
            </div>
            <div className="flex justify-center mb-2">
              <div className="flex space-x-1">
                <div className="w-6 h-6 rounded-full bg-red-500"></div>
                <div className="w-6 h-6 rounded-full bg-amber-700"></div>
                <div className="w-6 h-6 rounded-full bg-green-600"></div>
              </div>
            </div>
            <button
              className={`px-4 py-2 rounded-full flex items-center justify-center ${
                isSelected("meat-festival")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => toggleRecipe("meat-festival")}
            >
              <span>Res</span>
              {isSelected("meat-festival") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-col">
            <div className="mb-4">
              <Image
                src="/colorful-veggie-dog-food.png"
                alt="Veggie Delight"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>
            <div className="flex justify-center mb-2">
              <div className="flex space-x-1">
                <div className="w-6 h-6 rounded-full bg-green-500"></div>
                <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
                <div className="w-6 h-6 rounded-full bg-orange-400"></div>
              </div>
            </div>
            <button
              className={`px-4 py-2 rounded-full flex items-center justify-center ${
                isSelected("veggie-delight")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => toggleRecipe("veggie-delight")}
            >
              <span>Cerdo</span>
              {isSelected("veggie-delight") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isSelected("meat-festival") && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg">
            <h3 className="text-xl font-bold text-orange-800 dark:text-black text-center mb-2">Meat Festival</h3>
            <p className="text-sm text-center text-orange-700 dark:text-black mb-4">A base de res</p>
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="sr-only">Carne</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center">
                  <span className="sr-only">Vegetales</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="sr-only">Hierbas</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-orange-800 dark:text-black text-center">
              Con nutrientes esenciales y aminoácidos para un bienestar integral, un aporte extra de zinc y hierro para
              mayor energía y un fuerte sistema inmunológico
            </p>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 bg-white text-orange-500 dark:text-red-600 rounded-full text-sm">
                Más información
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 dark:text-black">
          <p>
            En Pet's Table manejamos 3 proteínas principales: res, cerdo y pollo. Todas nuestras recetas están
            balanceadas nutricionalmente para cubrir las necesidades de tu mascota.
          </p>
        </div>
      </div>
    </FormStep>
  )
}
