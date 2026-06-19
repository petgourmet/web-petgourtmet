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
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           INGREDIENTES FLOTANTES
           Mobile: 4 esq + 2 centro  |  Desktop: layout completo
      ═══════════════════════════════════════════════════════════════ */}

      {/* ── SOLO MOBILE ─────────────────────────────────────────────────── */}

      {/* Mobile: Brócoli – esquina superior izquierda, pegado al borde para no tapar texto */}
      <div
        className="absolute left-0 top-0 z-10 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "0.8s", animationDuration: "5.8s" }}
      >
        <TransparentImage
          src="/iconos/image/broccoli-floret.png"
          alt="Brócoli fresco"
          width={65}
          height={65}
          className="rotate-[40deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)] opacity-80"
        />
      </div>

      {/* Mobile: Zanahoria – esquina superior derecha */}
      <div
        className="absolute right-[4%] top-[6%] z-20 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "1.2s", animationDuration: "5.2s" }}
      >
        <TransparentImage
          src="/iconos/image/carrot-slice.png"
          alt="Zanahoria fresca"
          width={75}
          height={75}
          className="rotate-[45deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]"
        />
      </div>

      {/* Mobile: Manzana – esquina inferior izquierda */}
      <div
        className="absolute left-[2%] bottom-[6%] z-20 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "2.2s", animationDuration: "6.8s" }}
      >
        <TransparentImage
          src="/iconos/image/apple-slice.png"
          alt="Rodaja de manzana fresca"
          width={85}
          height={85}
          className="-rotate-[20deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]"
        />
      </div>

      {/* Mobile: Carne – esquina inferior derecha */}
      <div
        className="absolute right-[3%] bottom-[5%] z-20 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "1.8s", animationDuration: "5.5s" }}
      >
        <TransparentImage
          src="/iconos/image/beef-chunk.png"
          alt="Carne de res fresca"
          width={85}
          height={85}
          className="rotate-[20deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]"
        />
      </div>

      {/* Mobile: Arándano – centro izquierda (medio) */}
      <div
        className="absolute left-[5%] top-[48%] z-20 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "3.2s", animationDuration: "7.2s" }}
      >
        <TransparentImage
          src="/iconos/image/blueberry.png"
          alt="Arándano fresco"
          width={52}
          height={52}
          className="rotate-[15deg] filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)]"
        />
      </div>

      {/* Mobile: Espinaca – centro derecha (medio) */}
      <div
        className="absolute right-[4%] top-[44%] z-20 pointer-events-none animate-hero-float md:hidden"
        style={{ animationDelay: "0.5s", animationDuration: "4.8s" }}
      >
        <TransparentImage
          src="/iconos/image/spinach-leaf.png"
          alt="Hoja de espinaca fresca"
          width={58}
          height={58}
          className="rotate-[30deg] filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.08)]"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SOLO DESKTOP (lg+)  —  3 zonas como imagen de referencia:
          A) Acento borde izq  (zanahoria grande, parcial)
          B) Flotantes sueltos (2-3 zanahorias + arándano, zona perrito)
          C) Cluster inf-der   (brócoli + zanahoria + espinaca + carne)
          Columna de texto: completamente limpia
      ═══════════════════════════════════════════════════════════════════ */}

      {/* ── A) ACENTO BORDE IZQUIERDO ───────────────────────────────────── */}

      {/* Zanahoria grande – parcialmente fuera de pantalla, muy abajo */}
      <div
        className="absolute left-[-32px] bottom-[1%] z-30 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "0s", animationDuration: "5.2s" }}
      >
        <TransparentImage
          src="/iconos/image/carrot-slice.png"
          alt="Rodaja de zanahoria fresca"
          width={165}
          height={165}
          className="rotate-[10deg] filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.18)] blur-[0.5px]"
        />
      </div>

      {/* ── B) FLOTANTES INDIVIDUALES – zona del perrito ────────────────── */}

      {/* Zanahoria flotante 1 – arriba del perro (oreja) */}
      <div
        className="absolute left-[51%] top-[5%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "0.6s", animationDuration: "5.4s" }}
      >
        <TransparentImage
          src="/iconos/image/carrot-slice.png"
          alt="Rodaja de zanahoria fresca"
          width={82}
          height={82}
          className="rotate-[18deg] filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
        />
      </div>

      {/* Zanahoria flotante 2 – zona nariz del perro */}
      <div
        className="absolute left-[63%] top-[14%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "2.0s", animationDuration: "6.2s" }}
      >
        <TransparentImage
          src="/iconos/image/carrot-slice.png"
          alt="Rodaja de zanahoria fresca"
          width={72}
          height={72}
          className="-rotate-[12deg] filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
        />
      </div>

      {/* Arándano – pecho del perro */}
      <div
        className="absolute left-[55%] top-[36%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "3.4s", animationDuration: "7.0s" }}
      >
        <TransparentImage
          src="/iconos/image/blueberry.png"
          alt="Arándano fresco"
          width={60}
          height={60}
          className="rotate-[8deg] filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
        />
      </div>

      {/* ── C) CLUSTER INFERIOR DERECHO ─────────────────────────────────── */}
      {/* Los elementos se solapan entre sí para el efecto de grupo natural   */}

      {/* Carne – extremo izquierdo del cluster */}
      <div
        className="absolute right-[38%] bottom-[2%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "1.5s", animationDuration: "6.5s" }}
      >
        <TransparentImage
          src="/iconos/image/beef-chunk.png"
          alt="Carne de res fresca"
          width={115}
          height={115}
          className="-rotate-[8deg] filter drop-shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
        />
      </div>

      {/* Brócoli – centro del cluster, elemento principal */}
      <div
        className="absolute right-[22%] bottom-[0%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "0.8s", animationDuration: "5.8s" }}
      >
        <TransparentImage
          src="/iconos/image/broccoli-floret.png"
          alt="Brócoli fresco"
          width={178}
          height={178}
          className="rotate-[32deg] filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.15)]"
        />
      </div>

      {/* Zanahoria – dentro del cluster junto al brócoli */}
      <div
        className="absolute right-[13%] bottom-[3%] z-20 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "2.8s", animationDuration: "6.0s" }}
      >
        <TransparentImage
          src="/iconos/image/carrot-slice.png"
          alt="Rodaja de zanahoria fresca"
          width={98}
          height={98}
          className="rotate-[25deg] filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
        />
      </div>

      {/* Espinaca – extremo derecho del cluster */}
      <div
        className="absolute right-[6%] bottom-[5%] z-20 pointer-events-none animate-hero-float hidden lg:block opacity-90"
        style={{ animationDelay: "1.2s", animationDuration: "5.2s" }}
      >
        <TransparentImage
          src="/iconos/image/spinach-leaf.png"
          alt="Hoja de espinaca fresca"
          width={108}
          height={108}
          className="-rotate-[20deg] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.10)]"
        />
      </div>

      {/* Manzana – borde derecho, primer plano, cierra el cluster */}
      <div
        className="absolute right-[-18px] bottom-[2%] z-30 pointer-events-none animate-hero-float hidden lg:block"
        style={{ animationDelay: "2.4s", animationDuration: "6.8s" }}
      >
        <TransparentImage
          src="/iconos/image/apple-slice.png"
          alt="Rodaja de manzana fresca"
          width={148}
          height={148}
          className="-rotate-[22deg] filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.16)] blur-[0.5px]"
        />
      </div>

    </section>
  )
}

