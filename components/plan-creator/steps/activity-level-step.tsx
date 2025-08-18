// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function ActivityLevelStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [activityLevel, setActivityLevel] = useState(formData.activityLevel)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambia el nivel de actividad
//   useEffect(() => {
//     updateFormData({ activityLevel })
//   }, [activityLevel, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   return (
//     <FormStep stepNumber={6} title={`¿Qué tan activ@ es ${petName}?`} highlightedWord="activ@">
//       <div className="w-full max-w-md mx-auto">
//         <div className="grid grid-cols-3 gap-3">
//           <SelectionCard
//             selected={activityLevel === "low"}
//             onClick={() => setActivityLevel("low")}
//             icon={<img src="/lounging-hound.png" alt="Poco activo" className="w-20 h-20 object-contain" />}
//             label="Poco activo"
//             labelClassName="text-xs"
//           />
//           <SelectionCard
//             selected={activityLevel === "medium"}
//             onClick={() => setActivityLevel("medium")}
//             icon={<img src="/walking-hound.png" alt="Moderadamente activo" className="w-20 h-20 object-contain" />}
//             label="Moderadamente activo"
//             labelClassName="text-xs"
//           />
//           <SelectionCard
//             selected={activityLevel === "high"}
//             onClick={() => setActivityLevel("high")}
//             icon={<img src="/running-hound.png" alt="Muy activo" className="w-20 h-20 object-contain" />}
//             label="Muy activo"
//             labelClassName="text-xs"
//           />
//         </div>

//         {/* Descripción del nivel seleccionado */}
//         {activityLevel && (
//           <div className="mt-6 p-4 bg-gray-50 rounded-lg">
//             <h4 className="font-medium text-gray-800 mb-2">
//               {activityLevel === "low" && "Poco activo"}
//               {activityLevel === "medium" && "Moderadamente activo"}
//               {activityLevel === "high" && "Muy activo"}
//             </h4>
//             <p className="text-sm text-gray-600">
//               {activityLevel === "low" &&
//                 "Tu mascota prefiere descansar y tiene actividad física limitada. Necesita una dieta balanceada pero con menos calorías."}
//               {activityLevel === "medium" &&
//                 "Tu mascota tiene un nivel de actividad normal con paseos regulares y algo de juego. Necesita una dieta equilibrada."}
//               {activityLevel === "high" &&
//                 "Tu mascota es muy activa, corre mucho y juega constantemente. Necesita una dieta rica en proteínas y calorías."}
//             </p>
//           </div>
//         )}
//       </div>
//     </FormStep>
//   )
// }
