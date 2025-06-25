"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useWindowSize } from "@/hooks/use-window-size"

const TRANSITION_DURATION = "duration-700" // Un poco más largo para suavidad

export function VideoHero() {
  const [isVideoPlayerReady, setIsVideoPlayerReady] = useState(false)
  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = width ? width < 768 : false

  const contentRef = useRef<HTMLDivElement>(null)
  const [showHeroContentElements, setShowHeroContentElements] = useState(true)
  const heroContentTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleVideoPlayerLoad = () => {
    setIsVideoPlayerReady(true)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentRef.current && isVideoPlayerReady) {
        contentRef.current.classList.add("opacity-0", "pointer-events-none")
      }
      setShowHeroContentElements(false)
    }, 3000)

    return () => {
      clearTimeout(timer)
      if (heroContentTimeoutRef.current) {
        clearTimeout(heroContentTimeoutRef.current)
      }
    }
  }, [isVideoPlayerReady])

  const handleInteraction = () => {
    if (!showHeroContentElements && contentRef.current && isVideoPlayerReady) {
      contentRef.current.classList.remove("opacity-0", "pointer-events-none")
      setShowHeroContentElements(true)
    }
    if (heroContentTimeoutRef.current) clearTimeout(heroContentTimeoutRef.current)

    if (isVideoPlayerReady) {
      heroContentTimeoutRef.current = setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.classList.add("opacity-0", "pointer-events-none")
        }
        setShowHeroContentElements(false)
      }, 3000)
    }
  }

  const scrollToRecipes = () => {
    const recipesSection = document.getElementById("nuestras-recetas")
    if (recipesSection) {
      recipesSection.scrollIntoView({ behavior: "smooth" })
    } else {
      router.push("/productos#nuestras-recetas")
    }
  }

  return (
    <section
      className="relative min-h-[70vh] md:min-h-screen w-full overflow-hidden text-white"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      style={{
        margin: 0,
        padding: 0,
        width: "100vw",
        maxWidth: "100vw",
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
        position: "relative",
        marginTop: isMobile ? "-1px" : "0",
      }}
    >
      {/* Contenedor del Video y Placeholder. Controla el fondo durante la carga. */}
      <div
        className={`absolute inset-0 z-0 transition-colors ${TRANSITION_DURATION} ease-in-out ${
          isVideoPlayerReady ? "bg-black" : "bg-primary" // Cambia de bg-primary a bg-black
        }`}
      >
        {/* Placeholder Visual */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity ${TRANSITION_DURATION} ease-in-out ${
            isVideoPlayerReady ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <p className="mt-4 text-lg text-white">Preparando una experiencia increíble...</p>
        </div>

        {/* Iframe del Video */}
        <iframe
          src="https://www.youtube.com/embed/dOZPu4XrA1k?autoplay=1&mute=1&loop=1&playlist=dOZPu4XrA1k&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0"
          className={`absolute inset-0 h-full w-full transition-opacity ${TRANSITION_DURATION} ease-in-out ${
            isVideoPlayerReady ? "opacity-100" : "opacity-0"
          }`}
          style={{
            top: "50%",
            left: "50%",
            width: isMobile ? "300vw" : "170vw",
            height: isMobile ? "120vh" : "120vh",
            transform: "translate(-50%, -50%)",
            objectFit: "cover",
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          title="Pet Gourmet Background Video"
          onLoad={handleVideoPlayerLoad}
          frameBorder="0"
        />
      </div>

      {/* Overlay oscuro sobre el video una vez cargado */}
      {isVideoPlayerReady && (
        <div
          className={`absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-white/70 md:to-white pointer-events-none transition-opacity ${TRANSITION_DURATION} ease-in-out opacity-100`}
        ></div>
      )}

      {/* Contenido del Hero: Títulos, Texto, Botones */}
      <div
        ref={contentRef}
        className={`relative z-20 container mx-auto px-4 flex flex-col justify-center items-center h-full min-h-[70vh] md:min-h-screen text-center 
                    transition-opacity ${TRANSITION_DURATION} ease-in-out
                    ${showHeroContentElements && isVideoPlayerReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ paddingTop: isMobile ? "60px" : "0" }}
      >
        {isVideoPlayerReady && (
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
        )}

        {showHeroContentElements && isVideoPlayerReady && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
              <ArrowRight className="text-white w-5 h-5 rotate-90" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
