"use client"

import { useEffect, useState } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import SelectionCard from "../selection-card"

// Lista de razas comunes de perros
const DOG_BREEDS = [
  "Beagle",
  "Bergamasco",
  "Bichón Frisé",
  "Border Collie",
  "Boston Terrier",
  "Boxer",
  "Bulldog Francés",
  "Bulldog Inglés",
  "Caniche",
  "Chihuahua",
  "Cocker Spaniel",
  "Dálmata",
  "Dandie Dinmont Terrier",
  "Doberman",
  "Dogo Argentino",
  "Golden Retriever",
  "Husky Siberiano",
  "Jack Russell Terrier",
  "Labrador Retriever",
  "Maltés",
  "Pastor Alemán",
  "Pekingese",
  "Pinscher Miniatura",
  "Pitbull",
  "Pomerania",
  "Pug",
  "Rottweiler",
  "Salchicha",
  "Schnauzer",
  "Shih Tzu",
  "Yorkshire Terrier",
]

export default function BreedNeuteredStep() {
  const { formData, updateFormData } = usePlanForm()
  const [breed, setBreed] = useState(formData.breed)
  const [isNeutered, setIsNeutered] = useState(formData.isNeutered)
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambia la raza o estado de esterilización
  useEffect(() => {
    updateFormData({ breed, isNeutered })
  }, [breed, isNeutered, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  return (
    <FormStep stepNumber={4} title={`¿${petName} está esterilizad@?`} highlightedWord="esterilizad@">
      <div className="w-full max-w-md mx-auto">
        {/* Selector de raza */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-black mb-1">Raza:</label>
          <div className="relative">
            <select
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full p-4 bg-teal-50 dark:bg-white dark:text-black border border-teal-100 dark:border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-red-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Selecciona una raza</option>
              {DOG_BREEDS.map((dogBreed) => (
                <option key={dogBreed} value={dogBreed}>
                  {dogBreed}
                </option>
              ))}
            </select>

            {/* Flecha desplegable */}
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Opciones de esterilización */}
        <div className="mt-8">
          <p className="text-center text-gray-600 dark:text-black mb-4">¿Está esterilizad@?</p>
          <div className="grid grid-cols-2 gap-4">
            <SelectionCard
              selected={isNeutered === true}
              onClick={() => setIsNeutered(true)}
              label="Sí está esterilizad@"
            />
            <SelectionCard
              selected={isNeutered === false}
              onClick={() => setIsNeutered(false)}
              label="No está esterilizad@"
            />
          </div>
        </div>

        {/* Información adicional */}
        {breed && (
          <div className="mt-8 p-4 bg-teal-50 border border-teal-100 rounded-lg">
            <div className="flex items-center">
              <img src="/simple-dog-paw.png" alt="Paw" className="w-12 h-12 mr-4" />
              <div>
                <p className="text-teal-800 dark:text-black">
                  Cada raza tiene necesidades nutricionales específicas. Hemos tomado en cuenta que {petName} es un{" "}
                  {breed}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormStep>
  )
}
