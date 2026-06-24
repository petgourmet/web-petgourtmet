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

      {/* grid:
          - mobile: 2 columnas
          - desktop (md+): 4 columnas
          - gaps generosos para que las cards respiren con las imágenes
            más grandes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 justify-items-center">
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
                // Contenedor responsive: 128px mobile · 160px desktop.
                // Reducido para que las tarjetas sean más compactas.
                <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                  <Image
                    src={option.image}
                    alt={option.label}
                    width={160}
                    height={160}
                    sizes="(min-width: 768px) 160px, 128px"
                    className="object-contain w-full h-full"
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
