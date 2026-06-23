"use client"
// ============================================================
// SECTION – ¿Está esterilizado?
//
// SOLO se muestra si el perro es MACHO ADULTO.
// Fuente: Excel — "LA RESPUESTA ADULTO SE CONSIDERA SOLO SI ES
// MACHO Y SE CALCULA CON EL VALOR PARA ESTERILIZADO."
//
// Factor: No esterilizado → 1.7  |  Esterilizado → 1.5
// ============================================================

import type { CalculatorFormData } from "../types"

interface NeuteredSectionProps {
  petName: string
  isNeutered: boolean | null
  onChange: (updates: Partial<CalculatorFormData>) => void
}

export function NeuteredSection({ petName, isNeutered, onChange }: NeuteredSectionProps) {
  const name = petName || "tu perro"

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3 text-lg font-medium text-gray-700">
        <span className="capitalize">{name}</span>

        <button
          type="button"
          onClick={() => onChange({ isNeutered: false })}
          className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
            isNeutered === false
              ? "bg-[#2a7880] border-[#2a7880] text-white"
              : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
          }`}
        >
          no está
        </button>

        <button
          type="button"
          onClick={() => onChange({ isNeutered: true })}
          className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
            isNeutered === true
              ? "bg-[#2a7880] border-[#2a7880] text-white"
              : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
          }`}
        >
          está
        </button>

        <span>esterilizado</span>
      </div>

      {isNeutered !== null && (
        <p className="text-sm text-gray-400 mt-3 italic">
          {isNeutered
            ? "Factor de mantenimiento ajustado: 1.5 (Adulto esterilizado)"
            : "Factor de mantenimiento ajustado: 1.7 (Adulto no esterilizado)"}
        </p>
      )}
    </div>
  )
}
