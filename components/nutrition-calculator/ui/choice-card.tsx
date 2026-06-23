"use client"
// ============================================================
// UI – ChoiceCard
//
// Tarjeta de selección reutilizable con ilustración.
// Inspirada en el diseño Freshpet adaptado a marca Pet Gourmet.
//
// Props:
//   selected    – indica si está seleccionada
//   onClick     – handler de clic
//   illustration – elemento React (img, svg, etc.)
//   label       – texto del botón pill
//   description – texto descriptivo bajo el botón
//   disabled    – deshabilitar interacción
// ============================================================

import { motion } from "framer-motion"

interface ChoiceCardProps {
  selected: boolean
  onClick: () => void
  illustration?: React.ReactNode
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

export function ChoiceCard({
  selected,
  onClick,
  illustration,
  label,
  description,
  disabled = false,
  className = "",
}: ChoiceCardProps) {
  return (
    <motion.div
      className={`flex flex-col items-center gap-3 cursor-pointer select-none ${
        disabled ? "opacity-40 pointer-events-none" : ""
      } ${className}`}
      onClick={!disabled ? onClick : undefined}
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15 }}
    >
      {/* Ilustración */}
      {illustration && (
        <div className="h-20 w-20 flex items-center justify-center">
          {illustration}
        </div>
      )}

      {/* Pill / botón de selección */}
      <motion.div
        className={`px-5 py-2 rounded-full border-2 text-sm font-semibold transition-colors whitespace-nowrap ${
          selected
            ? "bg-[#2a7880] border-[#2a7880] text-white"
            : "bg-white border-[#e3ecee] text-[#16313b] hover:border-[#7AB8BF]"
        }`}
        animate={
          selected
            ? { backgroundColor: "#2a7880", borderColor: "#2a7880" }
            : { backgroundColor: "#ffffff", borderColor: "#e3ecee" }
        }
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.div>

      {/* Descripción */}
      {description && (
        <p className="text-xs text-gray-500 text-center leading-relaxed max-w-[140px]">
          {description}
        </p>
      )}
    </motion.div>
  )
}
