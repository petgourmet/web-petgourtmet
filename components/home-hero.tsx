import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import heroImagePrimary from "../public/iconos/image/hero (2).webp"

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(122,184,191,0.18),_transparent_32%),radial-gradient(circle_at_84%_14%,_rgba(243,216,173,0.56),_transparent_28%),linear-gradient(135deg,_#fffcf5_0%,_#fff6ea_46%,_#eff9f9_100%)]">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#7AB8BF]/12 to-transparent" />
      <div className="animate-hero-drift absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#7AB8BF]/16 blur-3xl" />
      <div className="animate-hero-pulse absolute right-[-5rem] top-12 h-80 w-80 rounded-full bg-[#f3d8ad]/36 blur-3xl" />
      <div className="absolute bottom-[-5rem] left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

      <div className="container relative z-10 mx-auto grid min-h-[78vh] items-center gap-10 px-4 pb-14 pt-24 sm:pt-28 md:min-h-[84vh] md:pb-16 md:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(480px,620px)] lg:gap-14">
        <div className="max-w-2xl">
          <div className="animate-fade-in-small inline-flex items-center rounded-full border border-[#7AB8BF]/20 bg-white/80 px-4 py-2 text-sm font-semibold text-[#2a7880] shadow-[0_12px_30px_rgba(42,120,128,0.08)] backdrop-blur">
            Nutricion premium para cada dia
          </div>

          <h1 className="animate-fade-in mt-6 max-w-[10ch] font-display text-4xl font-bold leading-[0.94] text-[#16313b] sm:max-w-[11ch] sm:text-5xl md:text-6xl lg:text-7xl">
            ¡Comida real para amigos reales!
          </h1>

          <p className="animate-fade-in-small mt-6 max-w-xl text-lg leading-relaxed text-[#4f6367] md:text-xl">
            Nutricion premium horneada con ingredientes frescos y naturales para un companero mas sano, motivado y
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

          <div className="animate-fade-in-small mt-8 flex flex-col items-start gap-3 text-sm font-medium text-[#486266] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7AB8BF]" />
              Ingredientes frescos y reales
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f3d8ad]" />
              Horneado premium
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16313b]" />
              Nutricion pensada para su bienestar
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="animate-hero-pulse absolute inset-x-6 inset-y-8 rounded-[36px] bg-[#7AB8BF]/14 blur-3xl sm:inset-x-12 sm:inset-y-12 sm:rounded-[52px]" />

          <div className="relative rounded-[26px] border border-white/80 bg-white/44 p-2.5 shadow-[0_24px_60px_rgba(30,68,74,0.12)] backdrop-blur sm:rounded-[40px] sm:p-3 sm:shadow-[0_36px_90px_rgba(30,68,74,0.14)]">
            <div className="absolute -right-3 top-10 hidden h-24 w-24 rounded-[28px] bg-[#16313b] lg:block" />
            <div className="absolute -left-3 bottom-16 hidden h-16 w-16 rounded-full bg-[#f3d8ad] lg:block" />
            <div className="animate-hero-sheen absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent sm:inset-x-10" />

            <div className="relative overflow-hidden rounded-[22px] rounded-tr-[48px] rounded-bl-[48px] bg-[linear-gradient(145deg,_#f8efe2,_#ffffff)] p-3 sm:rounded-[34px] sm:rounded-tr-[112px] sm:rounded-bl-[112px] sm:p-5">
              <div className="relative overflow-hidden rounded-[20px] bg-[#f3eadc] sm:rounded-[30px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.7),_transparent_34%),linear-gradient(180deg,rgba(13,25,27,0.02),rgba(13,25,27,0.12))]" />
                <div className="animate-hero-sheen absolute left-8 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/70 to-transparent" />

                <Image
                  src={heroImagePrimary}
                  alt="Perro disfrutando una galleta natural de Pet Gourmet"
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="animate-hero-bob h-auto w-full object-cover"
                />

                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/20 to-transparent sm:h-24" />
              </div>
            </div>
          </div>

          <div className="animate-fade-in-small mt-5 rounded-[20px] border border-white/80 bg-white/76 px-4 py-4 text-sm leading-relaxed text-[#486266] shadow-[0_12px_28px_rgba(22,49,59,0.08)] backdrop-blur sm:mt-6 sm:rounded-[24px] sm:px-5">
            Nutricion premium hecha para elevar sus dias con ingredientes reales, horneado cuidadoso y un sabor que si emociona.
          </div>
        </div>
      </div>
    </section>
  )
}
