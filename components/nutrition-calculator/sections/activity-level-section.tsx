"use client"

import Image from "next/image"
import type { CalculatorFormData, ActivityLevel } from "../types"
import { ChoiceCard } from "../ui/choice-card"
import { getActivityDescription } from "../calculator-engine"

interface ActivityLevelSectionProps {
  petName: string
  selected: ActivityLevel | null
  onChange: (updates: Partial<CalculatorFormData>) => void
}

const ACTIVITY_OPTIONS: {
  id: ActivityLevel
  label: string
  image: string
}[] = [
  { id: "bajo",     label: "Bajo",     image: "/cacu/activiti/0-acti.png" },
  { id: "moderado", label: "Moderado", image: "/cacu/activiti/mas-active.png" },
  { id: "alto",     label: "Alto",     image: "/cacu/activiti/muy-active.png" },
]

export function ActivityLevelSection({
  petName,
  selected,
  onChange,
}: ActivityLevelSectionProps) {
  const name = petName || "tu perro"

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold text-[#16313b] text-center mb-8 font-display">
        Nivel de actividad de{" "}
        <span className="text-[#2a7880] capitalize">{name}</span>
      </h3>

      {/* grid:
          - mobile: 1 columna, mucho espacio vertical entre cards
          - desktop (md+): 3 columnas con gap más generoso
          - max-w ampliado de 2xl → 4xl para que las cards más grandes
            no queden apretujadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 justify-items-center max-w-4xl mx-auto">
        {ACTIVITY_OPTIONS.map((option) => {
          const isSelected = selected === option.id
          return (
            <ChoiceCard
              key={option.id}
              selected={isSelected}
              onClick={() => onChange({ activityLevel: option.id })}
              label={option.label}
              description={getActivityDescription(option.id)}
              illustration={
                // Contenedor responsive: 144px mobile · 176px desktop.
                // Reducido para que las tarjetas sean más compactas.
                <div className="w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
                  <Image
                    src={option.image}
                    alt={option.label}
                    width={176}
                    height={176}
                    sizes="(min-width: 768px) 176px, 144px"
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
