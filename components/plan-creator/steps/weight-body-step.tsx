"use client"

import { useEffect, useState } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import CustomSlider from "../custom-slider"
import SelectionCard from "../selection-card"

export default function WeightBodyStep() {
  const { formData, updateFormData } = usePlanForm()
  const [weight, setWeight] = useState(formData.weight || 7)
  const [bodyType, setBodyType] = useState(formData.bodyType)
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambia el peso o tipo de cuerpo
  useEffect(() => {
    updateFormData({ weight, bodyType })
  }, [weight, bodyType, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  return (
    <FormStep stepNumber={5} title={`¿Cómo es la contextura de ${petName}?`} highlightedWord="contextura">
      <div className="w-full max-w-md mx-auto">
        {/* Slider de peso */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="text-lg font-medium text-gray-700">{weight} kg</label>
          </div>
          <CustomSlider min={0.5} max={50} step={0.5} value={weight} onChange={setWeight} showMarks markCount={5} />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0kg</span>
            <span>50kg</span>
          </div>
        </div>

        {/* Opciones de contextura */}
        <div className="mt-8">
          <p className="text-center text-gray-600 mb-4">Selecciona la contextura de {petName}</p>
          <div className="grid grid-cols-3 gap-3">
            <SelectionCard
              selected={bodyType === "thin"}
              onClick={() => setBodyType("thin")}
              icon={<img src="/slender-hound-profile.png" alt="Delgado" className="w-16 h-16 object-contain" />}
              label="Delgad@"
            />
            <SelectionCard
              selected={bodyType === "normal"}
              onClick={() => setBodyType("normal")}
              icon={<img src="/standing-dog-silhouette.png" alt="En Forma" className="w-16 h-16 object-contain" />}
              label="En Forma"
            />
            <SelectionCard
              selected={bodyType === "overweight"}
              onClick={() => setBodyType("overweight")}
              icon={<img src="/chunky-canine-profile.png" alt="Gordit@" className="w-16 h-16 object-contain" />}
              label="Gordit@"
            />
          </div>
        </div>

        {/* Información contextual */}
        {bodyType === "thin" && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800">
            <p>
              Si {petName} es delgado, podrás notar que tiene una cintura bastante marcada y verás con facilidad sus
              costillas.
            </p>
          </div>
        )}

        {bodyType === "overweight" && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800">
            <p>
              Un perro con sobrepeso puede tener problemas de salud. Nuestro plan ayudará a {petName} a alcanzar un peso
              saludable.
            </p>
          </div>
        )}
      </div>
    </FormStep>
  )
}
