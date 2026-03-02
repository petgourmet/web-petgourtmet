"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useWindowSize } from "@/hooks/use-window-size"

// ─── Tiempos ──────────────────────────────────────────────────────────────────
const RAY_DURATION  = 1400  // duración del rayo barriendo el logo (ms)
const SPLASH_TOTAL  = 2500  // cuánto dura el splash antes de revelar el video (ms)
const HIDE_CONTENT  = 3000  // ocultar texto flotante tras inactividad (ms)

export function VideoHero() {
  // ── Estado del splash ──────────────────────────────────────────────────────
  const [rayStarted,     setRayStarted]     = useState(false) // arranca la animación CSS
  const [logoRevealed,   setLogoRevealed]   = useState(false) // logo ya visible (halo on)
  const [splashVisible,  setSplashVisible]  = useState(true)  // controla fade-out del splash

  // ── Estado del contenido flotante sobre el video ───────────────────────────
  const contentRef            = useRef<HTMLDivElement>(null)
  const [showHeroContent,     setShowHeroContent]     = useState(true)
  const heroContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const router    = useRouter()
  const { width } = useWindowSize()
  const isMobile  = width ? width < 768 : false

  // ── 1. Animación del logo al montar ───────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRayStarted(true))
    const tReveal = setTimeout(() => setLogoRevealed(true), RAY_DURATION + 150)
    return () => { cancelAnimationFrame(raf); clearTimeout(tReveal) }
  }, [])

  // ── 2. Después de SPLASH_TOTAL ms → ocultar splash (con o sin video listo) ─
  useEffect(() => {
    const t = setTimeout(() => setSplashVisible(false), SPLASH_TOTAL)
    return () => clearTimeout(t)
  }, [])

  // ── 3. Cuando el video carga, no se necesita estado extra ───────────────────
  const handleVideoLoad = () => { /* iframe cargado — splash ya se ocultó por timer */ }

  // ── 4. Auto-ocultar texto flotante tras inactividad ───────────────────────
  const handleInteraction = () => {
    if (!showHeroContent) {
      contentRef.current?.classList.remove("opacity-0", "pointer-events-none")
      setShowHeroContent(true)
    }
    if (heroContentTimeoutRef.current) clearTimeout(heroContentTimeoutRef.current)
    heroContentTimeoutRef.current = setTimeout(() => {
      contentRef.current?.classList.add("opacity-0", "pointer-events-none")
      setShowHeroContent(false)
    }, HIDE_CONTENT)
  }

  const scrollToRecipes = () => {
    const el = document.getElementById("nuestras-recetas")
    if (el) el.scrollIntoView({ behavior: "smooth" })
    else router.push("/productos#nuestras-recetas")
  }

  return (
    <section
      className="relative min-h-[70vh] md:min-h-screen w-full overflow-hidden text-white"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      style={{
        margin: 0, padding: 0,
        width: "100vw", maxWidth: "100vw",
        left: "50%", right: "50%",
        marginLeft: "-50vw", marginRight: "-50vw",
        position: "relative",
        marginTop: isMobile ? "-1px" : "0",
      }}
    >

      {/* ═══════════════════════════════════════════════════════════════════
          CAPA A — SPLASH  (z-30 → siempre encima mientras está visible)
          Fondo color primary de la web + logo con efecto rayo de luz.
          Se desvanece a los 2.5s para revelar el video.
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-700 ease-in-out"
        style={{
          background: "#7AB8BF",
          opacity: splashVisible ? 1 : 0,
          pointerEvents: splashVisible ? "auto" : "none",
        }}
      >
        {/* Logo + Rayo */}
        <div
          className="relative"
          style={{ width: isMobile ? 200 : 300, height: isMobile ? 100 : 150 }}
        >
          {/* Logo — LCP candidate con priority */}
          <Image
            src="/petgourmet-logo.png"
            alt="Pet Gourmet Logo"
            fill
            priority
            className="object-contain"
            sizes="(max-width:768px) 200px, 300px"
            style={{
              // Oculto antes de que arranque; la animación revela con borde suave
              opacity: rayStarted ? 1 : 0,
              // mask-image con gradiente difuminado al frente → sin barra blanca visible
              WebkitMaskImage: logoRevealed
                ? undefined
                : "linear-gradient(to right, black 70%, transparent 100%)",
              maskImage: logoRevealed
                ? undefined
                : "linear-gradient(to right, black 70%, transparent 100%)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              animation: rayStarted && !logoRevealed
                ? `logoReveal ${RAY_DURATION}ms cubic-bezier(0.25,0.1,0.25,1) forwards`
                : "none",
              filter: logoRevealed
                ? "drop-shadow(0 0 20px rgba(255,255,255,0.6)) drop-shadow(0 0 8px rgba(255,255,255,0.4))"
                : "none",
              transition: "filter 0.6s ease",
            }}
          />


        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CAPA B — VIDEO YOUTUBE  (z-0, carga silenciosamente detrás)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 bg-black">
        <iframe
          src="https://www.youtube.com/embed/dOZPu4XrA1k?autoplay=1&mute=1&loop=1&playlist=dOZPu4XrA1k&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0"
          className="absolute"
          style={{
            top: "50%", left: "50%",
            width: isMobile ? "300vw" : "170vw",
            height: "120vh",
            transform: "translate(-50%, -50%)",
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          title="Pet Gourmet Background Video"
          onLoad={handleVideoLoad}
          frameBorder="0"
        />
      </div>

      {/* Overlay degradado sobre el video (igual que antes) */}
      {!splashVisible && (
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-white/70 md:to-white pointer-events-none" />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CAPA C — CONTENIDO FLOTANTE sobre el video (z-20)
          Aparece cuando el splash ya desapareció.
      ═══════════════════════════════════════════════════════════════════ */}
      {!splashVisible && (
        <div
          ref={contentRef}
          className="relative z-20 container mx-auto px-4 flex flex-col justify-center items-center h-full min-h-[70vh] md:min-h-screen text-center transition-opacity duration-700 ease-in-out"
          style={{ paddingTop: isMobile ? "60px" : "0" }}
        >
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight font-display drop-shadow-lg">
              ¡Comida real para amigos reales!
            </h1>
            <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Nutrición premium horneada con ingredientes frescos y naturales para un compañero más sano, motivado y
              feliz.
            </p>
            <div className="flex justify-center">
              <Button
                onClick={scrollToRecipes}
                size="lg"
                className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 py-7 text-lg font-semibold shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all"
              >
                Descubre Nuestras Recetas
              </Button>
            </div>
          </div>

          {showHeroContent && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                <ArrowRight className="text-white w-5 h-5 rotate-90" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          KEYFRAMES
      ═══════════════════════════════════════════════════════════════════ */}
      <style>{`
        /* El logo se dibuja de izquierda a derecha: mask-size crece desde 0 */
        /* El gradiente en mask-image da un borde difuminado → sin barra visible */
        @keyframes logoReveal {
          from {
            -webkit-mask-size: 0% 100%;
            mask-size: 0% 100%;
          }
          to {
            -webkit-mask-size: 145% 100%;
            mask-size: 145% 100%;
          }
        }
      `}</style>
    </section>
  )
}
