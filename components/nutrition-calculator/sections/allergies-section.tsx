"use client"

import { useRef } from "react"
import type { CalculatorFormData, AllergenId } from "../types"

interface AllergiesSectionProps {
  petName: string
  hasAllergies: boolean | null
  allergens: AllergenId[]
  onChange: (updates: Partial<CalculatorFormData>) => void
}

const ALLERGEN_OPTIONS: { id: AllergenId; label: string }[] = [
  { id: "pollo",   label: "pollo" },
  { id: "res",     label: "res" },
  { id: "cerdo",   label: "cerdo" },
  { id: "ternera", label: "ternera" },
]

export function AllergiesSection({
  petName,
  hasAllergies,
  allergens,
  onChange,
}: AllergiesSectionProps) {
  const name     = petName || "Tu perro"
  const chipsRef = useRef<HTMLDivElement>(null)

  const toggleAllergen = (id: AllergenId) => {
    const updated = allergens.includes(id)
      ? allergens.filter((a) => a !== id)
      : [...allergens, id]
    onChange({ allergens: updated })
  }

  const handleHasAllergies = (value: boolean) => {
    onChange({
      hasAllergies: value,
      allergens: value ? allergens : [],
    })
  }

  return (
    <div className="w-full space-y-5 text-center">
      {/* Toggle tiene / no tiene */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-lg font-medium text-gray-700">
        <span className="capitalize">{name}</span>

        <button
          type="button"
          onClick={() => handleHasAllergies(true)}
          className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
            hasAllergies === true
              ? "bg-[#2a7880] border-[#2a7880] text-white"
              : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
          }`}
        >
          tiene
        </button>

        <button
          type="button"
          onClick={() => handleHasAllergies(false)}
          className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
            hasAllergies === false
              ? "bg-[#2a7880] border-[#2a7880] text-white"
              : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
          }`}
        >
          no tiene
        </button>

        <span>alergia a estos alimentos:</span>
      </div>

      {/* Chips de alérgenos */}
      {hasAllergies === true && (
        <div ref={chipsRef} className="flex flex-wrap justify-center gap-3">
          {ALLERGEN_OPTIONS.map((allergen) => (
            <button
              key={allergen.id}
              type="button"
              onClick={() => toggleAllergen(allergen.id)}
              className={`px-5 py-1.5 rounded-full border-2 text-sm font-semibold transition-colors ${
                allergens.includes(allergen.id)
                  ? "bg-[#2a7880] border-[#2a7880] text-white"
                  : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
              }`}
            >
              {allergen.label}
            </button>
          ))}
          <p className="w-full text-xs text-[#b8c8cb] mt-1">
            Selecciona al menos una proteína para continuar.
          </p>
        </div>
      )}

      {hasAllergies === false && (
        <p className="text-sm text-gray-500 italic">
          Perfecto. Consideraremos todas nuestras recetas para{" "}
          <span className="capitalize">{name}</span>.
        </p>
      )}
    </div>
  )
}
