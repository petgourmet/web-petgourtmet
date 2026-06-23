"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Calculator, ShoppingBag } from "lucide-react"

// ─── Contenidos ─────────────────────────────────────
const CONTENTS = {
  products: {
    badge: "Nutrición premium para cada día",
    headline: ["¡Comida real", "para amigos", "reales!"],
    description: "Nutrición premium horneada con ingredientes frescos y naturales para un compañero más sano, motivado y feliz.",
    cta: { label: "Descubre Nuestras Recetas", href: "#nuestras-recetas" },
    image: "/iconos/image/hero.pet.webp",
    imageWidth: 620,
    imageHeight: 620,
    icon: ShoppingBag,
  },
  calculator: {
    badge: "Calculadora nutricional gratuita",
    headline: ["Nutrición", "perronalizada"],
    description: "Calcula la ración diaria exacta para tu perro según su peso, edad y actividad. Científicamente respaldada, 100% gratis.",
    cta: { label: "Calcular ahora", href: "/crear-plan" },
    image: "/calcualk.png",
    imageWidth: 500,
    imageHeight: 500,
    icon: Calculator,
  },
}

export function HomeHero() {
  const [active, setActive] = useState<"products" | "calculator">("products")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-switch cada 15 segundos, se reinicia cuando el usuario cambia manualmente
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Crear nuevo intervalo
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev === "products" ? "calculator" : "products"))
    }, 15000) // 15 segundos
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [active]) // Agregado 'active' a las dependencias para reiniciar el intervalo

  // Función para cambiar manualmente y reiniciar el contador
  const handleManualSwitch = (newActive: "products" | "calculator") => {
    setActive(newActive)
    // El useEffect se ejecutará de nuevo y reiniciará el intervalo
  }

  const content = CONTENTS[active]
  const Icon = content.icon

  return (
    <section className="relative z-20 overflow-hidden bg-primary">
      <div className="container relative z-10 mx-auto grid min-h-[88vh] items-center gap-10 px-4 py-20 md:min-h-[92vh] md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(480px,620px)] lg:gap-14">

        {/* ── Texto ── */}
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/95 px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_12px_30px_rgba(42,120,128,0.08)] backdrop-blur">
                {content.badge}
              </div>

              {/* Headline */}
              <h1 className="mt-4 max-w-[10ch] font-display text-4xl font-bold leading-[0.94] text-white sm:max-w-[11ch] sm:text-5xl md:text-5xl lg:text-5xl xl:text-7xl">
                {content.headline.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>

              {/* Descripción */}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 md:text-xl">
                {content.description}
              </p>

              {/* CTA */}
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border-2 border-white bg-white/10 px-8 py-7 text-lg font-semibold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.4)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:bg-white/20 hover:shadow-[0_0_0_3px_rgba(255,255,255,0.6)]"
                >
                  <Link href={content.cta.href} className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/favicon.ico"
                      alt="Pet Gourmet"
                      width={48}
                      height={48}
                      className="rounded-full border-2 border-white object-cover"
                    />
                    {content.cta.label}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Imagen ── */}
        <div className="relative mx-auto w-full max-w-[620px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active + "-img"}
              initial={{ opacity: 0, y: -60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src={content.image}
                alt={content.cta.label}
                priority
                width={content.imageWidth}
                height={content.imageHeight}
                sizes="(max-width: 768px) 100vw, 620px"
                className="h-auto w-full animate-hero-bob object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Iconos de control ── */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        <button
          type="button"
          onClick={() => handleManualSwitch("products")}
          className={`rounded-full p-3 transition-all duration-300 ${
            active === "products"
              ? "bg-white text-[#2a7880] shadow-lg"
              : "bg-white/20 text-white/60 hover:bg-white/30"
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => handleManualSwitch("calculator")}
          className={`rounded-full p-3 transition-all duration-300 ${
            active === "calculator"
              ? "bg-white text-[#2a7880] shadow-lg"
              : "bg-white/20 text-white/60 hover:bg-white/30"
          }`}
        >
          <Calculator className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}
