// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import type React from "react"

// import { useState, useEffect } from "react"
// import { motion } from "framer-motion"

// interface CustomSliderProps {
//   min: number
//   max: number
//   step?: number
//   value: number
//   onChange: (value: number) => void
//   label: string
//   unit?: string
//   marks?: boolean
// }

// export default function CustomSlider({
//   min,
//   max,
//   step = 1,
//   value,
//   onChange,
//   label,
//   unit = "",
//   marks = true,
// }: CustomSliderProps) {
//   const [localValue, setLocalValue] = useState(value)
//   const [isDragging, setIsDragging] = useState(false)
//   const [sliderRef, setSliderRef] = useState<HTMLDivElement | null>(null)

//   // Sincronizar el valor local con el valor de prop
//   useEffect(() => {
//     // Solo actualizar si hay una diferencia significativa para evitar ciclos
//     if (Math.abs(localValue - value) > 0.01) {
//       setLocalValue(value)
//     }
//   }, [value])

//   // Calcular el porcentaje para el estilo del slider
//   const percentage = ((localValue - min) / (max - min)) * 100

//   // Manejar el cambio de valor
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newValue = Number.parseFloat(e.target.value)
//     setLocalValue(newValue)
//     // Solo llamar a onChange cuando sea necesario
//     if (newValue !== value) {
//       onChange(newValue)
//     }
//   }

//   const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
//     setIsDragging(true)
//     document.addEventListener("mousemove", handleMouseMove)
//     document.addEventListener("mouseup", handleMouseUp)
//     // Prevenir selección de texto durante el arrastre
//     e.preventDefault()
//   }

//   const handleMouseMove = (e: MouseEvent) => {
//     if (!isDragging || !sliderRef) return

//     // Obtener las dimensiones y posición del slider
//     const rect = sliderRef.getBoundingClientRect()
//     const sliderWidth = rect.width
//     const offsetX = e.clientX - rect.left

//     // Calcular el nuevo valor basado en la posición del ratón
//     let percentage = offsetX / sliderWidth
//     percentage = Math.max(0, Math.min(percentage, 1))

//     // Convertir el porcentaje a un valor dentro del rango
//     const newValue = min + percentage * (max - min)

//     // Redondear al paso más cercano
//     const steppedValue = Math.round(newValue / step) * step

//     // Actualizar el valor
//     setLocalValue(steppedValue)
//     onChange(steppedValue)
//   }

//   const handleMouseUp = () => {
//     setIsDragging(false)
//     document.removeEventListener("mousemove", handleMouseMove)
//     document.removeEventListener("mouseup", handleMouseUp)
//   }

//   // Añadir esta función para manejar eventos táctiles
//   const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
//     setIsDragging(true)
//     document.addEventListener("touchmove", handleTouchMove, { passive: false })
//     document.addEventListener("touchend", handleTouchEnd)
//     // Prevenir scroll durante el arrastre
//     e.preventDefault()
//   }

//   const handleTouchMove = (e: TouchEvent) => {
//     if (!isDragging || !sliderRef) return

//     // Obtener las dimensiones y posición del slider
//     const rect = sliderRef.getBoundingClientRect()
//     const sliderWidth = rect.width
//     const touch = e.touches[0]
//     const offsetX = touch.clientX - rect.left

//     // Calcular el nuevo valor basado en la posición del toque
//     let percentage = offsetX / sliderWidth
//     percentage = Math.max(0, Math.min(percentage, 1))

//     // Convertir el porcentaje a un valor dentro del rango
//     const newValue = min + percentage * (max - min)

//     // Redondear al paso más cercano
//     const steppedValue = Math.round(newValue / step) * step

//     // Actualizar el valor
//     setLocalValue(steppedValue)
//     onChange(steppedValue)

//     // Prevenir scroll durante el arrastre
//     e.preventDefault()
//   }

//   const handleTouchEnd = () => {
//     setIsDragging(false)
//     document.removeEventListener("touchmove", handleTouchMove)
//     document.removeEventListener("touchend", handleTouchEnd)
//   }

//   // Generar marcas para el slider
//   const renderMarks = () => {
//     if (!marks) return null

//     const markCount = max - min + 1
//     const markElements = []

//     for (let i = 0; i < markCount; i += Math.ceil(markCount / 10)) {
//       const markValue = min + i
//       const markPosition = ((markValue - min) / (max - min)) * 100

//       markElements.push(
//         <div
//           key={markValue}
//           className="absolute w-0.5 h-2 bg-gray-300 transform -translate-x-1/2"
//           style={{ left: `${markPosition}%`, bottom: "-8px" }}
//         />,
//       )

//       if (i % Math.ceil(markCount / 5) === 0) {
//         markElements.push(
//           <div
//             key={`label-${markValue}`}
//             className="absolute text-xs text-gray-500 transform -translate-x-1/2"
//             style={{ left: `${markPosition}%`, bottom: "-24px" }}
//           >
//             {markValue}
//             {unit}
//           </div>,
//         )
//       }
//     }

//     return markElements
//   }

//   return (
//     <div className="w-full py-6">
//       <div className="flex justify-center mb-6">
//         <motion.div
//           className="text-2xl font-bold text-teal-500"
//           key={localValue}
//           initial={{ scale: 0.8, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           transition={{ type: "spring", stiffness: 500, damping: 30 }}
//         >
//           {localValue} {unit}
//         </motion.div>
//       </div>

//       <div className="mb-2 text-sm text-center text-gray-600">{label}</div>

//       <div className="relative pt-1" ref={setSliderRef}>
//         <div className="h-1 bg-gray-200 rounded-full">
//           <div className="h-1 bg-teal-500 rounded-full" style={{ width: `${percentage}%` }} />
//         </div>

//         <input
//           type="range"
//           min={min}
//           max={max}
//           step={step}
//           value={localValue}
//           onChange={handleChange}
//           onMouseDown={() => setIsDragging(true)}
//           onMouseUp={() => setIsDragging(false)}
//           onTouchStart={() => setIsDragging(true)}
//           onTouchEnd={() => setIsDragging(false)}
//           className="absolute top-0 w-full h-1 opacity-0 cursor-pointer"
//           style={{ pointerEvents: "none" }} // Deshabilitamos la interacción directa con el input
//         />

//         <div
//           className="absolute w-12 h-12 bg-white rounded-full shadow transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
//           style={{ left: `${percentage}%`, top: "50%" }}
//           onMouseDown={handleMouseDown}
//           onTouchStart={handleTouchStart}
//         >
//           <img
//             src="/treat-ball-new.png"
//             alt="Perrito control"
//             className="w-10 h-10 object-contain"
//             style={{ pointerEvents: "none" }}
//           />
//           {isDragging && (
//             <div className="absolute -top-8 bg-teal-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
//               {localValue}
//               {unit}
//             </div>
//           )}
//         </div>

//         <div className="relative h-6 mt-2">{renderMarks()}</div>
//       </div>
//     </div>
//   )
// }
