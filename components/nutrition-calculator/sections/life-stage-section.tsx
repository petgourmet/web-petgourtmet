"use client"

import Image from "next/image"
import type { CalculatorFormData, LifeStage } from "../types"
import { ChoiceCard } from "../ui/choice-card"
import { getLifeStageRange } from "../calculator-engine"

interface LifeStageSectionProps {
  petName: string
  selected: LifeStage | null
  onChange: (updates: Partial<CalculatorFormData>) => void
}

const LIFE_STAGE_OPTIONS: {
  id: LifeStage
  label: string
  image: string
}[] = [
  { id: "cachorro-pequeno", label: "Cachorro pequeño", image: "/calcula-image/peque.png" },
  { id: "cachorro-grande",  label: "Cachorro grande",  image: "/calcula-image/median.png" },
  { id: "adulto",           label: "Adulto",           image: "/calcula-image/adul.png" },
  { id: "senior",           label: "Senior",           image: "/calcula-image/senior.png" },
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
                <div className="w-36 h-36 flex items-center justify-center">
                  <Image
                    src={option.image}
                    alt={option.label}
                    width={144}
                    height={144}
                    className="object-contain"
                  />
                </div>
              }
            />
          )
        })}
      </div>
    </div>
  )
}
