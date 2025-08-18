// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import CustomSlider from "../custom-slider"

// export default function PetAgeStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [years, setYears] = useState(formData.age?.years || 1)
//   const [months, setMonths] = useState(formData.age?.months || 1)
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambia la edad
//   useEffect(() => {
//     updateFormData({ age: { years, months } })
//   }, [years, months, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   return (
//     <FormStep 
//       stepNumber={4} 
//       title={`¿Cuántos años tiene ${petName}?`} 
//       highlightedWord={petName}
//       infoText="La edad es fundamental para determinar las necesidades nutricionales específicas de tu mascota."
//     >
//       <div className="w-full max-w-md mx-auto space-y-8">
//         {/* Slider para años */}
//         <div>
//           <CustomSlider
//             min={0}
//             max={20}
//             step={1}
//             value={years}
//             onChange={setYears}
//             label="Años"
//             unit="años"
//           />
//         </div>

//         {/* Slider para meses */}
//         <div>
//           <CustomSlider
//             min={0}
//             max={11}
//             step={1}
//             value={months}
//             onChange={setMonths}
//             label="Meses adicionales"
//             unit="meses"
//           />
//         </div>

//         {/* Resumen de edad */}
//         <div className="text-center p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
//           <h3 className="text-lg font-bold text-gray-800 mb-2">Edad de {petName}:</h3>
//           <div className="flex justify-center items-center space-x-4">
//             <div className="text-center">
//               <div className="text-3xl font-bold text-teal-600">{years}</div>
//               <div className="text-sm text-gray-600">años</div>
//             </div>
//             <div className="text-2xl text-gray-400">+</div>
//             <div className="text-center">
//               <div className="text-3xl font-bold text-blue-600">{months}</div>
//               <div className="text-sm text-gray-600">meses</div>
//             </div>
//           </div>
//         </div>

//         {/* Información sobre la etapa de vida */}
//         <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//           <h4 className="font-medium text-blue-800 mb-2">
//             {years < 1 ? "Cachorro" : years < 7 ? "Adulto" : "Senior"}
//           </h4>
//           <p className="text-sm text-blue-700">
//             {years < 1 && "Los cachorros necesitan más proteínas y calorías para su crecimiento y desarrollo."}
//             {years >= 1 && years < 7 && "Los perros adultos necesitan una dieta balanceada para mantener su salud y energía."}
//             {years >= 7 && "Los perros senior necesitan nutrición especializada para apoyar la salud articular y cognitiva."}
//           </p>
//         </div>
//       </div>
//     </FormStep>
//   )
// }
