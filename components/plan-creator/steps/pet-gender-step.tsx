// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function PetGenderStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [gender, setGender] = useState(formData.gender)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambia el género
//   useEffect(() => {
//     updateFormData({ gender })
//   }, [gender, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   return (
//     <FormStep 
//       stepNumber={2} 
//       title={`¿${petName} es macho o hembra?`} 
//       highlightedWord={petName}
//       infoText="Esta información nos ayuda a personalizar mejor las recomendaciones nutricionales."
//     >
//       <div className="w-full max-w-md mx-auto">
//         <div className="grid grid-cols-2 gap-6">
//           <SelectionCard
//             selected={gender === "male"}
//             onClick={() => setGender("male")}
//             icon={
//               <div className="text-4xl mb-2">🐕</div>
//             }
//             label="Macho"
//           />
//           <SelectionCard
//             selected={gender === "female"}
//             onClick={() => setGender("female")}
//             icon={
//               <div className="text-4xl mb-2">🐩</div>
//             }
//             label="Hembra"
//           />
//         </div>

//         {gender && (
//           <div className="mt-8 p-4 bg-teal-50 border border-teal-200 rounded-lg">
//             <div className="flex items-center justify-center">
//               <div className="text-center">
//                 <div className="text-2xl mb-2">
//                   {gender === "male" ? "🐕" : "🐩"}
//                 </div>
//                 <p className="text-teal-800 font-medium">
//                   {petName} es {gender === "male" ? "un macho" : "una hembra"}
//                 </p>
//                 <p className="text-sm text-teal-600 mt-2">
//                   {gender === "male" 
//                     ? "Los machos suelen tener mayor masa muscular y pueden necesitar más proteínas."
//                     : "Las hembras pueden tener necesidades nutricionales específicas, especialmente durante el embarazo o lactancia."}
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </FormStep>
//   )
// }
