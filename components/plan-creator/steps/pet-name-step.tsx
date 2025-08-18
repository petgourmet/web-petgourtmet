// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"

// export default function PetNameStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [name, setName] = useState(formData.name || "")

//   // Actualizar el estado global cuando cambia el nombre
//   useEffect(() => {
//     updateFormData({ name })
//   }, [name, updateFormData])

//   return (
//     <FormStep 
//       stepNumber={1} 
//       title="¿Cómo se llama tu mascota?" 
//       highlightedWord="mascota"
//       infoText="Empecemos conociendo a tu compañero peludo. Su nombre nos ayudará a personalizar toda la experiencia."
//     >
//       <div className="w-full max-w-md mx-auto">
//         <div className="relative">
//           <input
//             type="text"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="Escribe el nombre de tu mascota"
//             className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors text-center"
//             maxLength={20}
//           />
//           <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//             <div className="text-2xl">🐾</div>
//           </div>
//         </div>
        
//         {name && (
//           <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg text-center">
//             <div className="text-2xl mb-2">👋</div>
//             <p className="text-teal-800 font-medium">
//               ¡Hola {name}! Es un placer conocerte.
//             </p>
//             <p className="text-sm text-teal-600 mt-2">
//               Vamos a crear el plan perfecto para ti.
//             </p>
//           </div>
//         )}

//         <div className="mt-6 text-center">
//           <p className="text-sm text-gray-500">
//             💡 Tip: Usa el nombre que más le gusta a tu mascota
//           </p>
//         </div>
//       </div>
//     </FormStep>
//   )
// }
