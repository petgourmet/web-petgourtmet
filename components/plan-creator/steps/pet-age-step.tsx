"use client"

import { useEffect, useState } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import CustomSlider from "../custom-slider"

export default function PetAgeStep() {
  const { formData, updateFormData } = usePlanForm()
  const [years, setYears] = useState(formData.age.years)
  const [months, setMonths] = useState(formData.age.months)
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambian los años o meses
  useEffect(() => {
    // Usar un temporizador para reducir la frecuencia de actualizaciones
    const timer = setTimeout(() => {
      updateFormData({ age: { years, months } })
    }, 300) // Esperar 300ms después del último cambio

    return () => clearTimeout(timer) // Limpiar el temporizador en la limpieza
  }, [years, months, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  // Determinar si es un perro adulto (más de 1 año)
  const isAdult = years >= 1

  return (
    <FormStep stepNumber={3} title={`¿Cuál es la edad de ${petName}?`} highlightedWord="edad">
      <div className="w-full max-w-md mx-auto">
        <p className="text-center text-gray-600 mb-6">
          Desliza para seleccionar la edad aproximada de tu peludo (en años y meses)
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="text-lg font-medium text-gray-700">
              {years} {years === 1 ? "año" : "años"}
            </label>
          </div>
          <CustomSlider min={0} max={20} step={1} value={years} onChange={setYears} showMarks markCount={5} />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-lg font-medium text-gray-700">
              {months} {months === 1 ? "mes" : "meses"}
            </label>
          </div>
          <CustomSlider min={0} max={11} step={1} value={months} onChange={setMonths} showMarks markCount={4} />
        </div>

        {isAdult && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            <p>¡{petName} es un adulto! Necesita una dieta equilibrada para mantener su salud y nivel de actividad.</p>
          </div>
        )}

        {!isAdult && years === 0 && months < 3 && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800">
            <p>
              ¡{petName} es muy pequeño! Los cachorros menores de 3 meses tienen necesidades nutricionales especiales.
            </p>
          </div>
        )}
      </div>
    </FormStep>
  )
}
