// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { usePlanForm } from "@/contexts/plan-form-context"
// import { motion } from "framer-motion"
// import Image from "next/image"
// import { useState } from "react"

// export default function ProgressIndicator() {
//   const { currentStep, totalSteps } = usePlanForm()
//   const [shakeDog, setShakeDog] = useState(false)
//   const [shakeBowl, setShakeBowl] = useState(false)

//   // Calcular el progreso como porcentaje
//   const progress = (currentStep / totalSteps) * 100

//   // Variantes de animación para la sacudida
//   const shakeAnimation = {
//     shake: {
//       rotate: [0, -5, 0, 5, 0],
//       transition: { duration: 0.5 },
//     },
//     idle: {
//       rotate: 0,
//     },
//   }

//   const handleDogClick = () => {
//     setShakeDog(true)
//     setTimeout(() => setShakeDog(false), 500)
//   }

//   const handleBowlClick = () => {
//     setShakeBowl(true)
//     setTimeout(() => setShakeBowl(false), 500)
//   }

//   return (
//     <div className="w-full mb-8">
//       {/* Eliminamos el contenedor superior que tenía el plato */}

//       {/* Barra de progreso más alta para acomodar los elementos */}
//       <div className="h-16 bg-primary/10 rounded-full overflow-hidden relative">
//         <motion.div
//           className="h-full bg-primary rounded-full"
//           initial={{ width: 0 }}
//           animate={{ width: `${progress}%` }}
//           transition={{ duration: 0.5 }}
//         />

//         {/* Perrito corriendo que sigue el progreso */}
//         <motion.div
//           className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-pointer"
//           style={{ left: `${progress}%` }}
//           animate={shakeDog ? "shake" : "idle"}
//           variants={shakeAnimation}
//           onClick={handleDogClick}
//         >
//           <Image
//             src="/treat-ball.png"
//             alt="Perrito corriendo"
//             width={40}
//             height={40}
//             className="object-contain"
//           />
//         </motion.div>

//         {/* Plato de comida al final */}
//         <motion.div
//           className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
//           animate={shakeBowl ? "shake" : "idle"}
//           variants={shakeAnimation}
//           onClick={handleBowlClick}
//         >
//           <Image
//             src="/pet-bowl-full.png"
//             alt="Plato de comida"
//             width={32}
//             height={32}
//             className="object-contain"
//           />
//         </motion.div>
//       </div>

//       {/* Información del progreso */}
//       <div className="flex justify-between items-center mt-4">
//         <span className="text-sm text-gray-600 dark:text-black">
//           Paso {currentStep} de {totalSteps}
//         </span>
//         <span className="text-sm font-medium text-primary dark:text-red-600">
//           {Math.round(progress)}% completado
//         </span>
//       </div>

//       {/* Indicadores de pasos */}
//       <div className="flex justify-between mt-2">
//         {Array.from({ length: totalSteps }, (_, index) => {
//           const stepNumber = index + 1
//           const isCompleted = stepNumber < currentStep
//           const isCurrent = stepNumber === currentStep

//           return (
//             <div
//               key={stepNumber}
//               className={`w-3 h-3 rounded-full transition-colors ${
//                 isCompleted
//                   ? "bg-primary dark:bg-red-600"
//                   : isCurrent
//                     ? "bg-primary/70 dark:bg-red-500 ring-2 ring-primary/30 dark:ring-red-300"
//                     : "bg-gray-300"
//               }`}
//             />
//           )
//         })}
//       </div>
//     </div>
//   )
// }
