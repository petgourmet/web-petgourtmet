"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useWindowSize } from "@/hooks/use-window-size"

export function VideoHero() {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  const [showContent, setShowContent] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { width } = useWindowSize()
  const isMobile = width ? width < 768 : false

  useEffect(() => {
    // Configurar temporizador para ocultar el contenido después de 2 segundos
    const hideElementsTimer = setTimeout(() => {
      if (contentRef.current) {
        // Añadir clase para animar la desaparición del contenido
        contentRef.current.classList.add("opacity-0", "pointer-events-none")
      }
      setShowContent(false)
    }, 2000)

    return () => {
      clearTimeout(hideElementsTimer)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Función para mostrar el contenido al interactuar
  const handleInteraction = () => {
    // Para el contenido principal, solo mostrarlo si estaba oculto
    if (!showContent && contentRef.current) {
      contentRef.current.classList.remove("opacity-0", "pointer-events-none")
      setShowContent(true)
    }

    // Limpiar cualquier temporizador existente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Configurar nuevo temporizador para ocultar elementos
    timeoutRef.current = setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.classList.add("opacity-0", "pointer-events-none")
      }
      setShowContent(false)
    }, 2000)
  }

  const scrollToRecipes = () => {
    // Primero intentamos encontrar la sección de recetas en la página actual
    const recipesSection = document.getElementById("nuestras-recetas")

    if (recipesSection) {
      // Si existe la sección en la página actual, hacemos scroll suave
      recipesSection.scrollIntoView({ behavior: "smooth" })
    } else {
      // Si no existe, navegamos a la página de recetas
      router.push("/recetas")
    }
  }

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden bg-white"
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
        marginTop: isMobile ? "-1px" : "0", // Fix for mobile gap
      }}
    >
      {/* Background video with overlay */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{
          width: "100vw",
          top: isMobile ? "-1px" : "0", // Ensure no gap at the top on mobile
        }}
      >
        <iframe
          src="https://player.vimeo.com/video/1086091427?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: isMobile ? "300vw" : "150vw", // Increased width for mobile
            height: isMobile ? "120vh" : "150vh", // Increased height for mobile
            transform: "translate(-50%, -50%)", // Centrar el video
            objectFit: "cover",
            border: "none",
          }}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          title="Pet Gourmet Background"
          loading="lazy"
        ></iframe>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-white"></div>
      </div>

      {/* Hero Content */}
      <div
        ref={contentRef}
        className="relative container mx-auto px-4 flex flex-col justify-center items-center h-screen text-center transition-opacity duration-1000"
        style={{
          paddingTop: isMobile ? "60px" : "0", // Adjust content position on mobile
        }}
      >
        <div className="max-w-4xl animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight font-display">
            ¡Comida real para amigos reales!
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
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

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
            <ArrowRight className="text-white w-5 h-5 rotate-90" />
          </div>
        </div>
      </div>
    </section>
  )
}
