"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { usePlanForm } from "@/contexts/plan-form-context"
import { useEffect, useState, useRef } from "react"

interface FormStepProps {
  stepNumber: number
  title: string
  highlightedWord?: string
  children: ReactNode
  showNextButton?: boolean
  showPrevButton?: boolean
  infoText?: string
}

export default function FormStep({
  stepNumber,
  title,
  highlightedWord,
  children,
  showNextButton = true,
  showPrevButton = true,
  infoText,
}: FormStepProps) {
  const { currentStep, goToNextStep, goToPreviousStep, isStepValid, formData, updateFormData } = usePlanForm()

  // Estado local para años y meses
  const [years, setYears] = useState(formData.age?.years || 1)
  const [months, setMonths] = useState(formData.age?.months || 1)

  // Estado local para peso
  const [weight, setWeight] = useState(formData.weight || 7)

  // Añadir esta línea después de las declaraciones de estado
  const didInit = useRef(false)

  // Crear arrays con todos los números - Limitando años a 20
  const yearsArray = Array.from({ length: 20 }, (_, i) => i + 1)
  const monthsArray = Array.from({ length: 12 }, (_, i) => i + 1)

  // Crear array para pesos (de 0.5kg a 50kg con incrementos de 0.5kg)
  const weightArray = Array.from({ length: 100 }, (_, i) => (i + 1) * 0.5)

  // Reemplazar el useEffect actual con este:
  useEffect(() => {
    if (currentStep === stepNumber && !didInit.current) {
      // Asegurar que los años no excedan 20
      const validYears = Math.min(20, formData.age?.years || 1)
      const validMonths = formData.age?.months || 1
      const validWeight = formData.weight || 7

      setYears(validYears)
      setMonths(validMonths)
      setWeight(validWeight)

      // Actualizar formData si los valores han cambiado
      if (validYears !== formData.age?.years || validMonths !== formData.age?.months) {
        updateFormData({
          age: { years: validYears, months: validMonths },
          weight: validWeight,
        })
      }

      didInit.current = true
    }
  }, [currentStep, stepNumber, formData.age?.years, formData.age?.months, formData.weight, updateFormData])

  // Función para manejar cambios en años
  const handleYearsChange = (newYears: number) => {
    setYears(newYears)
    updateFormData({
      age: { years: newYears, months },
    })
  }

  // Función para manejar cambios en meses
  const handleMonthsChange = (newMonths: number) => {
    setMonths(newMonths)
    updateFormData({
      age: { years, months: newMonths },
    })
  }

  // Función para manejar cambios en peso
  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight)
    updateFormData({ weight: newWeight })
  }

  if (currentStep !== stepNumber) {
    return null
  }

  const renderTitle = () => {
    if (!highlightedWord) {
      return <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{title}</h2>
    }

    const parts = title.split(highlightedWord)
    return (
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {parts[0]}
        <span className="text-teal-500">{highlightedWord}</span>
        {parts[1]}
      </h2>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {renderTitle()}

      {infoText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">{infoText}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        {stepNumber === 4 ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Años</label>
              <select
                value={years}
                onChange={(e) => handleYearsChange(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {yearsArray.map((year) => (
                  <option key={year} value={year}>
                    {year} {year === 1 ? "año" : "años"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meses</label>
              <select
                value={months}
                onChange={(e) => handleMonthsChange(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {monthsArray.map((month) => (
                  <option key={month} value={month}>
                    {month} {month === 1 ? "mes" : "meses"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : stepNumber === 5 ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
            <select
              value={weight}
              onChange={(e) => handleWeightChange(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {weightArray.map((w) => (
                <option key={w} value={w}>
                  {w} kg
                </option>
              ))}
            </select>
          </div>
        ) : (
          children
        )}
      </div>

      <div className="flex justify-between items-center">
        {showPrevButton && currentStep > 1 ? (
          <button
            type="button"
            onClick={goToPreviousStep}
            className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Anterior
          </button>
        ) : (
          <div />
        )}

        {showNextButton && (
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!isStepValid(stepNumber)}
            className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {stepNumber === 9 ? "Crear Plan" : "Siguiente"}
          </button>
        )}
      </div>
    </motion.div>
  )
}
