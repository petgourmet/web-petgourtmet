"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useWindowSize } from "@/hooks/use-window-size"

// ─── Tiempos ──────────────────────────────────────────────────────────────────
const RAY_DURATION = 1200  // duración del rayo barriendo el logo (ms)
const SPLASH_TOTAL = 1500  // cuánto dura el splash antes de revelar (ms)
const HIDE_CONTENT = 3000  // ocultar texto flotante tras inactividad (ms)

export function VideoHero() {
  // ── Logo draw animation ────────────────────────────────────────────────────
  const [rayStarted, setRayStarted] = useState(false)
  const [logoRevealed, setLogoRevealed] = useState(false)
  // ── Logo salida ↓ + hero entrada ↑ ───────────────────────────────────────
  const [logoExiting, setLogoExiting] = useState(false)  // t=2.5s: logo se va abajo
  const [contentVisible, setContentVisible] = useState(false)  // t=2.65s: texto baja desde arriba
  // ── Fondo / video ─────────────────────────────────────────────────────────
  // CAPA MARCA (z-5): #7AB8BF persiste hasta que thumbnail esté listo
  // CAPA VIDEO (z-0): thumbnail a t=2.8s, iframe a t=8s
  const [showBackground, setShowBackground] = useState(false)
  const [iframeActive] = useState(true)   // arranca de inmediato en background
  const [iframeReady, setIframeReady] = useState(false)
  // ── Auto-ocultar texto flotante ───────────────────────────────────────────
  const [heroHidden, setHeroHidden] = useState(false)
  const heroContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = width ? width < 768 : false

  // ── 1. Draw animation del logo al montar ──────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRayStarted(true))
    const tReveal = setTimeout(() => setLogoRevealed(true), RAY_DURATION + 150)
    return () => { cancelAnimationFrame(raf); clearTimeout(tReveal) }
  }, [])

  // ── 2. Secuencia: logo ↓ → texto ↑ → fondo de marca → thumbnail/video ────
  useEffect(() => {
    const tLogoExit = setTimeout(() => setLogoExiting(true), SPLASH_TOTAL)
    const tContent = setTimeout(() => setContentVisible(true), SPLASH_TOTAL + 150)
    const tBg = setTimeout(() => setShowBackground(true), SPLASH_TOTAL + 300)
    return () => {
      clearTimeout(tLogoExit)
      clearTimeout(tContent)
      clearTimeout(tBg)
    }
  }, [])

  // ── 3. iframe listo → thumbnail se desvanece ──────────────────────────────
  const handleVideoLoad = () => setIframeReady(true)

  // ── 4. Auto-ocultar texto flotante tras inactividad ───────────────────────
  const handleInteraction = () => {
    if (heroHidden) setHeroHidden(false)
    if (heroContentTimeoutRef.current) clearTimeout(heroContentTimeoutRef.current)
    heroContentTimeoutRef.current = setTimeout(() => setHeroHidden(true), HIDE_CONTENT)
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

      {/* ══════════════════════════════════════════════════════════════════
          CAPA VIDEO  z-0 — poster Cloudinary → <video> nativo deferred
          Poster aparece a t=2.8s (LCP ya medido). Video a t=8s.
          Sin iframe de YouTube → sin latencia de terceros.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 bg-black">
        {/* Poster — primer frame del video via Cloudinary, carga en ~100ms */}
        {showBackground && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="https://res.cloudinary.com/dn7unepxa/video/upload/so_0.0,q_80,f_auto/v1772482021/video_ev8mjp.jpg"
            alt=""
            aria-hidden="true"
            fetchPriority="low"
            className="absolute w-full h-full object-cover"
            style={{ opacity: iframeReady ? 0 : 1, transition: "opacity 1s ease" }}
          />
        )}
        {/* Video nativo — sin iframe, sin JS de YouTube, sin latencia */}
        {iframeActive && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover" }}
            onCanPlay={handleVideoLoad}
          >
            {/* WebM primero (más ligero), MP4 como fallback */}
            <source
              src="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto,vc_vp9/v1772482021/video_ev8mjp.webm"
              type="video/webm"
            />
            <source
              src="https://res.cloudinary.com/dn7unepxa/video/upload/q_auto/v1772482021/video_ev8mjp.mp4"
              type="video/mp4"
            />
          </video>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CAPA MARCA  z-5 — color #7AB8BF que persiste mientras no hay
          video. Se desvanece suavemente cuando showBackground=true.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          background: "#7AB8BF",
          opacity: showBackground ? 0 : 1,
          transition: "opacity 0.9s ease",
        }}
      />



      {/* ══════════════════════════════════════════════════════════════════
          CAPA LOGO  z-30
          Se dibuja de izquierda a derecha con el rayo de luz.
          Al terminar el splash (t=2.5s) sale deslizándose hacia ABAJO.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        style={{
          transform: logoExiting ? "translateY(90px)" : "translateY(0px)",
          opacity: logoExiting ? 0 : 1,
          transition: logoExiting
            ? "transform 0.65s cubic-bezier(0.4, 0, 0.8, 0.2), opacity 0.5s ease"
            : "none",
        }}
      >
        <div
          className="relative"
          style={{ width: isMobile ? 200 : 300, height: isMobile ? 100 : 150 }}
        >
          <Image
            src="/petgourmet-logo.png"
            alt="Pet Gourmet Logo"
            fill
            priority
            className="object-contain"
            sizes="(max-width:768px) 200px, 300px"
            style={{
              opacity: rayStarted ? 1 : 0,
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

      {/* ══════════════════════════════════════════════════════════════════
          CAPA HERO CONTENT  z-20
          Siempre en el DOM. Cuando contentVisible=true (t=2.65s) baja
          desde arriba (translateY -50px → 0) mientras el fondo aún es
          el color de marca #7AB8BF. El fondo fade-out ocurre 150ms después.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-20 container mx-auto px-4 flex flex-col justify-center items-center h-full min-h-[70vh] md:min-h-screen text-center"
        style={{
          paddingTop: isMobile ? "60px" : "0",
          transform: contentVisible ? "translateY(0)" : "translateY(-50px)",
          opacity: !contentVisible ? 0 : heroHidden ? 0 : 1,
          pointerEvents: !contentVisible || heroHidden ? "none" : "auto",
          transition: "transform 0.75s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.65s ease",
        }}
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
              className="rounded-full bg-[#2a7880] hover:bg-[#1d636b] text-white px-8 py-7 text-lg font-semibold shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all"
            >
              Descubre Nuestras Recetas
            </Button>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          KEYFRAMES
      ══════════════════════════════════════════════════════════════════ */}
      <style>{`
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
