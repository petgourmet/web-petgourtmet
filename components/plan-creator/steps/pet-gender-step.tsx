"use client"

import { useEffect, useState } from "react"
import { usePlanForm } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import SelectionCard from "../selection-card"

export default function PetGenderStep() {
  const { formData, updateFormData } = usePlanForm()
  const [gender, setGender] = useState(formData.gender)
  const [petName, setPetName] = useState(formData.name)

  // Actualizar el estado global cuando cambia el género
  useEffect(() => {
    updateFormData({ gender })
  }, [gender, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  return (
    <FormStep stepNumber={2} title={`¿${petName} es macho o hembra?`} highlightedWord={petName}>
      <div className="w-full">
        <div className="mb-4">
          <div className="p-4 bg-teal-50 border border-teal-100 rounded-lg mb-6">
            <div className="flex items-center">
              <span className="font-medium dark:text-black">Nombre:</span>
              <span className="ml-2 dark:text-black">{petName}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-auto text-teal-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectionCard
            selected={gender === "male"}
            onClick={() => setGender("male")}
            icon={
              <div className="w-16 h-16 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10 text-teal-500"
                >
                  <circle cx="12" cy="7" r="4" />
                  <path d="M12 11v8" />
                  <path d="M9 18h6" />
                </svg>
              </div>
            }
            label="Macho"
            labelClassName="dark:text-black"
          />

          <SelectionCard
            selected={gender === "female"}
            onClick={() => setGender("female")}
            icon={
              <div className="w-16 h-16 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10 text-teal-500"
                >
                  <circle cx="12" cy="7" r="4" />
                  <path d="M12 11v8" />
                  <path d="M8 16h8" />
                </svg>
              </div>
            }
            label="Hembra"
            labelClassName="dark:text-black"
          />
        </div>
      </div>
    </FormStep>
  )
}
