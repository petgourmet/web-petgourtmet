"use client"

import { useState, useEffect, useRef } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"

export default function PetNameStep() {
  const { formData, updateFormData } = usePlanForm()
  const [name, setName] = useState(formData.name)
  const isInitialMount = useRef(true)

  // Actualizar el estado global cuando cambia el nombre, pero solo después del montaje inicial
  // y usando un temporizador para evitar actualizaciones excesivas
  useEffect(() => {
    // Omitir la primera ejecución (montaje inicial)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Usar un temporizador para reducir la frecuencia de actualizaciones
    const timer = setTimeout(() => {
      updateFormData({ name })
    }, 300)

    return () => clearTimeout(timer)
  }, [name, updateFormData])

  return (
    <FormStep
      stepNumber={1}
      title="¿Cómo se llama tu peludo?"
      highlightedWord="peludo"
      showPrevButton={false}
      infoText="Si tienes más de 1 perro, lo podrás agregar al final del formulario"
    >
      <div className="w-full max-w-md mx-auto">
        <label className="block text-sm font-medium text-gray-900 dark:text-black mb-1">Nombre:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de tu mascota"
          className="w-full p-4 bg-teal-50 dark:bg-white border border-teal-100 dark:border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-red-600 transition-all dark:text-black dark:placeholder-gray-500"
          autoFocus
        />

        {name.length > 0 && (
          <div className="mt-6 text-center">
            <span className="text-lg dark:text-black">
              ¡Hola <span className="font-bold text-teal-600 dark:text-red-600">{name}</span>! Vamos a crear un plan
              perfecto para ti.
            </span>
          </div>
        )}
      </div>
    </FormStep>
  )
}
