"use client"

import { usePlanForm } from "@/contexts/plan-form-context"
import { motion } from "framer-motion"
import Image from "next/image"
import { useState } from "react"

export default function ProgressIndicator() {
  const { currentStep, totalSteps } = usePlanForm()
  const [shakeDog, setShakeDog] = useState(false)
  const [shakeBowl, setShakeBowl] = useState(false)

  // Calcular el progreso como porcentaje
  const progress = (currentStep / totalSteps) * 100

  // Variantes de animación para la sacudida
  const shakeAnimation = {
    shake: {
      rotate: [0, -5, 0, 5, 0],
      transition: { duration: 0.5 },
    },
    idle: {
      rotate: 0,
    },
  }

  const handleDogClick = () => {
    setShakeDog(true)
    setTimeout(() => setShakeDog(false), 500)
  }

  const handleBowlClick = () => {
    setShakeBowl(true)
    setTimeout(() => setShakeBowl(false), 500)
  }

  return (
    <div className="w-full mb-8">
      {/* Eliminamos el contenedor superior que tenía el plato */}

      {/* Barra de progreso más alta para acomodar los elementos */}
      <div className="h-16 bg-primary/10 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />

        {/* Perrito corriendo que sigue el progreso */}
        <motion.div
          className="absolute top-1/2 transform -translate-y-1/2"
          initial={{ left: 0 }}
          animate={{ left: `${progress}%` }}
          transition={{ duration: 0.5 }}
          style={{
            zIndex: 10,
            marginLeft: progress < 5 ? 0 : -30, // Ajuste para que no se salga al inicio
          }}
        >
          <motion.div
            onClick={handleDogClick}
            animate={shakeDog ? "shake" : "idle"}
            variants={shakeAnimation}
            className="cursor-pointer"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gif%20can%20%20v-1MjnSmclJjpw5LRUxtmoMxh5M9HyTb.gif"
              alt="Perrito corriendo"
              width={60}
              height={60}
              className="object-contain"
              style={{
                background: "transparent",
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Plato de comida al final de la barra */}
        <div
          className="absolute right-0 top-1/2 transform -translate-y-1/2"
          style={{
            zIndex: 10,
            marginRight: 20, // Cambiado de -10 a 20 para moverlo a la izquierda
          }}
        >
          <motion.div
            onClick={handleBowlClick}
            animate={shakeBowl ? "shake" : "idle"}
            variants={shakeAnimation}
            className="cursor-pointer"
          >
            <Image src="/pet-bowl-complete.png" alt="Bowl completo" width={60} height={60} />
          </motion.div>
        </div>
      </div>

      <div className="flex justify-between mt-1 text-xs text-gray-500">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${currentStep > index * 2 ? "bg-primary" : "bg-gray-200"}`}
          />
        ))}
      </div>
    </div>
  )
}
