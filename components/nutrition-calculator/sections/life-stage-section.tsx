"use client"

import { PawPrint } from "lucide-react"
import type { CalculatorFormData, LifeStage } from "../types"
import { ChoiceCard } from "../ui/choice-card"
import { getLifeStageRange } from "../calculator-engine"

interface LifeStageSectionProps {
  petName: string
  selected: LifeStage | null
  onChange: (updates: Partial<CalculatorFormData>) => void
}

// Placeholder elegante: círculo con paw print escalado por tamaño
// → reemplazar con ilustraciones reales en /public/calculadora/*.png
const LIFE_STAGE_OPTIONS: {
  id: LifeStage
  label: string
  pawSize: number   // px — refuerza visualmente la progresión
  circleSize: number
}[] = [
  { id: "cachorro-pequeno", label: "Cachorro pequeño", pawSize: 20, circleSize: 60 },
  { id: "cachorro-grande",  label: "Cachorro grande",  pawSize: 26, circleSize: 68 },
  { id: "adulto",           label: "Adulto",           pawSize: 32, circleSize: 76 },
  { id: "senior",           label: "Senior",           pawSize: 28, circleSize: 72 },
]

export function LifeStageSection({
  petName,
  selected,
  onChange,
}: LifeStageSectionProps) {
  const name = petName || "tu perro"

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold text-[#16313b] text-center mb-8 font-display">
        Etapa de vida de{" "}
        <span className="text-[#2a7880] capitalize">{name}</span>:
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
        {LIFE_STAGE_OPTIONS.map((option) => {
          const isSelected = selected === option.id
          return (
            <ChoiceCard
              key={option.id}
              selected={isSelected}
              onClick={() => onChange({ lifeStage: option.id })}
              label={option.label}
              description={getLifeStageRange(option.id)}
              illustration={
                <div
                  className="rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    width: option.circleSize,
                    height: option.circleSize,
                    background: isSelected
                      ? "linear-gradient(135deg, #c4e3e7, #9dcdd3)"
                      : "linear-gradient(135deg, #f4fbfc, #e8f4f5)",
                  }}
                >
                  <PawPrint
                    className="transition-colors"
                    style={{
                      width: option.pawSize,
                      height: option.pawSize,
                      color: isSelected ? "#2a7880" : "#b8c8cb",
                    }}
                  />
                </div>
              }
            />
          )
        })}
      </div>

      <p className="text-center text-xs text-[#b8c8cb] mt-6 flex items-center justify-center gap-1.5">
        <PawPrint className="h-3 w-3" />
        Ilustraciones próximamente
      </p>
    </div>
  )
}
