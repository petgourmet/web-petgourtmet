"use client"

import { useEffect, useState } from "react"
import { usePlanForm, type Allergy } from "@/contexts/plan-form-context"
import FormStep from "../form-step"

export default function AllergiesStep() {
  const { formData, updateFormData } = usePlanForm()
  const [allergies, setAllergies] = useState<Allergy[]>(formData.allergies || [])
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambian las alergias
  useEffect(() => {
    updateFormData({ allergies })
  }, [allergies, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  // Función para alternar una alergia
  const toggleAllergy = (allergy: Allergy) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter((a) => a !== allergy))
    } else {
      setAllergies([...allergies, allergy])
    }
  }

  // Verificar si una alergia está seleccionada
  const isSelected = (allergy: Allergy) => allergies.includes(allergy)

  return (
    <FormStep stepNumber={7} title={`¿Es ${petName} alérgic@ a alguna de estas proteínas?`} highlightedWord={petName}>
      <div className="w-full max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                isSelected("beef")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-500 dark:text-black"
              } cursor-pointer transition-colors`}
              onClick={() => toggleAllergy("beef")}
            >
              <img src="/beef-cut-icon.png" alt="Res" className="w-10 h-10" />
            </div>
            <button
              className={`px-4 py-1 rounded-full flex items-center ${
                isSelected("beef")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => toggleAllergy("beef")}
            >
              <span>Res</span>
              {isSelected("beef") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
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
                  className="h-5 w-5 ml-1"
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

          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                isSelected("chicken")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-500 dark:text-black"
              } cursor-pointer transition-colors`}
              onClick={() => toggleAllergy("chicken")}
            >
              <img src="/cooked-chicken-piece.png" alt="Pollo" className="w-10 h-10" />
            </div>
            <button
              className={`px-4 py-1 rounded-full flex items-center ${
                isSelected("chicken")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => toggleAllergy("chicken")}
            >
              <span>Pollo</span>
              {isSelected("chicken") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
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
                  className="h-5 w-5 ml-1"
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

          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                isSelected("pork")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-500 dark:text-black"
              } cursor-pointer transition-colors`}
              onClick={() => toggleAllergy("pork")}
            >
              <img src="/pork-cut-icon.png" alt="Cerdo" className="w-10 h-10" />
            </div>
            <button
              className={`px-4 py-1 rounded-full flex items-center ${
                isSelected("pork")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => toggleAllergy("pork")}
            >
              <span>Cerdo</span>
              {isSelected("pork") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
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
                  className="h-5 w-5 ml-1"
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

          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                isSelected("none")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-500 dark:text-black"
              } cursor-pointer transition-colors`}
              onClick={() => setAllergies(isSelected("none") ? [] : ["none"])}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <button
              className={`px-4 py-1 rounded-full flex items-center ${
                isSelected("none")
                  ? "bg-teal-500 dark:bg-red-600 text-white"
                  : "bg-teal-50 text-teal-700 dark:text-black"
              }`}
              onClick={() => setAllergies(isSelected("none") ? [] : ["none"])}
            >
              <span>Ninguno</span>
              {isSelected("none") ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
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
                  className="h-5 w-5 ml-1"
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

        {allergies.length > 0 && allergies[0] !== "none" && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 dark:text-black">
            <p>
              En caso de que tu perrit@ tenga sensibilidades digestivas, condiciones médicas o enfermedades, contáctanos
              para poder indicarte si es candidato o no a consumir nuestro alimento, también puedes consultar nuestro
              índice de enfermedades.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-teal-50 border border-teal-100 rounded-lg text-teal-800 dark:text-black">
          <p>Pet's Table no contiene harinas, aceites vegetales, gluten, sales ni azúcares añadidos.</p>
        </div>
      </div>
    </FormStep>
  )
}
