// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { createContext, useContext, useState, type ReactNode } from "react"

// // Definir los tipos para nuestro estado
// export type PetGender = "male" | "female"
// export type PetSize = "small" | "medium" | "large"
// export type PetActivity = "low" | "medium" | "high"
// export type PetBody = "thin" | "normal" | "overweight"
// export type PlanType = "complete" | "complementary"
// export type PlanFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual"

// export type Allergy = "beef" | "chicken" | "pork" | "none"
// export type Recipe = "meat-festival" | "veggie-delight" | "chicken-feast"

// export interface PetFormData {
//   name: string
//   gender: PetGender | null
//   age: {
//     years: number
//     months: number
//   }
//   breed: string
//   isNeutered: boolean | null
//   weight: number
//   bodyType: PetBody | null
//   activityLevel: PetActivity | null
//   allergies: Allergy[]
//   recipes: Recipe[]
//   planType: PlanType | null
//   planFrequency: PlanFrequency | null
// }

// interface PlanFormContextType {
//   currentStep: number
//   setCurrentStep: (step: number) => void
//   formData: PetFormData
//   updateFormData: (data: Partial<PetFormData>) => void
//   resetForm: () => void
//   goToNextStep: () => void
//   goToPreviousStep: () => void
//   isStepValid: (step: number) => boolean
//   totalSteps: number
// }

// const initialFormData: PetFormData = {
//   name: "",
//   gender: null,
//   age: {
//     years: 0,
//     months: 0,
//   },
//   breed: "",
//   isNeutered: null,
//   weight: 0,
//   bodyType: null,
//   activityLevel: null,
//   allergies: [],
//   recipes: [],
//   planType: null,
//   planFrequency: null,
// }

// const PlanFormContext = createContext<PlanFormContextType | undefined>(undefined)

// export function PlanFormProvider({ children }: { children: ReactNode }) {
//   const [currentStep, setCurrentStep] = useState(1)
//   const [formData, setFormData] = useState<PetFormData>(initialFormData)
//   const totalSteps = 9

//   const updateFormData = (data: Partial<PetFormData>) => {
//     setFormData(prev => ({ ...prev, ...data }))
//   }

//   const resetForm = () => {
//     setFormData(initialFormData)
//     setCurrentStep(1)
//   }

//   const goToNextStep = () => {
//     if (currentStep < totalSteps) {
//       setCurrentStep(currentStep + 1)
//     }
//   }

//   const goToPreviousStep = () => {
//     if (currentStep > 1) {
//       setCurrentStep(currentStep - 1)
//     }
//   }

//   const isStepValid = (step: number): boolean => {
//     switch (step) {
//       case 1:
//         return formData.name.trim().length > 0
//       case 2:
//         return formData.gender !== null
//       case 3:
//         return formData.age.years > 0
//       case 4:
//         return formData.breed.trim().length > 0 && formData.isNeutered !== null
//       case 5:
//         return formData.weight > 0 && formData.bodyType !== null
//       case 6:
//         return formData.activityLevel !== null
//       case 7:
//         return true // Las alergias son opcionales
//       case 8:
//         return formData.recipes.length > 0
//       case 9:
//         return formData.planType !== null && formData.planFrequency !== null
//       default:
//         return false
//     }
//   }

//   const value: PlanFormContextType = {
//     currentStep,
//     setCurrentStep,
//     formData,
//     updateFormData,
//     resetForm,
//     goToNextStep,
//     goToPreviousStep,
//     isStepValid,
//     totalSteps,
//   }

//   return (
//     <PlanFormContext.Provider value={value}>
//       {children}
//     </PlanFormContext.Provider>
//   )
// }

// export function usePlanForm() {
//   const context = useContext(PlanFormContext)
//   if (context === undefined) {
//     throw new Error('usePlanForm must be used within a PlanFormProvider')
//   }
//   return context
// }
