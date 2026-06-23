// ============================================================
// PÁGINA: /crear-plan
//
// Calculadora de alimentación personalizada para Pet Gourmet.
// Flujo de scroll-down progresivo en una sola pantalla.
// ============================================================

import type { Metadata } from "next"
import { NutritionCalculator } from "@/components/nutrition-calculator"

export const metadata: Metadata = {
  title: "Alimentación Perronalizada | Pet Gourmet",
  description:
    "Crea el plan de nutrición premium personalizado para tu perro. Descubre cuánto y qué receta necesita según su peso, etapa de vida y nivel de actividad.",
}

export default function CrearPlanPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero – mismo estilo que HomeHero ── */}
      <section className="relative z-10 overflow-hidden bg-primary">
        {/* Glow decorativo */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-[#e7ae84]/10 blur-2xl" />

        <div className="container relative z-10 mx-auto px-4 py-16 text-center md:py-20">
          {/* Heading */}
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl lg:text-6xl">
            Alimentación{" "}
            <span className="text-[#16313b]/70">Perronalizada</span>
          </h1>

          {/* Badge */}
          <div className="mt-4 inline-flex items-center rounded-md border border-white/25 bg-white/95 px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_8px_24px_rgba(42,120,128,0.12)] backdrop-blur">
            Formulado con veterinarios 🐾
          </div>

          {/* Sub */}
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl">
            Calculamos la porción exacta para tu perro según su peso, etapa de vida y
            nivel de actividad.
          </p>

          {/* Indicador de scroll */}
          <div className="mt-8 flex items-center justify-center gap-2 text-white/50 text-sm">
            <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Empieza a completar el formulario abajo
          </div>
        </div>
      </section>

      {/* ── Calculadora principal ── */}
      <div className="w-full px-4 py-10 md:px-8 md:py-14 max-w-5xl mx-auto">
        <NutritionCalculator />
      </div>
    </main>
  )
}
