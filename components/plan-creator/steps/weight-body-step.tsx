// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import CustomSlider from "../custom-slider"
// import SelectionCard from "../selection-card"

// export default function WeightBodyStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [weight, setWeight] = useState(formData.weight || 5)
//   const [bodyCondition, setBodyCondition] = useState(formData.bodyCondition)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambian el peso o condición corporal
//   useEffect(() => {
//     updateFormData({ weight, bodyCondition })
//   }, [weight, bodyCondition, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   const bodyConditions = [
//     {
//       id: "underweight",
//       label: "Bajo peso",
//       description: "Se pueden ver las costillas fácilmente",
//       icon: "😟"
//     },
//     {
//       id: "ideal",
//       label: "Peso ideal",
//       description: "Se pueden sentir las costillas con presión ligera",
//       icon: "😊"
//     },
//     {
//       id: "overweight",
//       label: "Sobrepeso",
//       description: "Es difícil sentir las costillas",
//       icon: "😕"
//     }
//   ]

//   const getWeightCategory = (weight: number) => {
//     if (weight < 5) return "Muy pequeño"
//     if (weight < 15) return "Pequeño"
//     if (weight < 30) return "Mediano"
//     return "Grande"
//   }

//   const getCalorieEstimate = (weight: number, bodyCondition: string) => {
//     let baseCalories = weight * 30 + 70
//     
//     if (bodyCondition === "underweight") {
//       baseCalories *= 1.2
//     } else if (bodyCondition === "overweight") {
//       baseCalories *= 0.8
//     }
    
//     return Math.round(baseCalories)
//   }

//   return (
//     <FormStep 
//       stepNumber={5} 
//       title={`¿Cuánto pesa ${petName}?`} 
//       highlightedWord={petName}
//       infoText="El peso y la condición corporal son fundamentales para calcular las porciones adecuadas."
//     >
//       <div className="w-full max-w-2xl mx-auto space-y-8">
//         {/* Slider para peso */}
//         <div>
//           <CustomSlider
//             min={0.5}
//             max={50}
//             step={0.5}
//             value={weight}
//             onChange={setWeight}
//             label="Peso actual"
//             unit="kg"
//           />
//         </div>

//         {/* Información sobre el peso */}
//         <div className="text-center p-4 bg-teal-50 border border-teal-200 rounded-lg">
//           <h3 className="text-lg font-bold text-teal-800 mb-2">
//             {petName} pesa {weight} kg
//           </h3>
//           <p className="text-teal-600">
//             Categoría: <span className="font-medium">{getWeightCategory(weight)}</span>
//           </p>
//         </div>

//         {/* Selección de condición corporal */}
//         <div>
//           <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">
//             ¿Cómo describirías la condición corporal de {petName}?
//           </h3>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             {bodyConditions.map((condition) => (
//               <SelectionCard
//                 key={condition.id}
//                 selected={bodyCondition === condition.id}
//                 onClick={() => setBodyCondition(condition.id)}
//                 icon={
//                   <div className="text-3xl mb-2">{condition.icon}</div>
//                 }
//                 label={
//                   <div className="text-center">
//                     <div className="font-medium">{condition.label}</div>
//                     <div className="text-xs text-gray-500 mt-1">{condition.description}</div>
//                   </div>
//                 }
//               />
//             ))}
//           </div>
//         </div>

//         {/* Estimación de calorías */}
//         {bodyCondition && (
//           <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
//             <h3 className="text-lg font-bold text-blue-800 mb-3 text-center">
//               Estimación nutricional para {petName}
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="text-center p-4 bg-white rounded-lg">
//                 <div className="text-2xl font-bold text-blue-600">
//                   {getCalorieEstimate(weight, bodyCondition)}
//                 </div>
//                 <div className="text-sm text-blue-700">Calorías diarias estimadas</div>
//               </div>
//               <div className="text-center p-4 bg-white rounded-lg">
//                 <div className="text-2xl font-bold text-green-600">
//                   {getWeightCategory(weight)}
//                 </div>
//                 <div className="text-sm text-green-700">Tamaño de raza</div>
//               </div>
//             </div>
//             <p className="text-sm text-blue-700 mt-4 text-center">
//               {bodyCondition === "ideal" && "¡Perfecto! Mantendremos este peso saludable."}
//               {bodyCondition === "underweight" && "Ajustaremos las porciones para ayudar a ganar peso de forma saludable."}
//               {bodyCondition === "overweight" && "Crearemos un plan para alcanzar un peso más saludable gradualmente."}
//             </p>
//           </div>
//         )}

//         {/* Consejos */}
//         <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//           <h4 className="font-medium text-yellow-800 mb-2">💡 Consejos para evaluar la condición corporal:</h4>
//           <ul className="text-sm text-yellow-700 space-y-1">
//             <li>• Pasa tus manos por los costados de tu mascota</li>
//             <li>• En peso ideal, deberías poder sentir las costillas con presión ligera</li>
//             <li>• Observa desde arriba: debería tener una cintura visible</li>
//             <li>• Si tienes dudas, consulta con tu veterinario</li>
//           </ul>
//         </div>
//       </div>
//     </FormStep>
//   )
// }
