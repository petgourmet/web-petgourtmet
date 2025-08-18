// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function BreedNeuteredStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [breed, setBreed] = useState(formData.breed || "")
//   const [isNeutered, setIsNeutered] = useState(formData.isNeutered)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambian los datos
//   useEffect(() => {
//     updateFormData({ breed, isNeutered })
//   }, [breed, isNeutered, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   const breedOptions = [
//     { id: "small", label: "Raza pequeña", description: "Hasta 10kg", icon: "🐕" },
//     { id: "medium", label: "Raza mediana", description: "10-25kg", icon: "🐶" },
//     { id: "large", label: "Raza grande", description: "25kg o más", icon: "🐕‍🦺" },
//     { id: "mixed", label: "Raza mixta", description: "Mestizo", icon: "🐾" }
//   ]

//   return (
//     <FormStep 
//       stepNumber={3} 
//       title={`Cuéntanos sobre ${petName}`} 
//       highlightedWord={petName}
//       infoText="Esta información nos ayuda a personalizar mejor el plan nutricional."
//     >
//       <div className="w-full max-w-2xl mx-auto space-y-8">
//         {/* Selección de raza */}
//         <div>
//           <h3 className="text-lg font-medium text-gray-800 mb-4">¿Qué tipo de raza es {petName}?</h3>
//           <div className="grid grid-cols-2 gap-4">
//             {breedOptions.map((option) => (
//               <SelectionCard
//                 key={option.id}
//                 selected={breed === option.id}
//                 onClick={() => setBreed(option.id)}
//                 icon={
//                   <div className="text-3xl mb-2">
//                     {option.icon}
//                   </div>
//                 }
//                 label={
//                   <div className="text-center">
//                     <div className="font-medium">{option.label}</div>
//                     <div className="text-xs text-gray-500 mt-1">{option.description}</div>
//                   </div>
//                 }
//               />
//             ))}
//           </div>
//         </div>

//         {/* Selección de esterilización */}
//         <div>
//           <h3 className="text-lg font-medium text-gray-800 mb-4">¿{petName} está esterilizado/castrado?</h3>
//           <div className="grid grid-cols-2 gap-4">
//             <SelectionCard
//               selected={isNeutered === true}
//               onClick={() => setIsNeutered(true)}
//               icon={
//                 <div className="text-3xl mb-2">✅</div>
//               }
//               label="Sí, está esterilizado"
//             />
//             <SelectionCard
//               selected={isNeutered === false}
//               onClick={() => setIsNeutered(false)}
//               icon={
//                 <div className="text-3xl mb-2">❌</div>
//               }
//               label="No está esterilizado"
//             />
//           </div>
//         </div>

//         {/* Información adicional */}
//         {breed && (
//           <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//             <h4 className="font-medium text-blue-800 mb-2">Información sobre la raza seleccionada:</h4>
//             <p className="text-sm text-blue-700">
//               {breed === "small" && "Las razas pequeñas tienen un metabolismo más rápido y necesitan más calorías por kilogramo de peso."}
//               {breed === "medium" && "Las razas medianas tienen necesidades nutricionales equilibradas y son ideales para dietas estándar."}
//               {breed === "large" && "Las razas grandes necesitan nutrición específica para el cuidado de articulaciones y control de peso."}
//               {breed === "mixed" && "Los perros mestizos pueden tener características de diferentes razas, por lo que adaptaremos el plan según su tamaño y actividad."}
//             </p>
//           </div>
//         )}

//         {isNeutered !== undefined && (
//           <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//             <h4 className="font-medium text-green-800 mb-2">
//               {isNeutered ? "Mascota esterilizada" : "Mascota no esterilizada"}
//             </h4>
//             <p className="text-sm text-green-700">
//               {isNeutered 
//                 ? "Las mascotas esterilizadas tienden a tener un metabolismo más lento, por lo que ajustaremos las porciones para mantener un peso saludable."
//                 : "Las mascotas no esterilizadas suelen tener un metabolismo más activo y pueden necesitar más calorías."}
//             </p>
//           </div>
//         )}
//       </div>
//     </FormStep>
//   )
// }
