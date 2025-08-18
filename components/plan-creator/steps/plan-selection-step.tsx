"use client"

import { useEffect, useState } from "react"
import { usePlanForm, type PlanType, type PlanFrequency } from "@/contexts/plan-form-context"
import FormStep from "../form-step"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart-context"

// Función para calcular calorías requeridas basadas en el peso, edad y nivel de actividad
const calculateRequiredCalories = (weight: number, ageYears: number, activityLevel: string): number => {
  const baseCal = weight * 30 + 70

  // Factor de actividad
  const activityFactor = activityLevel === "high" ? 1.5 : activityLevel === "medium" ? 1.2 : 1.0

  // Factor de edad
  const ageFactor = ageYears < 1 ? 1.8 : ageYears > 7 ? 0.8 : 1.0

  return Math.round(baseCal * activityFactor * ageFactor)
}

export default function PlanSelectionStep() {
  const { formData, updateFormData } = usePlanForm()
  const [planType, setPlanType] = useState<PlanType | null>(formData.planType)
  const [planFrequency, setPlanFrequency] = useState<PlanFrequency | null>(formData.planFrequency)
  const [petName, setPetName] = useState(formData.name)
  const router = useRouter()
  const { addToCart } = useCart()

  // Calcular calorías requeridas
  const requiredCalories = calculateRequiredCalories(
    formData.weight || 10,
    formData.age?.years || 1,
    formData.activityLevel || "medium",
  )

  // Actualizar el estado global cuando cambia el tipo de plan o frecuencia
  useEffect(() => {
    updateFormData({ planType, planFrequency })
  }, [planType, planFrequency, updateFormData])

  // Actualizar el nombre local cuando cambia en el contexto
  useEffect(() => {
    setPetName(formData.name)
  }, [formData.name])

  // Función para manejar la selección final del plan
  const handlePlanSelection = () => {
    // Crear un objeto con los detalles del plan seleccionado
    const selectedPlan = {
      id: `plan-${planType}-${planFrequency}`,
      name: `Plan ${planType === "complete" ? "Completo" : "Complementario"} ${planFrequency === "biweekly" ? "Quincenal" : "Mensual"}`,
      price:
        planType === "complete" ? (planFrequency === "biweekly" ? 526 : 921) : planFrequency === "biweekly" ? 348 : 549,
      image: "/pet-bowl-full.png",
      quantity: 1,
      petName: petName,
      planDetails: {
        type: planType,
        frequency: planFrequency,
        recipes: formData.recipes,
        calories: requiredCalories,
        weight: formData.weight,
        petInfo: {
          name: petName,
          breed: formData.breed,
          age: formData.age,
          activityLevel: formData.activityLevel,
          allergies: formData.allergies,
        },
      },
    }

    // Añadir el plan al carrito
    addToCart(selectedPlan)

    // Redirigir al usuario a la página de carrito o confirmación
    router.push("/")
  }

  return (
    <FormStep stepNumber={9} title={`Elige el plan para ${petName}`} highlightedWord={petName} showNextButton={false}>
      <div className="w-full max-w-md mx-auto">
        <p className="text-center text-gray-600 dark:text-black mb-4">
          Calorías requeridas: <span className="font-bold">{requiredCalories} calorías / día</span>
        </p>

        <div className="border-b border-gray-200 my-6"></div>

        {/* Plan Completo */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mr-3">
              <span className="text-orange-500 dark:text-red-600 font-bold">100%</span>
            </div>
            <div>
              <h3 className="text-lg font-bold dark:text-black">1. Plan completo</h3>
              <p className="text-sm text-gray-600 dark:text-black">(100% comida Pet's Table) - 550grs / día</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                planType === "complete" && planFrequency === "biweekly"
                  ? "border-orange-500 dark:border-red-600 bg-orange-50"
                  : "border-gray-200 hover:border-orange-300 dark:hover:border-red-400"
              }`}
              onClick={() => {
                setPlanType("complete")
                setPlanFrequency("biweekly")
              }}
            >
              <h4 className="font-medium text-gray-700 dark:text-black">Quincenal</h4>
              <p className="text-orange-500 dark:text-red-600 font-bold">$526mxn/quincenal</p>
              <p className="text-xl text-orange-500 dark:text-red-600 font-bold">$36mxn/día</p>
              <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>cada 15 días</span>
              </div>
              <div className="mt-3 flex justify-end">
                <div
                  className={`w-6 h-6 rounded-full border ${
                    planType === "complete" && planFrequency === "biweekly"
                      ? "border-orange-500 dark:border-red-600 bg-orange-500 dark:bg-red-600"
                      : "border-gray-300"
                  } flex items-center justify-center`}
                >
                  {planType === "complete" && planFrequency === "biweekly" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                planType === "complete" && planFrequency === "monthly"
                  ? "border-orange-500 dark:border-red-600 bg-orange-50"
                  : "border-gray-200 hover:border-orange-300 dark:hover:border-red-400"
              }`}
              onClick={() => {
                setPlanType("complete")
                setPlanFrequency("monthly")
              }}
            >
              <div className="bg-orange-500 dark:bg-red-600 text-white text-xs px-2 py-1 rounded-full inline-block mb-1">
                Mejor precio
              </div>
              <h4 className="font-medium text-gray-700 dark:text-black">Mensual</h4>
              <p className="text-orange-500 dark:text-red-600 font-bold">$921mxn/mensual</p>
              <p className="text-xl text-orange-500 dark:text-red-600 font-bold">$31mxn/día</p>
              <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>cada 30 días</span>
              </div>
              <div className="mt-3 flex justify-end">
                <div
                  className={`w-6 h-6 rounded-full border ${
                    planType === "complete" && planFrequency === "monthly"
                      ? "border-orange-500 dark:border-red-600 bg-orange-500 dark:bg-red-600"
                      : "border-gray-300"
                  } flex items-center justify-center`}
                >
                  {planType === "complete" && planFrequency === "monthly" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Complementario */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mr-3">
              <span className="text-orange-500 dark:text-red-600 font-bold">50%</span>
            </div>
            <div>
              <h3 className="text-lg font-bold dark:text-black">2. Plan complementario</h3>
              <p className="text-sm text-gray-600 dark:text-black">
                (50% comida Pet's Table - 50% su comida regular) - 300grs / día
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                planType === "complementary" && planFrequency === "biweekly"
                  ? "border-orange-500 dark:border-red-600 bg-orange-50"
                  : "border-gray-200 hover:border-orange-300 dark:hover:border-red-400"
              }`}
              onClick={() => {
                setPlanType("complementary")
                setPlanFrequency("biweekly")
              }}
            >
              <h4 className="font-medium text-gray-700 dark:text-black">Quincenal</h4>
              <p className="text-orange-500 dark:text-red-600 font-bold">$348mxn/quincenal</p>
              <p className="text-xl text-orange-500 dark:text-red-600 font-bold">$24mxn/día</p>
              <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>cada 15 días</span>
              </div>
              <div className="mt-3 flex justify-end">
                <div
                  className={`w-6 h-6 rounded-full border ${
                    planType === "complementary" && planFrequency === "biweekly"
                      ? "border-orange-500 dark:border-red-600 bg-orange-500 dark:bg-red-600"
                      : "border-gray-300"
                  } flex items-center justify-center`}
                >
                  {planType === "complementary" && planFrequency === "biweekly" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                planType === "complementary" && planFrequency === "monthly"
                  ? "border-orange-500 dark:border-red-600 bg-orange-50"
                  : "border-gray-200 hover:border-orange-300 dark:hover:border-red-400"
              }`}
              onClick={() => {
                setPlanType("complementary")
                setPlanFrequency("monthly")
              }}
            >
              <h4 className="font-medium text-gray-700 dark:text-black">Mensual</h4>
              <p className="text-orange-500 dark:text-red-600 font-bold">$549mxn/mensual</p>
              <p className="text-xl text-orange-500 dark:text-red-600 font-bold">$19mxn/día</p>
              <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>cada 30 días</span>
              </div>
              <div className="mt-3 flex justify-end">
                <div
                  className={`w-6 h-6 rounded-full border ${
                    planType === "complementary" && planFrequency === "monthly"
                      ? "border-orange-500 dark:border-red-600 bg-orange-500 dark:bg-red-600"
                      : "border-gray-300"
                  } flex items-center justify-center`}
                >
                  {planType === "complementary" && planFrequency === "monthly" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-center mb-4 dark:text-black">Preguntas frecuentes</h3>
          <div className="border-t border-gray-200 pt-4">
            <details className="mb-4">
              <summary className="font-medium text-gray-700 dark:text-black cursor-pointer">
                ¿Cómo se entrega el alimento?
              </summary>
              <p className="mt-2 text-gray-600 dark:text-black pl-4">
                El alimento se entrega en paquetes sellados al vacío, listos para servir o almacenar en el refrigerador.
              </p>
            </details>
            <details className="mb-4">
              <summary className="font-medium text-gray-700 dark:text-black cursor-pointer">
                ¿Puedo cambiar mi plan después?
              </summary>
              <p className="mt-2 text-gray-600 dark:text-black pl-4">
                Sí, puedes modificar tu plan en cualquier momento contactando a nuestro servicio al cliente.
              </p>
            </details>
            <details className="mb-4">
              <summary className="font-medium text-gray-700 dark:text-black cursor-pointer">
                ¿Cómo se calcula la cantidad de alimento?
              </summary>
              <p className="mt-2 text-gray-600 dark:text-black pl-4">
                La cantidad se calcula según el peso, edad y nivel de actividad de tu mascota para asegurar una
                nutrición óptima.
              </p>
            </details>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handlePlanSelection}
            disabled={!planType || !planFrequency}
            className={`w-full py-4 rounded-lg text-white font-medium flex items-center justify-center ${
              planType && planFrequency
                ? "bg-orange-500 dark:bg-red-600 hover:bg-orange-600 dark:hover:bg-red-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Agregar al carrito
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </FormStep>
  )
}

// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function PlanSelectionStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [selectedPlan, setSelectedPlan] = useState(formData.selectedPlan)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambia el plan seleccionado
//   useEffect(() => {
//     updateFormData({ selectedPlan })
//   }, [selectedPlan, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   const plans = [
//     {
//       id: "basic",
//       name: "Plan Básico",
//       price: "$29.99",
//       description: "Alimentación balanceada para el día a día",
//       features: ["Comida premium", "Entrega mensual", "Soporte básico"],
//       icon: "🥘"
//     },
//     {
//       id: "premium",
//       name: "Plan Premium",
//       price: "$49.99",
//       description: "Nutrición personalizada con ingredientes gourmet",
//       features: ["Comida gourmet", "Entrega quincenal", "Soporte prioritario", "Snacks incluidos"],
//       icon: "⭐",
//       popular: true
//     },
//     {
//       id: "deluxe",
//       name: "Plan Deluxe",
//       price: "$79.99",
//       description: "La experiencia completa para mascotas exigentes",
//       features: ["Comida ultra-premium", "Entrega semanal", "Soporte 24/7", "Snacks y juguetes", "Consulta veterinaria"],
//       icon: "💎"
//     }
//   ]

//   return (
//     <FormStep 
//       stepNumber={9} 
//       title={`Elige el plan perfecto para ${petName}`} 
//       highlightedWord={petName}
//       infoText="Selecciona el plan que mejor se adapte a las necesidades de tu mascota. Puedes cambiar o cancelar en cualquier momento."
//       showNextButton={false}
//     >
//       <div className="w-full max-w-4xl mx-auto">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           {plans.map((plan) => (
//             <div key={plan.id} className="relative">
//               {plan.popular && (
//                 <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
//                   <span className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium">
//                     Más Popular
//                   </span>
//                 </div>
//               )}
//               <SelectionCard
//                 selected={selectedPlan === plan.id}
//                 onClick={() => setSelectedPlan(plan.id)}
//                 icon={
//                   <div className="text-4xl mb-4">{plan.icon}</div>
//                 }
//                 label={
//                   <div className="text-center space-y-3">
//                     <div>
//                       <h3 className="text-lg font-bold">{plan.name}</h3>
//                       <p className="text-2xl font-bold text-teal-600 mt-1">{plan.price}</p>
//                       <p className="text-sm text-gray-600 mt-1">por mes</p>
//                     </div>
//                     <p className="text-sm text-gray-700">{plan.description}</p>
//                     <ul className="text-xs text-left space-y-1">
//                       {plan.features.map((feature, index) => (
//                         <li key={index} className="flex items-center">
//                           <span className="text-green-500 mr-2">✓</span>
//                           {feature}
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 }
//               />
//             </div>
//           ))}
//         </div>

//         {selectedPlan && (
//           <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
//             <div className="text-3xl mb-3">🎉</div>
//             <h3 className="text-lg font-bold text-green-800 mb-2">
//               ¡Excelente elección para {petName}!
//             </h3>
//             <p className="text-green-700 mb-4">
//               Has seleccionado el {plans.find(p => p.id === selectedPlan)?.name}. 
//               Tu mascota recibirá la mejor nutrición personalizada.
//             </p>
//             <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
//               Crear Plan para {petName}
//             </button>
//           </div>
//         )}
//       </div>
//     </FormStep>
//   )
// }
