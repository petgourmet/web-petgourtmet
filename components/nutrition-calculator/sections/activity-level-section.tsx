"use client"

import { PawPrint, Zap, Wind, Moon } from "lucide-react"
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
  Icon: React.ElementType
  bgFrom: string
  bgTo: string
  iconColor: string
}[] = [
  {
    id: "bajo",
    label: "Bajo",
    Icon: Moon,
    bgFrom: "#e8f4f5",
    bgTo: "#d0e9ec",
    iconColor: "#7AB8BF",
  },
  {
    id: "moderado",
    label: "Moderado",
    Icon: Wind,
    bgFrom: "#d5ecee",
    bgTo: "#b8dde1",
    iconColor: "#2a7880",
  },
  {
    id: "alto",
    label: "Alto",
    Icon: Zap,
    bgFrom: "#c4e3e7",
    bgTo: "#9dcdd3",
    iconColor: "#16313b",
  },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center max-w-2xl mx-auto">
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
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${option.bgFrom}, ${option.bgTo})`
                      : "linear-gradient(135deg, #f4fbfc, #e8f4f5)",
                  }}
                >
                  <option.Icon
                    className="transition-colors"
                    style={{
                      width: 36,
                      height: 36,
                      color: isSelected ? option.iconColor : "#b8c8cb",
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
