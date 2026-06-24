// ============================================================
// PÁGINA: /crear-plan
//
// Calculadora de alimentación personalizada para Pet Gourmet.
// TEMPORALMENTE DESHABILITADA - Muestra mensaje de "Próximamente"
// ============================================================

import type { Metadata } from "next"
import Link from "next/link"
import { Clock, ArrowLeft, Heart } from "lucide-react"

export const metadata: Metadata = {
  title: "Próximamente - Alimentación Perronalizada | Pet Gourmet",
  description:
    "Muy pronto podrás crear el plan de nutrición premium personalizado para tu perro. ¡Estamos trabajando para ofrecerte la mejor experiencia!",
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
        </div>
      </section>

      {/* ── Mensaje de Próximamente ── */}
      <div className="w-full px-4 py-16 md:px-8 md:py-24 max-w-3xl mx-auto">
        <div className="text-center space-y-8">
          {/* Icono */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#2a7880]/10 flex items-center justify-center">
                <Clock className="w-12 h-12 text-[#2a7880]" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              ¡Próximamente!
            </h2>
            <p className="text-xl text-[#2a7880] font-semibold">
              Podrás perronalizar tu plan
            </p>
          </div>

          {/* Descripción */}
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
            Estamos trabajando para ofrecerte la mejor experiencia de nutrición 
            personalizada para tu mejor amigo. ¡Gracias por tu paciencia!
          </p>

          {/* Beneficios que vendrán */}
          <div className="bg-gray-50 rounded-2xl p-6 max-w-md mx-auto">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Muy pronto podrás:
            </p>
            <ul className="space-y-3 text-left">
              {[
                "Calcular la porción exacta para tu perro",
                "Elegir entre nuestras recetas premium",
                "Recibir un plan personalizado mensual",
                "Disfrutar de envío gratis en tu primer pedido",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2a7880]/10 flex items-center justify-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#2a7880]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA para volver */}
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2a7880] text-white font-semibold hover:bg-[#1d636b] transition-colors shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
          </div>

          {/* Texto adicional */}
          <p className="text-sm text-gray-400">
            Mientras tanto, explora nuestros{" "}
            <Link href="/productos" className="text-[#2a7880] hover:underline font-medium">
              productos disponibles
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
