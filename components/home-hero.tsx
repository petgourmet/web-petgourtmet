import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import heroImagePrimary from "../public/iconos/image/home-hero.webp"
import { TransparentImage } from "./transparent-image"

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
            Nutrición premium para cada día
          </div>

          <h1 className="animate-fade-in mt-6 max-w-[10ch] font-display text-4xl font-bold leading-[0.94] text-[#16313b] sm:max-w-[11ch] sm:text-5xl md:text-6xl lg:text-7xl">
            ¡Comida real para amigos reales!
          </h1>

          <p className="animate-fade-in-small mt-6 max-w-xl text-lg leading-relaxed text-[#4f6367] md:text-xl">
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
          <div className="relative w-full overflow-hidden">
            <Image
              src={heroImagePrimary}
              alt="Comida real para amigos reales - Pet Gourmet"
              priority
              sizes="(max-width: 1024px) 100vw, 620px"
              className="animate-hero-bob h-auto w-full object-cover"
              style={{
                maskImage: "linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 100%)",
              }}
            />
          </div>

          {/* ───────────────────────────────────────────────────────────────
               INGREDIENTES FLOTANTES DE DESKTOP Y MOBILE (PEGADOS AL PERRO)
               Todos están dentro del contenedor relativo del perro para que 
               se muevan y escalen perfectamente con él.
             ─────────────────────────────────────────────────────────────── */}

          {/* 1. Spinach leaf (arriba del perro) */}
          <div
            className="absolute left-[25%] top-[-8%] md:top-[-10%] z-20 pointer-events-none animate-hero-float w-[35px] md:w-[50px]"
            style={{ animationDelay: "0.2s", animationDuration: "5.4s" }}
          >
            <TransparentImage
              src="/iconos/image/spinach-leaf.png"
              alt="Hoja de espinaca fresca"
              width={50}
              height={50}
              className="rotate-[30deg] filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
            />
          </div>

          {/* 2. Carrot slice (arriba-izquierda, entre texto y perro) */}
          <div
            className="absolute left-[-12%] top-[24%] z-20 pointer-events-none animate-hero-float w-[55px] md:w-[75px]"
            style={{ animationDelay: "0.8s", animationDuration: "5.8s" }}
          >
            <TransparentImage
              src="/iconos/image/carrot-slice.png"
              alt="Rodaja de zanahoria fresca"
              width={75}
              height={75}
              className="rotate-[10deg] filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
            />
          </div>

          {/* 3. Carrot slice (abajo-izquierda, entre texto y perro) */}
          <div
            className="absolute left-[-22%] top-[42%] z-20 pointer-events-none animate-hero-float w-[65px] md:w-[90px]"
            style={{ animationDelay: "1.4s", animationDuration: "6.2s" }}
          >
            <TransparentImage
              src="/iconos/image/carrot-slice.png"
              alt="Rodaja de zanahoria fresca"
              width={90}
              height={90}
              className="rotate-[15deg] filter drop-shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
            />
          </div>

          {/* 4. Blueberry (abajo del cachete izquierdo) */}
          <div
            className="absolute left-[18%] bottom-[16%] md:bottom-[20%] z-20 pointer-events-none animate-hero-float w-[24px] md:w-[32px]"
            style={{ animationDelay: "2.0s", animationDuration: "5.0s" }}
          >
            <TransparentImage
              src="/iconos/image/blueberry.png"
              alt="Arándano fresco"
              width={32}
              height={32}
              className="rotate-[20deg] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
            />
          </div>

          {/* 5. Carrot slice (abajo centro-izquierda) */}
          <div
            className="absolute left-[-15%] bottom-[0%] md:bottom-[-2%] z-20 pointer-events-none animate-hero-float w-[55px] md:w-[75px]"
            style={{ animationDelay: "0.4s", animationDuration: "5.6s" }}
          >
            <TransparentImage
              src="/iconos/image/carrot-slice.png"
              alt="Rodaja de zanahoria fresca"
              width={75}
              height={75}
              className="rotate-[12deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]"
            />
          </div>

          {/* 6. Beef chunk (esquina superior derecha) */}
          <div
            className="absolute right-[-8%] top-[10%] z-20 pointer-events-none animate-hero-float w-[55px] md:w-[75px]"
            style={{ animationDelay: "1.0s", animationDuration: "5.5s" }}
          >
            <TransparentImage
              src="/iconos/image/beef-chunk.png"
              alt="Trozos de carne fresca"
              width={75}
              height={75}
              className="rotate-[15deg] filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
            />
          </div>

          {/* 7. Blueberry (esquina inferior derecha - arriba del cluster) */}
          <div
            className="absolute right-[-6%] bottom-[20%] z-20 pointer-events-none animate-hero-float w-[24px] md:w-[32px]"
            style={{ animationDelay: "2.2s", animationDuration: "6.0s" }}
          >
            <TransparentImage
              src="/iconos/image/blueberry.png"
              alt="Arándano fresco"
              width={32}
              height={32}
              className="rotate-[-15deg] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
            />
          </div>

          {/* 8. Cluster de ingredientes principal (debajo del cuello/pecho del perro) */}
          <div
            className="absolute left-[8%] md:left-[12%] bottom-[-12%] md:bottom-[-16%] z-30 pointer-events-none animate-hero-float w-[240px] md:w-[340px] lg:w-[380px]"
            style={{ animationDelay: "0.6s", animationDuration: "6.0s" }}
          >
            <TransparentImage
              src="/iconos/image/group-beef-broccoli-carrot.png"
              alt="Grupo de carne, brócoli y zanahoria"
              width={380}
              height={290}
              className="w-full h-auto object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.15)]"
            />
          </div>

          {/* 9. Rodaja de Manzana (superpuesta abajo del cluster) */}
          <div
            className="absolute left-[38%] md:left-[46%] bottom-[-14%] md:bottom-[-19%] z-40 pointer-events-none animate-hero-float w-[55px] md:w-[75px]"
            style={{ animationDelay: "1.2s", animationDuration: "5.8s" }}
          >
            <TransparentImage
              src="/iconos/image/apple-slice.png"
              alt="Rodaja de manzana fresca"
              width={75}
              height={75}
              className="rotate-[-15deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
            />
          </div>
        </div>
      </div>

      {/* 10. Hoja de espinaca en la esquina inferior izquierda de la pantalla */}
      <div
        className="absolute left-[4%] bottom-[4%] z-20 pointer-events-none animate-hero-float w-[50px] md:w-[70px]"
        style={{ animationDelay: "1.8s", animationDuration: "6.5s" }}
      >
        <TransparentImage
          src="/iconos/image/spinach-leaf.png"
          alt="Hoja de espinaca fresca"
          width={70}
          height={70}
          className="-rotate-[45deg] filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
        />
      </div>
    </section>
  )
}

