import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function HomeHero() {
  return (
    <section className="relative z-20 overflow-visible bg-primary">
      <div className="container relative z-10 mx-auto grid min-h-[78vh] items-center gap-10 px-4 pb-14 pt-24 sm:pt-28 md:min-h-[84vh] md:pb-16 md:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(480px,620px)] lg:gap-14">
        <div className="max-w-2xl">
          <div className="animate-fade-in-small inline-flex items-center rounded-full border border-white/25 bg-white/95 px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_12px_30px_rgba(42,120,128,0.08)] backdrop-blur">
            Nutrición premium para cada día
          </div>

          <h1 className="animate-fade-in mt-6 max-w-[10ch] font-display text-4xl font-bold leading-[0.94] text-white sm:max-w-[11ch] sm:text-5xl md:text-5xl lg:text-5xl xl:text-7xl">
            ¡Comida real para amigos reales!
          </h1>

          <p className="animate-fade-in-small mt-6 max-w-xl text-lg leading-relaxed text-white/90 md:text-xl">
            Nutrición premium horneada con ingredientes frescos y naturales para un compañero más sano, motivado y
            feliz.
          </p>

          <div className="animate-fade-in-small mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#2a7880] px-8 py-7 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(42,120,128,0.22)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#1d636b] hover:shadow-[0_22px_50px_rgba(29,99,107,0.26)]"
            >
              <Link href="#nuestras-recetas">Descubre Nuestras Recetas</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="relative w-full">
            <Image
              src="/iconos/image/hero.pet.webp"
              alt="Comida real para amigos reales - Pet Gourmet"
              priority
              width={620}
              height={620}
              className="animate-hero-bob h-auto w-full object-contain translate-y-[12%] md:translate-y-[15%] scale-[1.02]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
