"use client"

import { UtensilsCrossed, Utensils } from "lucide-react"
import type { CalculatorFormData, ServingPlan } from "../types"

interface ServingPlanSectionProps {
  petName: string
  dailyKcal: number
  selected: ServingPlan | null
  onChange: (updates: Partial<CalculatorFormData>) => void
}

const PLAN_OPTIONS: {
  id: ServingPlan
  label: string
  description: string
  Icon: React.ElementType
  badge: string
}[] = [
  {
    id: "completo",
    label: "Plan completo",
    description: "Alimentaré a mi perro 100% con Pet Gourmet.",
    Icon: UtensilsCrossed,
    badge: "100%",
  },
  {
    id: "medio",
    label: "Medio plan",
    description: "50% de la alimentación diaria mezclada con su comida actual.",
    Icon: Utensils,
    badge: "50%",
  },
]

export function ServingPlanSection({
  petName,
  dailyKcal,
  selected,
  onChange,
}: ServingPlanSectionProps) {
  const name = petName || "tu perro"

  return (
    <div className="w-full">
      <p className="text-center text-[#5d7276] mb-6 text-base">
        De acuerdo a nuestros cálculos,{" "}
        <span className="font-semibold text-[#16313b] capitalize">{name}</span>{" "}
        requiere{" "}
        <span className="font-bold text-[#2a7880]">{dailyKcal.toLocaleString()}</span>{" "}
        calorías al día.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
        {PLAN_OPTIONS.map((plan) => {
          const isSelected = selected === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange({ servingPlan: plan.id })}
              className={`flex flex-col items-center gap-4 p-6 rounded-[24px] border-2 transition-all ${
                isSelected
                  ? "border-[#2a7880] bg-[#eef7f8] shadow-md"
                  : "border-[#e3ecee] bg-white hover:border-[#7AB8BF] hover:shadow-sm"
              }`}
            >
              {/* Icono + badge */}
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  isSelected ? "bg-[#2a7880]/10" : "bg-[#f4fbfc]"
                }`}>
                  <plan.Icon className={`h-8 w-8 transition-colors ${
                    isSelected ? "text-[#2a7880]" : "text-[#7AB8BF]"
                  }`} />
                </div>
                <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  isSelected
                    ? "bg-[#2a7880] text-white"
                    : "bg-[#e3ecee] text-[#5d7276]"
                }`}>
                  {plan.badge}
                </span>
              </div>

              {/* Pill */}
              <span className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? "bg-[#2a7880] border-[#2a7880] text-white"
                  : "bg-white border-[#e3ecee] text-[#5d7276]"
              }`}>
                {plan.label}
              </span>

              <p className="text-xs text-gray-500 text-center leading-relaxed">
                {plan.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
