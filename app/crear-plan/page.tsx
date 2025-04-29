"use client"

import { useEffect } from "react"
import { PlanFormProvider, usePlanForm } from "@/contexts/plan-form-context"
import ProgressIndicator from "@/components/plan-creator/progress-indicator"
import PetNameStep from "@/components/plan-creator/steps/pet-name-step"
import PetGenderStep from "@/components/plan-creator/steps/pet-gender-step"
import PetAgeStep from "@/components/plan-creator/steps/pet-age-step"
import BreedNeuteredStep from "@/components/plan-creator/steps/breed-neutered-step"
import WeightBodyStep from "@/components/plan-creator/steps/weight-body-step"
import ActivityLevelStep from "@/components/plan-creator/steps/activity-level-step"
import AllergiesStep from "@/components/plan-creator/steps/allergies-step"
import RecipesStep from "@/components/plan-creator/steps/recipes-step"
import PlanSelectionStep from "@/components/plan-creator/steps/plan-selection-step"
import { motion } from "framer-motion"
import ThemeSwitchingImage from "@/components/theme-switching-image"

// Componente para renderizar el paso actual
function CurrentStep() {
  const { currentStep } = usePlanForm()

  switch (currentStep) {
    case 1:
      return <PetNameStep />
    case 2:
      return <PetGenderStep />
    case 3:
      return <PetAgeStep />
    case 4:
      return <BreedNeuteredStep />
    case 5:
      return <WeightBodyStep />
    case 6:
      return <ActivityLevelStep />
    case 7:
      return <AllergiesStep />
    case 8:
      return <RecipesStep />
    case 9:
      return <PlanSelectionStep />
    default:
      return <PetNameStep />
  }
}

export default function CreatePlanPage() {
  // Efecto para hacer scroll al inicio cuando se carga la página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <PlanFormProvider>
      <div className="min-h-screen bg-orange-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Oferta */}
          <motion.div
            className="bg-orange-100 text-orange-800 text-center py-3 px-4 rounded-lg mb-8"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-sm md:text-base">
              <span className="line-through">50% OFF</span> antes / <span className="font-bold">55% OFF ahora</span>
              <span className="inline-block ml-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-orange-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Columna derecha - Formulario */}
            <div className="md:w-[70%]">
              <ProgressIndicator />

              <div className="mt-6">
                <CurrentStep />
              </div>
            </div>

            {/* Columna derecha - Imagen del perrito */}
            <div className="hidden md:flex md:w-[30%] items-center justify-center">
              <ThemeSwitchingImage
                lightImage="/cute-dog-with-bag.png"
                darkImage="/black-dog-with-bag.png"
                alt="Perrito con bolsa de Pet Gourmet"
                width={300}
                height={400}
                caption="¡Crea tu plan personalizado!"
              />
            </div>
          </div>
        </div>
      </div>
    </PlanFormProvider>
  )
}
