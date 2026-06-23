"use client"

import { type ChangeEvent } from "react"
import { Minus, Plus, AlertCircle } from "lucide-react"
import type { CalculatorFormData, PetGender } from "../types"

interface BasicInfoSectionProps {
  data: Pick<CalculatorFormData, "petName" | "gender" | "weight">
  onChange: (updates: Partial<CalculatorFormData>) => void
}

const MIN_WEIGHT = 0.5
const MAX_WEIGHT = 90

export function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  const { petName, gender, weight } = data

  const handleWeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    onChange({ weight: isNaN(val) ? null : val })
  }

  const stepWeight = (delta: number) => {
    const current = weight ?? 0
    const next = Math.round((current + delta) * 2) / 2 // pasos de 0.5
    if (next < MIN_WEIGHT || next > MAX_WEIGHT) return
    onChange({ weight: next })
  }

  const weightError =
    weight !== null && (weight < MIN_WEIGHT || weight > MAX_WEIGHT)
  const weightWarning =
    weight !== null && weight > 0 && weight < MIN_WEIGHT

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#5d7276] text-center">
            Nombre de tu perro:
          </label>
          <div className="bg-white border border-[#e3ecee] rounded-[18px] px-4 py-3 shadow-sm focus-within:border-[#7AB8BF] transition-colors">
            <input
              type="text"
              value={petName}
              onChange={(e) => onChange({ petName: e.target.value })}
              placeholder="Pantaleon"
              maxLength={24}
              className="w-full text-center text-[#16313b] bg-transparent outline-none placeholder:text-[#b8c8cb] font-medium text-base"
            />
          </div>
        </div>

        {/* Género */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#5d7276] text-center">
            {petName ? (
              <>
                <span className="text-base font-bold text-[#2a7880]">{petName}</span> es:
              </>
            ) : (
              "Tu perro es:"
            )}
          </label>
          <div className="bg-white border border-[#e3ecee] rounded-[18px] px-4 py-3 shadow-sm flex items-center justify-center gap-3">
            {(["macho", "hembra"] as PetGender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange({ gender: g })}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors capitalize ${
                  gender === g
                    ? "bg-[#2a7880] border-[#2a7880] text-white"
                    : "bg-white border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF]"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Peso con stepper */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#5d7276] text-center">
            {petName ? (
              <>
                Peso de <span className="text-base font-bold text-[#2a7880]">{petName}</span> (kg):
              </>
            ) : (
              "Peso en kilos:"
            )}
          </label>
          <div className={`bg-white border rounded-[18px] px-3 py-2.5 shadow-sm flex items-center gap-2 transition-colors ${
            weightError
              ? "border-red-300 focus-within:border-red-400"
              : "border-[#e3ecee] focus-within:border-[#7AB8BF]"
          }`}>
            <button
              type="button"
              onClick={() => stepWeight(-0.5)}
              disabled={!weight || weight <= MIN_WEIGHT}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF] hover:text-[#2a7880] disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              value={weight ?? ""}
              onChange={handleWeightChange}
              placeholder="15"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={0.5}
              className="flex-1 text-center text-[#16313b] bg-transparent outline-none placeholder:text-[#b8c8cb] font-medium text-base"
            />
            <button
              type="button"
              onClick={() => stepWeight(0.5)}
              disabled={!!weight && weight >= MAX_WEIGHT}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-[#e3ecee] text-[#5d7276] hover:border-[#7AB8BF] hover:text-[#2a7880] disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {weightError && (
            <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              El peso debe estar entre {MIN_WEIGHT} y {MAX_WEIGHT} kg
            </p>
          )}
          {weight && !weightError && (
            <p className="text-[10px] text-[#7AB8BF] text-center mt-0.5">
              Rango válido: {MIN_WEIGHT}–{MAX_WEIGHT} kg
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
