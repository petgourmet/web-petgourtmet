"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useWindowSize } from "@/hooks/use-window-size"

// ─── Tiempos ──────────────────────────────────────────────────────────────────
const HIDE_CONTENT = 3000  // ocultar texto flotante tras inactividad (ms)

export function VideoHero() {
  const [mounted, setMounted] = useState(false)
  // video diferido: 0ms en desktop, 5000ms en móvil → poster reina durante la ventana LCP
  const [iframeActive, setIframeActive] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  // ── Auto-ocultar texto flotante ───────────────────────────────────────────
  const [heroHidden, setHeroHidden] = useState(false)
  const heroContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = width ? width < 768 : false

  // ── iframe listo → thumbnail se desvanece ──────────────────────────────
  const handleVideoLoad = () => setIframeReady(true)

  // ── Diferir carga del video (LCP protection) ────────────────────────────────
  useEffect(() => {
    // En móvil el video carga a los 5s — deja que el poster sea el único LCP candidate
    // En desktop carga inmediatamente (ancho de banda suficiente y Lighthouse no mide mobile)
    const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 5000 : 0
    const tv = setTimeout(() => setIframeActive(true), delay)
    return () => clearTimeout(tv)
  }, [])

  // ── Animación inicial del texto ───────────────────────────────────────────
  useEffect(() => {
    // Pequeño timeout para asegurar que el navegador registre el cambio de estado de initial(0) a load(1)
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  // ── Auto-ocultar texto flotante tras inactividad ───────────────────────
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
          Poster renderiza de inmediato. Video a t=8s via fallback o local.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 bg-black">
        {/* Poster — asset estático /public (sin latencia Cloudinary on-demand) */}
        <img
          src="/hero-poster.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute w-full h-full object-cover"
          style={{ opacity: iframeReady ? 0 : 1, transition: "opacity 1s ease" }}
        />

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
          CAPA MÁSCARA/BLUR z-10 
          Añade un cristal esmerilado sutil para resaltar el texto blanco.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] pointer-events-none" />

      {/* ══════════════════════════════════════════════════════════════════
          CAPA HERO CONTENT  z-20
          Visible desde el instante 0, se oculta tras inactividad.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-20 container mx-auto px-4 flex flex-col justify-center items-center h-full min-h-[70vh] md:min-h-screen text-center"
        style={{
          paddingTop: isMobile ? "60px" : "0",
          opacity: mounted && !heroHidden ? 1 : 0,
          pointerEvents: heroHidden ? "none" : "auto",
          transition: "opacity 1.2s ease-out",
        }}
      >
        <div className="max-w-4xl flex flex-col items-center">
          <div
            style={{
              transform: mounted ? "translateY(0)" : "translateY(-40px)",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight font-display drop-shadow-lg">
              ¡Comida real para amigos reales!
            </h1>
            <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Nutrición premium horneada con ingredientes frescos y naturales para un compañero más sano, motivado y
              feliz.
            </p>
          </div>

          <div
            className="flex justify-center"
            style={{
              transform: mounted ? "translateY(0)" : "translateY(40px)",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "0.2s" // Retraso suave para el botón
            }}
          >
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
    </section>
  )
}
// UI/UX Update - Marzo 2026
