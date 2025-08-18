// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function AllergiesStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [allergies, setAllergies] = useState<string[]>(formData.allergies || [])
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambian las alergias
//   useEffect(() => {
//     updateFormData({ allergies })
//   }, [allergies, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   const toggleAllergy = (allergy: string) => {
//     setAllergies(prev => 
//       prev.includes(allergy) 
//         ? prev.filter(a => a !== allergy)
//         : [...prev, allergy]
//     )
//   }

//   const allergyOptions = [
//     { id: "chicken", label: "Pollo", icon: "🐔" },
//     { id: "beef", label: "Carne de res", icon: "🥩" },
//     { id: "fish", label: "Pescado", icon: "🐟" },
//     { id: "dairy", label: "Lácteos", icon: "🥛" },
//     { id: "grains", label: "Granos", icon: "🌾" },
//     { id: "eggs", label: "Huevos", icon: "🥚" }
//   ]

//   return (
//     <FormStep 
//       stepNumber={7} 
//       title={`¿${petName} tiene alguna alergia alimentaria?`} 
//       highlightedWord="alergia"
//       infoText="Selecciona todos los alimentos que causan reacciones alérgicas en tu mascota. Si no tiene alergias conocidas, puedes continuar sin seleccionar nada."
//     >
//       <div className="w-full max-w-2xl mx-auto">
//         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//           {allergyOptions.map((option) => (
//             <SelectionCard
//               key={option.id}
//               selected={allergies.includes(option.id)}
//               onClick={() => toggleAllergy(option.id)}
//               icon={
//                 <div className="text-4xl mb-2">
//                   {option.icon}
//                 </div>
//               }
//               label={option.label}
//             />
//           ))}
//         </div>

//         {allergies.length > 0 && (
//           <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <h4 className="font-medium text-yellow-800 mb-2">Alergias seleccionadas:</h4>
//             <div className="flex flex-wrap gap-2">
//               {allergies.map((allergy) => {
//                 const option = allergyOptions.find(opt => opt.id === allergy)
//                 return (
//                   <span key={allergy} className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
//                     {option?.icon} {option?.label}
//                   </span>
//                 )
//               })}
//             </div>
//             <p className="text-sm text-yellow-700 mt-2">
//               Crearemos un plan alimentario que evite estos ingredientes para mantener a {petName} saludable.
//             </p>
//           </div>
//         )}

//         <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//           <p className="text-sm text-blue-700">
//             💡 <strong>Consejo:</strong> Si no estás seguro de las alergias de tu mascota, consulta con tu veterinario. 
//             Las alergias alimentarias pueden desarrollarse con el tiempo.
//           </p>
//         </div>
//       </div>
//     </FormStep>
//   )
// }
