"use client"

import { useEffect, useState } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import SelectionCard from "../selection-card"

export default function ActivityLevelStep() {
  const { formData, updateFormData } = usePlanForm()
  const [activityLevel, setActivityLevel] = useState(formData.activityLevel)
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambia el nivel de actividad
  useEffect(() => {
    updateFormData({ activityLevel })
  }, [activityLevel, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  return (
    <FormStep stepNumber={6} title={`¿Qué tan activ@ es ${petName}?`} highlightedWord="activ@">
      <div className="w-full max-w-md mx-auto">
        <div className="grid grid-cols-3 gap-3">
          <SelectionCard
            selected={activityLevel === "low"}
            onClick={() => setActivityLevel("low")}
            icon={<img src="/lounging-hound.png" alt="Poco activo" className="w-20 h-20 object-contain" />}
            label="Poco activ@"
          />
          <SelectionCard
            selected={activityLevel === "medium"}
            onClick={() => setActivityLevel("medium")}
            icon={<img src="/golden-retriever-park.png" alt="Activo" className="w-20 h-20 object-contain" />}
            label="Activ@"
          />
          <SelectionCard
            selected={activityLevel === "high"}
            onClick={() => setActivityLevel("high")}
            icon={
              <img
                src="/placeholder.svg?height=80&width=80&query=running dog"
                alt="Muy activo"
                className="w-20 h-20 object-contain"
              />
            }
            label="Muy activ@"
          />
        </div>

        {activityLevel === "high" && (
          <div className="mt-6 p-3 bg-teal-50 border border-teal-100 rounded-lg">
            <div className="flex items-center justify-center">
              <span className="text-sm text-teal-800">Paseos diarios</span>
            </div>
            <div className="flex items-center justify-center mt-1">
              <span className="text-sm font-medium text-teal-800">60 mins o más</span>
            </div>
          </div>
        )}

        {activityLevel && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            <p>
              Los perros activos requieren una mayor ingesta calórica para mantener su energía, mientras que los perros
              menos activos o sedentarios requieren menos calorías para así evitar el aumento de peso. De esta forma
              ayudamos a prevenir problemas de sobrepeso o desnutrición.
            </p>
          </div>
        )}
      </div>
    </FormStep>
  )
}
