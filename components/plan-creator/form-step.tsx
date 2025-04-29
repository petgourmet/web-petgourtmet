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
      setYears(validYears)
      setMonths(formData.age?.months || 1)

      // Inicializar peso
      setWeight(formData.weight || 7)

      // Si los años en formData exceden 20, actualizar el formData
      if (formData.age?.years > 20) {
        updateFormData({
          age: {
            ...(formData.age ?? {}),
            years: 20,
          },
        })
      }

      didInit.current = true
    }
  }, [currentStep, stepNumber])

  // Reemplazar la función selectYear con esta:
  function selectYear(year) {
    setYears(year)
    updateFormData({
      age: {
        ...(formData.age ?? {}),
        years: year,
        months: months,
      },
    })
  }

  // Reemplazar la función selectMonth con esta:
  function selectMonth(month) {
    setMonths(month)
    updateFormData({
      age: {
        ...(formData.age ?? {}),
        years: years,
        months: month,
      },
    })
  }

  // Función para seleccionar peso
  function selectWeight(w) {
    setWeight(w)
    updateFormData({
      weight: w,
    })
  }

  // Función para verificar si la edad es válida
  const isAgeValid = () => {
    return years > 0 && months > 0
  }

  // Función para verificar si el peso es válido
  const isWeightValid = () => {
    return weight > 0
  }

  // Solo mostrar si es el paso actual
  if (currentStep !== stepNumber) return null

  // Dividir el título para resaltar la palabra específica
  let titleParts: ReactNode[] = []

  if (highlightedWord && title.includes(highlightedWord)) {
    const parts = title.split(highlightedWord)
    titleParts = [
      parts[0],
      <span key="highlight" className="text-primary dark:text-red-600">
        {highlightedWord}
      </span>,
      parts[1],
    ]
  }

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto bg-white rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 dark:text-black">
        {stepNumber === 7
          ? "¿Tu mascota es alérgica a alguna de estas comidas?"
          : titleParts.length > 0
            ? titleParts
            : title}
      </h2>

      {/* Línea de tiempo interactiva para el paso de edad (paso 3) */}
      {stepNumber === 3 && (
        <div className="mb-8 mt-4 space-y-8">
          {/* Línea de tiempo para AÑOS */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-black">Años</h3>
            <div className="relative w-full h-20 bg-gray-100 rounded-full overflow-hidden">
              {/* Eliminamos la barra de progreso que se llena */}

              {/* Marcas de edad en el eje X */}
              <div className="absolute inset-0 flex items-center justify-between px-2 overflow-x-auto">
                {yearsArray.map((age) => (
                  <button
                    key={age}
                    type="button"
                    className="flex flex-col items-center z-10 relative px-1 bg-transparent border-none cursor-pointer min-w-[24px] sm:min-w-[28px]"
                    onClick={() => selectYear(age)}
                  >
                    <div
                      className={`w-1 h-5 ${
                        age <= years ? "bg-teal-500" : "bg-white"
                      } mb-1 rounded-full transition-all`}
                    ></div>
                    <span
                      className={`text-xs sm:text-sm md:text-base font-medium ${
                        age <= years ? "text-teal-500 font-bold" : "text-white drop-shadow-md"
                      } transition-all`}
                    >
                      {age}
                    </span>
                    {age === years && (
                      <div className="absolute -bottom-1 w-3 h-3 bg-primary dark:bg-red-600 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Indicador de años seleccionados */}
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-teal-600 dark:text-black">{years} años</span>
            </div>
          </div>

          {/* Línea de tiempo para MESES */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-black">Meses</h3>
            <div className="relative w-full h-20 bg-gray-100 rounded-full overflow-hidden">
              {/* Eliminamos la barra de progreso que se llena */}

              {/* Marcas de meses en el eje X */}
              <div className="absolute inset-0 flex items-center justify-between px-2">
                {monthsArray.map((month) => (
                  <button
                    key={month}
                    type="button"
                    className="flex flex-col items-center z-10 relative px-1 bg-transparent border-none cursor-pointer min-w-[24px] sm:min-w-[28px]"
                    onClick={() => selectMonth(month)}
                  >
                    <div
                      className={`w-1 h-5 ${
                        month <= months ? "bg-amber-500" : "bg-white"
                      } mb-1 rounded-full transition-all`}
                    ></div>
                    <span
                      className={`text-xs sm:text-sm md:text-base font-medium ${
                        month <= months ? "text-amber-500 font-bold" : "text-white drop-shadow-md"
                      } transition-all`}
                    >
                      {month}
                    </span>
                    {month === months && (
                      <div className="absolute -bottom-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Indicador de meses seleccionados */}
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-amber-600 dark:text-black">{months} meses</span>
            </div>
          </div>

          {/* Resumen de edad seleccionada */}
          <div className="text-center mt-4 p-6 bg-gradient-to-r from-teal-50 to-amber-50 rounded-lg border-2 border-primary dark:border-red-600 shadow-md">
            <h4 className="text-lg font-bold text-gray-700 dark:text-black mb-2">Edad seleccionada:</h4>
            <div className="flex justify-center items-center space-x-2">
              <div className="flex flex-col items-center bg-teal-100 px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold text-primary dark:text-red-600">{years}</span>
                <span className="text-xs text-gray-600 dark:text-black">años</span>
              </div>
              <span className="text-lg text-gray-500 dark:text-black">y</span>
              <div className="flex flex-col items-center bg-amber-100 px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold text-amber-600 dark:text-red-600">{months}</span>
                <span className="text-xs text-gray-600 dark:text-black">meses</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600 dark:text-black">
              Haz clic en los números para seleccionar la edad
            </div>
          </div>
        </div>
      )}

      {/* Línea de tiempo interactiva para el paso de peso (paso 5) */}
      {stepNumber === 5 && (
        <div className="mb-8 mt-4 space-y-8">
          {/* Línea de tiempo para PESO */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-black">Peso (kg)</h3>
            <div className="relative w-full h-20 bg-gray-100 rounded-full overflow-hidden">
              {/* Marcas de peso en el eje X */}
              <div className="absolute inset-0 flex items-center justify-between px-2 overflow-x-auto">
                {/* Mostrar solo algunos valores de peso para no saturar la interfaz */}
                {[0.5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="flex flex-col items-center z-10 relative px-1 bg-transparent border-none cursor-pointer min-w-[24px] sm:min-w-[28px]"
                    onClick={() => selectWeight(w)}
                  >
                    <div
                      className={`w-1 h-5 ${w <= weight ? "bg-primary dark:bg-red-600" : "bg-white"} mb-1 rounded-full transition-all`}
                    ></div>
                    <span
                      className={`text-xs sm:text-sm md:text-base font-medium ${
                        w <= weight ? "text-primary dark:text-red-600 font-bold" : "text-white drop-shadow-md"
                      } transition-all`}
                    >
                      {w}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Indicador de peso seleccionado */}
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-primary dark:text-black">{weight} kg</span>
            </div>
          </div>

          {/* Selector de peso más preciso */}
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-black">Ajuste fino de peso</h3>
            <div className="relative w-full h-20 bg-gray-100 rounded-full overflow-hidden">
              {/* Marcas de peso en el eje X */}
              <div className="absolute inset-0 flex items-center justify-between px-2 overflow-x-auto">
                {/* Mostrar valores cercanos al peso seleccionado */}
                {weightArray
                  .filter((w) => w >= Math.max(0.5, weight - 2.5) && w <= Math.min(50, weight + 2.5))
                  .map((w) => (
                    <button
                      key={w}
                      type="button"
                      className="flex flex-col items-center z-10 relative px-1 bg-transparent border-none cursor-pointer min-w-[24px] sm:min-w-[28px]"
                      onClick={() => selectWeight(w)}
                    >
                      <div
                        className={`w-1 h-5 ${
                          Math.abs(w - weight) < 0.1 ? "bg-amber-700 dark:bg-red-600" : "bg-white"
                        } mb-1 rounded-full transition-all`}
                      ></div>
                      <span
                        className={`text-xs sm:text-sm md:text-base font-medium ${
                          Math.abs(w - weight) < 0.1
                            ? "text-amber-700 dark:text-red-600 font-bold"
                            : "text-white drop-shadow-md"
                        } transition-all`}
                      >
                        {w}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Resumen de peso seleccionado */}
          <div className="text-center mt-4 p-6 bg-gradient-to-r from-primary/10 to-amber-50 rounded-lg border-2 border-primary dark:border-red-600 shadow-md">
            <h4 className="text-lg font-bold text-gray-700 dark:text-black mb-2">Peso seleccionado:</h4>
            <div className="flex justify-center items-center">
              <div className="flex flex-col items-center bg-primary/20 px-6 py-3 rounded-lg">
                <span className="text-3xl font-bold text-primary dark:text-red-600">{weight}</span>
                <span className="text-sm text-gray-600 dark:text-black">kilogramos</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600 dark:text-black">
              Haz clic en los números para seleccionar el peso
            </div>
          </div>
        </div>
      )}

      {/* Renderizar los hijos solo si no estamos en el paso de edad o peso */}
      {stepNumber !== 3 && stepNumber !== 5 ? <div className="mb-8">{children}</div> : null}

      {infoText && (
        <div className="relative mb-6">
          <div className="bg-teal-50 border-l-4 border-teal-500 dark:border-red-600 p-4 rounded-r-lg">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-teal-800 dark:text-black">{infoText}</p>
              </div>
            </div>
          </div>
          <div className="absolute -left-3 bottom-0 w-4 h-4 bg-teal-50 transform rotate-45"></div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        {showPrevButton && (
          <button
            onClick={goToPreviousStep}
            className="px-4 py-2 text-gray-600 dark:text-black hover:text-gray-800 transition-colors"
          >
            Atrás
          </button>
        )}

        <div className="flex-1"></div>

        {showNextButton && (
          <button
            onClick={goToNextStep}
            disabled={stepNumber === 3 ? !isAgeValid() : stepNumber === 5 ? !isWeightValid() : !isStepValid(stepNumber)}
            className={`px-6 py-3 rounded-full font-medium flex items-center ${
              (stepNumber === 3 ? isAgeValid() : stepNumber === 5 ? isWeightValid() : isStepValid(stepNumber))
                ? "bg-primary dark:bg-red-600 text-white hover:bg-primary/90 dark:hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Siguiente
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  )
}
